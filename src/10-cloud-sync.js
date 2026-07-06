// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + watchlist + réglages.
//
// FUSION (et non écrasement) : à chaque synchronisation (push ou pull), les
// données locales et celles du cloud sont FUSIONNÉES plutôt que remplacées :
// - Historique : par titre. Si un film a été noté sur les deux appareils, on
//   garde la version la plus récente (`updatedAt`). Si un film n'existe que
//   d'un côté, il est conservé (union).
// - Watchlist : par tmdbId (ou titre si pas d'id). Union des deux listes.
// - Suppressions : chaque suppression (historique ou watchlist) laisse une
//   "tombstone" (trace horodatée) synchronisée elle aussi, pour qu'une entrée
//   supprimée sur un appareil ne réapparaisse pas après une synchro depuis un
//   autre appareil qui l'avait encore.
//
// - Sauvegarde (push) : fusionne avec le cloud puis pousse le résultat, en
//   automatique en arrière-plan toutes les 45s si un changement local est
//   détecté, + un bouton manuel pour forcer.
// - Restauration (pull) : fusionne le cloud dans les données locales. N'écrase
//   plus rien de destructeur (grâce à la fusion), donc pas besoin de modale de
//   confirmation bloquante.

const SYNC_CODE_KEY = 'lbx_sync_code';
const SYNC_LAST_HASH_KEY = 'lbx_sync_last_hash';
const SYNC_LAST_TIME_KEY = 'lbx_sync_last_time';
const HISTORY_TOMBSTONES_KEY = 'lbx_history_tombstones';
const WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones';
const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

const syncCodeInput = document.getElementById('setting-sync-code');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncRestoreBtn = document.getElementById('sync-restore-btn');
const syncStatusEl = document.getElementById('sync-status');

function getSyncCode() {
  return (localStorage.getItem(SYNC_CODE_KEY) || '').trim();
}

function setSyncCode(code) {
  localStorage.setItem(SYNC_CODE_KEY, code.trim());
}

function setSyncStatus(msg, isError = false) {
  syncStatusEl.textContent = msg;
  syncStatusEl.style.color = isError ? '#ff4040' : 'var(--text-mid)';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Tombstones (traces de suppression) ─────────────────────────────────────

function loadTombstones(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
}

function saveTombstones(storageKey, list) {
  localStorage.setItem(storageKey, JSON.stringify(list));
}

function recordTombstone(storageKey, key) {
  const list = loadTombstones(storageKey);
  const now = new Date().toISOString();
  const idx = list.findIndex(t => t.key === key);
  if (idx >= 0) list[idx].deletedAt = now;
  else list.push({ key, deletedAt: now });
  saveTombstones(storageKey, list);
}

function removeTombstone(storageKey, key) {
  saveTombstones(storageKey, loadTombstones(storageKey).filter(t => t.key !== key));
}

// Fusionne deux listes de tombstones : garde la date de suppression la plus
// récente par clé, et purge celles plus vieilles que TOMBSTONE_MAX_AGE_MS
// (pas la peine de trainer une trace de suppression indéfiniment).
function mergeTombstoneLists(a, b) {
  const map = new Map();
  for (const t of [...a, ...b]) {
    const existing = map.get(t.key);
    if (!existing || new Date(t.deletedAt) > new Date(existing.deletedAt)) map.set(t.key, t);
  }
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE_MS;
  return [...map.values()].filter(t => new Date(t.deletedAt).getTime() > cutoff);
}

// ─── Clés d'identité pour la fusion ──────────────────────────────────────────

function historyItemKey(item) {
  return (item.title || '').toLowerCase();
}

function watchlistItemKey(item) {
  return item.tmdbId ? `id:${item.tmdbId}` : `title:${(item.title || '').toLowerCase()}`;
}

// ─── Fusion historique ───────────────────────────────────────────────────────

function mergeHistory(local, remote, tombstones) {
  const merged = new Map(); // key -> entry
  for (const entry of [...local, ...remote]) {
    const key = historyItemKey(entry);
    if (!key) continue;
    const existing = merged.get(key);
    const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
    if (!existing) {
      merged.set(key, entry);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.savedAt || 0).getTime();
      if (entryTime >= existingTime) merged.set(key, entry);
    }
  }

  const result = [];
  for (const [key, entry] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= entryTime) continue; // supprimé plus récemment que la dernière modif
    }
    result.push(entry);
  }
  result.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  return result;
}

// ─── Fusion watchlist ────────────────────────────────────────────────────────

function mergeWatchlist(local, remote, tombstones) {
  const merged = new Map();
  for (const item of [...local, ...remote]) {
    const key = watchlistItemKey(item);
    if (!merged.has(key)) merged.set(key, item);
  }

  const result = [];
  for (const [key, item] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const itemTime = new Date(item.addedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= itemTime) continue;
    }
    result.push(item);
  }
  result.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  return result;
}

