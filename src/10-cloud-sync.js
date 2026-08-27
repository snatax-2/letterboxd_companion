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
const TV_SHOW_TOMBSTONES_KEY = 'lbx_tv_show_tombstones';
const TV_SEASON_TOMBSTONES_KEY = 'lbx_tv_season_tombstones';
// TOMBSTONE_MAX_AGE_MS est défini dans 03b-pure-logic.js (utilisé par mergeTombstoneLists)
// watchlistTombstonesKey(id) et WATCHLIST_LIST_TOMBSTONES_KEY sont définis dans 08-watchlist.js

const syncCodeInput = document.getElementById('setting-sync-code');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncRestoreBtn = document.getElementById('sync-restore-btn');
const syncStatusEl = document.getElementById('sync-status');
const syncGenerateBtn = document.getElementById('sync-generate-btn');
const syncCopyBtn = document.getElementById('sync-copy-btn');
const syncCodeWarningEl = document.getElementById('sync-code-warning');

// ─── Force du code de synchronisation ───────────────────────────────────────
// Le code est un JETON PORTEUR : le connaître suffit à lire ET à écraser
// l'historique complet. Il n'y a pas de mot de passe en plus — c'est le code
// lui-même qui doit être impossible à deviner.
//
// L'ancien exemple proposé dans le champ ("mon-code-secret") invitait
// justement au contraire : un code court et mémorisable ("dario", "films")
// se teste en quelques secondes. Le serveur refuse désormais les codes courts
// à la CRÉATION (voir MIN_NEW_CODE_LENGTH dans api/sync.js) ; ici on donne le
// moyen d'en obtenir un bon en un clic, et on prévient tant qu'un code faible
// est encore en place.
const SYNC_CODE_MIN_SAFE_LENGTH = 16;
// Alphabet sans caractères ambigus (ni 0/O, ni 1/l/I) : un code se recopie à
// la main d'un appareil à l'autre, autant éviter les confusions de lecture.
const SYNC_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // 55 caractères
const SYNC_CODE_LENGTH = 26; // 26 × log2(55) ≈ 150 bits

function generateSyncCode() {
  const n = SYNC_CODE_ALPHABET.length;
  // 255 n'est pas un multiple de 55 : un simple `octet % 55` rendrait les
  // premiers caractères de l'alphabet légèrement plus probables. On rejette
  // les octets de la tranche incomplète (tirage par rejet) — le coût est nul
  // à cette échelle, et la distribution reste exactement uniforme.
  const limit = Math.floor(256 / n) * n; // 220 pour n = 55
  let out = '';
  const buf = new Uint8Array(1);
  while (out.length < SYNC_CODE_LENGTH) {
    crypto.getRandomValues(buf); // jamais Math.random() pour un secret
    if (buf[0] < limit) out += SYNC_CODE_ALPHABET[buf[0] % n];
  }
  return out;
}

function isWeakSyncCode(code) {
  return !!code && code.length < SYNC_CODE_MIN_SAFE_LENGTH;
}

function refreshSyncCodeWarning() {
  if (!syncCodeWarningEl) return;
  const code = (syncCodeInput.value || '').trim();
  if (isWeakSyncCode(code)) {
    syncCodeWarningEl.textContent =
      'Ce code est trop court : quelqu\'un pourrait le deviner et lire ou écraser tes données. Génère un code sûr, puis recopie-le sur tes autres appareils.';
    syncCodeWarningEl.style.display = 'block';
  } else {
    syncCodeWarningEl.style.display = 'none';
  }
}

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

