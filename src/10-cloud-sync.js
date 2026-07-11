// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + TOUTES les watchlists + réglages.
//
// FUSION (et non écrasement) : à chaque synchronisation (push ou pull), les
// données locales et celles du cloud sont FUSIONNÉES plutôt que remplacées :
// - Historique : par titre. Si un film a été noté sur les deux appareils, on
//   garde la version la plus récente (`updatedAt`). Si un film n'existe que
//   d'un côté, il est conservé (union).
// - Watchlists : chaque LISTE (id + nom) est fusionnée par id (union), puis le
//   CONTENU de chaque liste est fusionné par tmdbId (ou titre), comme avant.
// - Suppressions : chaque suppression (film d'historique, film d'une
//   watchlist, OU une watchlist entière) laisse une "tombstone" (trace
//   horodatée) synchronisée elle aussi, pour qu'une suppression sur un
//   appareil ne soit pas annulée par une synchro depuis un autre appareil qui
//   avait encore l'ancienne version.
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
// TOMBSTONE_MAX_AGE_MS est défini dans 03b-pure-logic.js (utilisé par mergeTombstoneLists)
// watchlistTombstonesKey(id) et WATCHLIST_LIST_TOMBSTONES_KEY sont définis dans 08-watchlist.js

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

// mergeTombstoneLists, historyItemKey, watchlistItemKey, mergeHistory et
// mergeWatchlist vivent maintenant dans 03b-pure-logic.js (logique pure,
// testable automatiquement sans DOM — voir tests/merge-logic.test.js).

// ─── Cœur de la synchro : fusionne l'état local avec un payload cloud ───────
// Sauvegarde le résultat en local (render inclus) et le retourne, prêt à être
// ré-uploadé si besoin (c'est ce que fait pushToCloud).
function mergeWithRemote(remotePayload) {
  const localHistory = loadHistory();
  const localHistTomb = loadTombstones(HISTORY_TOMBSTONES_KEY);
  const remoteHistory = Array.isArray(remotePayload?.history) ? remotePayload.history : [];
  const remoteHistTomb = Array.isArray(remotePayload?.historyTombstones) ? remotePayload.historyTombstones : [];
  const mergedHistTomb = mergeTombstoneLists(localHistTomb, remoteHistTomb);
  const mergedHistory = mergeHistory(localHistory, remoteHistory, mergedHistTomb);
  saveHistory(mergedHistory);
  saveTombstones(HISTORY_TOMBSTONES_KEY, mergedHistTomb);

  // ─── Watchlists : fusion des LISTES elles-mêmes, puis du contenu de chacune ──
  const localMeta = loadWatchlistsMeta();
  const remoteMeta = Array.isArray(remotePayload?.watchlistsMeta) ? remotePayload.watchlistsMeta : [];
  const localListTomb = loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY);
  const remoteListTomb = Array.isArray(remotePayload?.watchlistListTombstones) ? remotePayload.watchlistListTombstones : [];
  const mergedListTomb = mergeTombstoneLists(localListTomb, remoteListTomb);
  saveTombstones(WATCHLIST_LIST_TOMBSTONES_KEY, mergedListTomb);
  const deletedListIds = new Set(mergedListTomb.map(t => t.key));

  // Union par id (le nom local l'emporte en cas de conflit sur le même id),
  // en excluant les listes supprimées sur l'un ou l'autre appareil.
  const metaById = {};
  remoteMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  localMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  let mergedMeta = Object.values(metaById).filter(l => !deletedListIds.has(l.id));
  if (mergedMeta.length === 0) mergedMeta = [{ id: 'default', name: 'À voir' }]; // garde-fou : jamais 0 liste

  const activeId = getActiveWatchlistId(); // lu avant de sauvegarder la meta, au cas où la liste active aurait été supprimée ailleurs
  saveWatchlistsMeta(mergedMeta);
  if (!mergedMeta.find(l => l.id === activeId)) setActiveWatchlistId(mergedMeta[0].id);

  const remoteWatchlists = remotePayload?.watchlists && typeof remotePayload.watchlists === 'object' ? remotePayload.watchlists : {};
  const remoteWlTombs = remotePayload?.watchlistTombstones && typeof remotePayload.watchlistTombstones === 'object' ? remotePayload.watchlistTombstones : {};

  const mergedWatchlists = {};
  const mergedWlTombs = {};
  mergedMeta.forEach(({ id }) => {
    let localItems = [];
    try { localItems = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch {}
    const remoteItems = Array.isArray(remoteWatchlists[id]) ? remoteWatchlists[id] : [];
    const localItemTomb = loadTombstones(watchlistTombstonesKey(id));
    const remoteItemTomb = Array.isArray(remoteWlTombs[id]) ? remoteWlTombs[id] : [];
    const mergedItemTomb = mergeTombstoneLists(localItemTomb, remoteItemTomb);
    const mergedItems = mergeWatchlist(localItems, remoteItems, mergedItemTomb);

    localStorage.setItem(watchlistStorageKey(id), JSON.stringify(mergedItems));
    saveTombstones(watchlistTombstonesKey(id), mergedItemTomb);
    mergedWatchlists[id] = mergedItems;
    mergedWlTombs[id] = mergedItemTomb;
  });

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
  if (typeof renderWatchlistTabs === 'function') renderWatchlistTabs();
  renderWatchlist();

  return {
    history: mergedHistory,
    historyTombstones: mergedHistTomb,
    watchlistsMeta: mergedMeta,
    watchlists: mergedWatchlists,
    watchlistTombstones: mergedWlTombs,
    watchlistListTombstones: mergedListTomb,
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
  const meta = loadWatchlistsMeta();
  const watchlists = {};
  const watchlistTombstones = {};
  meta.forEach(({ id }) => {
    try { watchlists[id] = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch { watchlists[id] = []; }
    watchlistTombstones[id] = loadTombstones(watchlistTombstonesKey(id));
  });
  return {
    history: loadHistory(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    watchlistsMeta: meta,
    watchlists,
    watchlistTombstones,
    watchlistListTombstones: loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY),
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