// ─── Cœur de la synchro : fusionne l'état local avec un payload cloud ───────
// Sauvegarde le résultat en local (render inclus) et le retourne, prêt à être
// ré-uploadé si besoin (c'est ce que fait pushToCloud).
function mergeWithRemote(remotePayload) {
  const localHistory = loadHistory();
  const localWatchlist = loadWatchlist();
  const localHistTomb = loadTombstones(HISTORY_TOMBSTONES_KEY);
  const localWlTomb = loadTombstones(WATCHLIST_TOMBSTONES_KEY);

  const remoteHistory = Array.isArray(remotePayload?.history) ? remotePayload.history : [];
  const remoteWatchlist = Array.isArray(remotePayload?.watchlist) ? remotePayload.watchlist : [];
  const remoteHistTomb = Array.isArray(remotePayload?.historyTombstones) ? remotePayload.historyTombstones : [];
  const remoteWlTomb = Array.isArray(remotePayload?.watchlistTombstones) ? remotePayload.watchlistTombstones : [];

  const mergedHistTomb = mergeTombstoneLists(localHistTomb, remoteHistTomb);
  const mergedWlTomb = mergeTombstoneLists(localWlTomb, remoteWlTomb);
  const mergedHistory = mergeHistory(localHistory, remoteHistory, mergedHistTomb);
  const mergedWatchlist = mergeWatchlist(localWatchlist, remoteWatchlist, mergedWlTomb);

  saveHistory(mergedHistory);
  saveWatchlist(mergedWatchlist);
  saveTombstones(HISTORY_TOMBSTONES_KEY, mergedHistTomb);
  saveTombstones(WATCHLIST_TOMBSTONES_KEY, mergedWlTomb);

  // Réglages : pas vraiment "fusionnables" (un thème ou une préférence n'est pas
  // un tableau), on garde ceux du cloud seulement s'ils sont fournis et qu'on
  // n'en a pas localement, pour ne pas écraser un choix local sans raison.
  const localSettings = JSON.parse(localStorage.getItem('lbx_settings') || 'null');
  const settings = localSettings || remotePayload?.settings || null;
  if (remotePayload?.settings && !localSettings) {
    localStorage.setItem('lbx_settings', JSON.stringify(remotePayload.settings));
  }
  applySettings(settings || {});

  renderAll();
  renderWatchlist();

  return {
    history: mergedHistory,
    watchlist: mergedWatchlist,
    historyTombstones: mergedHistTomb,
    watchlistTombstones: mergedWlTomb,
    settings,
  };
}

// Hash simple (non cryptographique), juste pour détecter un changement de contenu
// sans avoir à ré-uploader à chaque tick si rien n'a bougé localement.
function hashPayload(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function currentLocalSnapshot() {
  return {
    history: loadHistory(),
    watchlist: loadWatchlist(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    watchlistTombstones: loadTombstones(WATCHLIST_TOMBSTONES_KEY),
  };
}

async function fetchCloudPayload(code) {
  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'bad status');
  return data.found ? data.payload : null;
}

// Sauvegarde : récupère le cloud, fusionne avec le local, sauvegarde le résultat
// localement, puis pousse la version fusionnée vers le cloud.
async function pushToCloud(silent = false) {
  const code = getSyncCode();
  if (!code) {
    if (!silent) setSyncStatus('Renseigne un code de synchronisation avant de sauvegarder.', true);
    return false;
  }
  if (!silent) setSyncStatus('Synchronisation en cours…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    const merged = mergeWithRemote(remotePayload);

    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error('bad status');

    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Synchronisé ✓ (${formatDateTime(now)})`);
    return true;
  } catch {
    if (!silent) setSyncStatus('Échec de la synchronisation. Vérifie ta connexion.', true);
    return false;
  }
}

// Restauration : fusionne le cloud dans le local, SANS repousser vers le cloud.
// Non destructeur grâce à la fusion (un film local non encore synchronisé n'est
// jamais perdu), donc pas besoin de modale de confirmation bloquante.
async function pullFromCloud() {
  const code = getSyncCode();
  if (!code) {
    setSyncStatus('Renseigne un code de synchronisation avant de restaurer.', true);
    return;
  }
  setSyncStatus('Récupération depuis le cloud…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    if (!remotePayload) {
      setSyncStatus('Aucune sauvegarde trouvée pour ce code.', true);
      return;
    }
    mergeWithRemote(remotePayload);
    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    setSyncStatus(`Synchronisé depuis le cloud ✓ (${formatDateTime(now)})`);
    showToast('Données synchronisées depuis le cloud.');
  } catch {
    setSyncStatus('Échec de la récupération cloud. Vérifie ta connexion.', true);
  }
}

// Pré-remplit le champ code + affiche le statut à chaque ouverture de la modale réglages
document.getElementById('settings-btn').addEventListener('click', () => {
  syncCodeInput.value = getSyncCode();
  const lastTime = localStorage.getItem(SYNC_LAST_TIME_KEY);
  setSyncStatus(lastTime ? `Dernière synchronisation : ${formatDateTime(lastTime)}` : '');
});

syncCodeInput.addEventListener('change', () => setSyncCode(syncCodeInput.value));

syncSaveBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pushToCloud(false);
});

syncRestoreBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pullFromCloud();
});

// Auto-synchronisation silencieuse : toutes les 45s, si un code est renseigné et
// que les données locales ont changé depuis la dernière synchro, on fusionne et
// on pousse vers le cloud. Pas besoin d'y penser après chaque note ou ajout à
// la watchlist — et comme c'est une fusion, ça ne perd jamais rien.
setInterval(() => {
  const code = getSyncCode();
  if (!code) return;
  const currentHash = hashPayload(currentLocalSnapshot());
  if (currentHash !== localStorage.getItem(SYNC_LAST_HASH_KEY)) {
    pushToCloud(true);
  }
}, 45000);