function readJsonStorage(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function mergeWatchlistCollection(remotePayload, mediaType = 'movie') {
  const isTv = mediaType === 'tv';
  const keys = isTv
    ? { meta: 'tvWatchlistsMeta', lists: 'tvWatchlists', itemTombs: 'tvWatchlistTombstones', listTombs: 'tvWatchlistListTombstones' }
    : { meta: 'watchlistsMeta', lists: 'watchlists', itemTombs: 'watchlistTombstones', listTombs: 'watchlistListTombstones' };
  const listTombstoneKey = isTv ? TV_WATCHLIST_LIST_TOMBSTONES_KEY : WATCHLIST_LIST_TOMBSTONES_KEY;
  const localMeta = loadWatchlistsMeta(mediaType);
  const remoteMeta = Array.isArray(remotePayload?.[keys.meta]) ? remotePayload[keys.meta] : [];
  const mergedListTombstones = mergeTombstoneLists(
    loadTombstones(listTombstoneKey),
    Array.isArray(remotePayload?.[keys.listTombs]) ? remotePayload[keys.listTombs] : [],
  );
  saveTombstones(listTombstoneKey, mergedListTombstones);

  const deletedIds = new Set(mergedListTombstones.map(t => t.key));
  const metaById = {};
  remoteMeta.forEach(list => { if (list?.id) metaById[list.id] = { id: list.id, name: list.name }; });
  localMeta.forEach(list => { if (list?.id) metaById[list.id] = { id: list.id, name: list.name }; });
  let meta = Object.values(metaById).filter(list => !deletedIds.has(list.id));
  if (meta.length === 0) meta = [{ id: 'default', name: 'À voir' }];

  const activeId = getActiveWatchlistId(mediaType);
  saveWatchlistsMeta(meta, mediaType);
  if (!meta.some(list => list.id === activeId)) setActiveWatchlistId(meta[0].id, mediaType);

  const remoteLists = remotePayload?.[keys.lists] && typeof remotePayload[keys.lists] === 'object' ? remotePayload[keys.lists] : {};
  const remoteItemTombstones = remotePayload?.[keys.itemTombs] && typeof remotePayload[keys.itemTombs] === 'object' ? remotePayload[keys.itemTombs] : {};
  const lists = {};
  const itemTombstones = {};
  meta.forEach(({ id }) => {
    const localItems = readJsonStorage(watchlistStorageKey(id, mediaType), []);
    const mergedTombstones = mergeTombstoneLists(
      loadTombstones(watchlistTombstonesKey(id, mediaType)),
      Array.isArray(remoteItemTombstones[id]) ? remoteItemTombstones[id] : [],
    );
    const mergedItems = mergeWatchlist(
      Array.isArray(localItems) ? localItems : [],
      Array.isArray(remoteLists[id]) ? remoteLists[id] : [],
      mergedTombstones,
    );
    localStorage.setItem(watchlistStorageKey(id, mediaType), JSON.stringify(mergedItems));
    saveTombstones(watchlistTombstonesKey(id, mediaType), mergedTombstones);
    lists[id] = mergedItems;
    itemTombstones[id] = mergedTombstones;
  });

  return { meta, lists, itemTombstones, listTombstones: mergedListTombstones };
}

function mergePersonalCollections(remotePayload) {
  const localAnalyses = typeof loadAnalyses === 'function' ? loadAnalyses() : readJsonStorage('lbx_analyses', []);
  const remoteAnalyses = Array.isArray(remotePayload?.analyses) ? remotePayload.analyses : [];
  const analysesById = new Map();
  [...remoteAnalyses, ...localAnalyses].forEach(item => {
    if (!item || typeof item !== 'object') return;
    const key = item.id || `${item.filmId || ''}|${item.date || ''}|${item.texteTechnique || ''}`;
    analysesById.set(key, item);
  });
  const analyses = [...analysesById.values()].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  if (typeof saveAnalyses === 'function') saveAnalyses(analyses);
  else localStorage.setItem('lbx_analyses', JSON.stringify(analyses));

  const localDuels = readJsonStorage('lbx_duels', null);
  const remoteDuels = remotePayload?.duels && typeof remotePayload.duels === 'object' ? remotePayload.duels : null;
  let duels = localDuels || remoteDuels;
  if (localDuels?.updatedAt && remoteDuels?.updatedAt) {
    duels = localDuels.updatedAt >= remoteDuels.updatedAt ? localDuels : remoteDuels;
  } else if (!localDuels?.updatedAt && remoteDuels?.updatedAt) {
    duels = remoteDuels;
  }
  if (duels) localStorage.setItem('lbx_duels', JSON.stringify(duels));

  const localProvidersRaw = localStorage.getItem('lbx_owned_providers');
  const ownedProviders = localProvidersRaw === null
    ? (Array.isArray(remotePayload?.ownedProviders) ? remotePayload.ownedProviders : [])
    : readJsonStorage('lbx_owned_providers', []);
  if (localProvidersRaw === null && remotePayload?.ownedProviders) {
    localStorage.setItem('lbx_owned_providers', JSON.stringify(ownedProviders));
  }

  const localDraftRaw = localStorage.getItem('lbx_draft');
  const draft = localDraftRaw === null ? (remotePayload?.draft || null) : readJsonStorage('lbx_draft', null);
  if (localDraftRaw === null && draft) localStorage.setItem('lbx_draft', JSON.stringify(draft));

  const preferences = {};
  const preferenceKeys = {
    focusMode: 'lbx_focus_mode',
    tvContinueCollapsed: 'lbx_tv_continue_collapsed',
  };
  Object.entries(preferenceKeys).forEach(([name, storageKey]) => {
    const localValue = localStorage.getItem(storageKey);
    const value = localValue ?? remotePayload?.preferences?.[name] ?? null;
    if (localValue === null && value !== null) localStorage.setItem(storageKey, String(value));
    preferences[name] = value;
  });

  return { analyses, duels, ownedProviders, draft, preferences };
}

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

  // ─── Séries suivies ────────────────────────────────────────────────────
  const localTvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  const remoteTvShows = Array.isArray(remotePayload?.tvShows) ? remotePayload.tvShows : [];
  const localShowTomb = loadTombstones(TV_SHOW_TOMBSTONES_KEY);
  const remoteShowTomb = Array.isArray(remotePayload?.tvShowTombstones) ? remotePayload.tvShowTombstones : [];
  const mergedShowTomb = mergeTombstoneLists(localShowTomb, remoteShowTomb);
  const localSeasonTomb = loadTombstones(TV_SEASON_TOMBSTONES_KEY);
  const remoteSeasonTomb = Array.isArray(remotePayload?.tvSeasonTombstones) ? remotePayload.tvSeasonTombstones : [];
  const mergedSeasonTomb = mergeTombstoneLists(localSeasonTomb, remoteSeasonTomb);
  const mergedTvShows = mergeTvShows(localTvShows, remoteTvShows, mergedShowTomb, mergedSeasonTomb);
  // Ludex 2.0 : passe par la file d'écriture séquentielle (mutateTvShows(),
  // 18-tv-shows.js) plutôt qu'un saveTvShows() direct — une synchro qui
  // tombe pile pendant qu'une note ou un coup de cœur est en cours d'écriture
  // ailleurs écraserait sinon ce changement avec cette copie fusionnée, déjà
  // périmée au moment où elle s'écrit. mergedTvShows est déjà entièrement
  // calculé à ce stade (toute la logique de fusion tourne juste au-dessus,
  // de façon synchrone) — le mutateur se contente de le renvoyer tel quel
  // comme tableau de remplacement, sans awaiter ici (cette fonction reste
  // synchrone comme avant ; la vraie écriture est simplement mise en file).
  if (typeof mutateTvShows === 'function') mutateTvShows(() => mergedTvShows);
  else if (typeof saveTvShows === 'function') saveTvShows(mergedTvShows); // repli si 18-tv-shows.js n'est pas chargé
  saveTombstones(TV_SHOW_TOMBSTONES_KEY, mergedShowTomb);
  saveTombstones(TV_SEASON_TOMBSTONES_KEY, mergedSeasonTomb);

  // Même moteur pour les listes films et séries : les deux supports sont
  // désormais sauvegardés, restaurés et synchronisés de façon symétrique.
  const movieWatchlists = mergeWatchlistCollection(remotePayload, 'movie');
  const tvWatchlists = mergeWatchlistCollection(remotePayload, 'tv');

  // Réglages : pas vraiment "fusionnables" (un thème ou une préférence n'est pas
  // un tableau), on garde ceux du cloud seulement s'ils sont fournis et qu'on
  // n'en a pas localement, pour ne pas écraser un choix local sans raison.
  const localSettings = readJsonStorage('lbx_settings', null);
  const settings = localSettings || remotePayload?.settings || null;
  if (remotePayload?.settings && !localSettings) {
    localStorage.setItem('lbx_settings', JSON.stringify(remotePayload.settings));
  }
  applySettings(settings || {});
  const personal = mergePersonalCollections(remotePayload);

  renderAll();
  if (typeof renderWatchlistTabs === 'function') renderWatchlistTabs();
  if (typeof renderWatchlistTabs === 'function') renderWatchlistTabs('tv');
  renderWatchlist();
  if (typeof renderTvWatchlist === 'function') renderTvWatchlist();
  if (typeof renderTvHistory === 'function' && document.getElementById('hist-tab-tv')?.classList.contains('active')) renderTvHistory();
  if (typeof statsDirty !== 'undefined') statsDirty = true;

  return {
    schemaVersion: 2,
    history: mergedHistory,
    historyTombstones: mergedHistTomb,
    tvShows: mergedTvShows,
    tvShowTombstones: mergedShowTomb,
    tvSeasonTombstones: mergedSeasonTomb,
    watchlistsMeta: movieWatchlists.meta,
    watchlists: movieWatchlists.lists,
    watchlistTombstones: movieWatchlists.itemTombstones,
    watchlistListTombstones: movieWatchlists.listTombstones,
    tvWatchlistsMeta: tvWatchlists.meta,
    tvWatchlists: tvWatchlists.lists,
    tvWatchlistTombstones: tvWatchlists.itemTombstones,
    tvWatchlistListTombstones: tvWatchlists.listTombstones,
    settings,
    ...personal,
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

function readWatchlistSnapshot(mediaType = 'movie') {
  const meta = loadWatchlistsMeta(mediaType);
  const lists = {};
  const tombstones = {};
  meta.forEach(({ id }) => {
    const stored = readJsonStorage(watchlistStorageKey(id, mediaType), []);
    lists[id] = Array.isArray(stored) ? stored : [];
    tombstones[id] = loadTombstones(watchlistTombstonesKey(id, mediaType));
  });
  return { meta, lists, tombstones };
}

function currentLocalSnapshot({ includeExportDate = false } = {}) {
  const movies = readWatchlistSnapshot('movie');
  const tv = readWatchlistSnapshot('tv');
  const snapshot = {
    schemaVersion: 2,
    history: loadHistory(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    tvShows: typeof loadTvShows === 'function' ? loadTvShows() : [],
    tvShowTombstones: loadTombstones(TV_SHOW_TOMBSTONES_KEY),
    tvSeasonTombstones: loadTombstones(TV_SEASON_TOMBSTONES_KEY),
    watchlistsMeta: movies.meta,
    watchlists: movies.lists,
    watchlistTombstones: movies.tombstones,
    watchlistListTombstones: loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY),
    tvWatchlistsMeta: tv.meta,
    tvWatchlists: tv.lists,
    tvWatchlistTombstones: tv.tombstones,
    tvWatchlistListTombstones: loadTombstones(TV_WATCHLIST_LIST_TOMBSTONES_KEY),
    settings: readJsonStorage('lbx_settings', null),
    ownedProviders: readJsonStorage('lbx_owned_providers', []),
    analyses: typeof loadAnalyses === 'function' ? loadAnalyses() : readJsonStorage('lbx_analyses', []),
    duels: readJsonStorage('lbx_duels', null),
    draft: readJsonStorage('lbx_draft', null),
    preferences: {
      focusMode: localStorage.getItem('lbx_focus_mode'),
      tvContinueCollapsed: localStorage.getItem('lbx_tv_continue_collapsed'),
    },
  };
  if (includeExportDate) snapshot.exportedAt = new Date().toISOString();
  return snapshot;
}

// Le code voyage dans un EN-TÊTE, plus dans l'URL : une query string finit
// dans les journaux d'accès du serveur, dans les caches CDN et dans le
// Referer — mauvais endroits pour ce qui tient lieu de mot de passe.
// api/sync.js accepte encore ?code= en repli, le temps que les service
// workers servant une ancienne version de app.js soient remplacés.
function syncHeaders(code, extra = {}) {
  return { 'X-Sync-Code': code, ...extra };
}

async function fetchCloudState(code) {
  const res = await fetch('/api/sync', { headers: syncHeaders(code) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'bad status');
  return data.found
    ? { payload: data.payload, revision: data.updatedAt || null }
    : { payload: null, revision: null };
}

async function fetchCloudPayload(code) {
  return (await fetchCloudState(code)).payload;
}

// Distingue la VRAIE cause d'un échec de synchro, pour ne plus systématiquement
// blâmer "ta connexion" quand le problème est ailleurs :
// - navigator.onLine === false -> coupure réseau réelle, chez l'utilisateur
// - erreur avec un message venant du serveur (ex: limite de requêtes, service
//   mal configuré) -> on l'affiche telle quelle, c'est la cause exacte
// - échec générique (fetch a levé une TypeError, service injoignable) -> ni
//   confirmé réseau ni message serveur, formulation neutre
function describeSyncFailure(err) {
  if (!navigator.onLine) return 'Tu es hors ligne — la synchronisation reprendra à la reconnexion.';
  const msg = err && err.message ? err.message : '';
  const isGenericFetchFailure = !msg || msg === 'bad status' || /^bad status \d+$/.test(msg) || /Failed to fetch|NetworkError/i.test(msg);
  if (!isGenericFetchFailure) return msg; // message précis renvoyé par l'API
  return 'Impossible de joindre le service de synchronisation. Réessaie dans un instant.';
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
    let cloud = await fetchCloudState(code);
    for (let attempt = 0; attempt < 3; attempt++) {
      const merged = mergeWithRemote(cloud.payload);
      const revisionHeaders = cloud.revision ? { 'If-Match': cloud.revision } : { 'If-None-Match': '*' };
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: syncHeaders(code, { 'Content-Type': 'application/json', ...revisionHeaders }),
        body: JSON.stringify(merged),
      });
      if (res.status === 409 && attempt < 2) {
        const conflict = await res.json();
        cloud = {
          payload: conflict.payload || (await fetchCloudState(code)).payload,
          revision: conflict.revision || null,
        };
        continue;
      }
      if (!res.ok) {
      // Lit le VRAI message renvoyé par l'API (ex: limite de requêtes, mauvaise
      // configuration serveur) plutôt que de le jeter — c'était la cause du
      // message trompeur "vérifie ta connexion" alors que le problème était
      // côté service, pas côté réseau de l'utilisateur.
        let apiError = '';
        try { apiError = (await res.json()).error || ''; } catch { /* réponse non-JSON, tant pis */ }
        throw new Error(apiError || `bad status ${res.status}`);
      }
      break;
    }

    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Synchronisé ✓ (${formatDateTime(now)})`);
    return true;
  } catch (err) {
    if (!silent) setSyncStatus(describeSyncFailure(err), true);
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
  } catch (err) {
    setSyncStatus(describeSyncFailure(err), true);
  }
}

// Pré-remplit le champ code + affiche le statut à chaque ouverture de la modale réglages
document.getElementById('settings-btn').addEventListener('click', () => {
  syncCodeInput.value = getSyncCode();
  refreshSyncCodeWarning();
  const lastTime = localStorage.getItem(SYNC_LAST_TIME_KEY);
  setSyncStatus(lastTime ? `Dernière synchronisation : ${formatDateTime(lastTime)}` : '');
});

syncCodeInput.addEventListener('change', () => setSyncCode(syncCodeInput.value));
syncCodeInput.addEventListener('input', refreshSyncCodeWarning);

// Générer : on ne remplace jamais un code existant sans confirmation — le
// perdre, c'est perdre l'accès aux données déjà sauvegardées sous ce code.
if (syncGenerateBtn) {
  syncGenerateBtn.addEventListener('click', () => {
    const apply = () => {
      const fresh = generateSyncCode();
      syncCodeInput.value = fresh;
      setSyncCode(fresh);
      refreshSyncCodeWarning();
      setSyncStatus('Nouveau code généré. Copie-le et colle-le sur tes autres appareils, puis sauvegarde.');
      syncCodeInput.focus();
      syncCodeInput.select();
    };
    if (getSyncCode()) {
      openModal(
        'Remplacer le code de synchronisation ?',
        'Tes données déjà sauvegardées sous l\'ancien code resteront accessibles avec CE code uniquement. Note-le quelque part avant de continuer si tu en as besoin.',
        apply
      );
    } else {
      apply();
    }
  });
}

if (syncCopyBtn) {
  syncCopyBtn.addEventListener('click', async () => {
    const code = (syncCodeInput.value || '').trim();
    if (!code) { setSyncStatus('Aucun code à copier.', true); return; }
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code de synchronisation copié.');
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : on
      // sélectionne le champ pour que la copie manuelle reste possible.
      syncCodeInput.focus();
      syncCodeInput.select();
      setSyncStatus('Copie automatique impossible — le code est sélectionné, copie-le à la main.', true);
    }
  });
}

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
