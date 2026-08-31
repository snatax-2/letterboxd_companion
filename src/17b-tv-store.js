// Séries + traces de suppression forment UNE transaction localStorage.
// Les anciennes clés restent des projections de compatibilité ; une fois
// migré, seul lbx_tv_state_v2 fait foi. Aucun changement de schéma SQL.
function readTvState() {
  const raw = localStorage.getItem('lbx_tv_state_v2');
  if (raw !== null) {
    try {
      const state = JSON.parse(raw);
      if (state.schemaVersion !== 2 || !Array.isArray(state.shows) || !Array.isArray(state.showTombstones) || !Array.isArray(state.seasonTombstones)) {
        throw new Error('Schéma séries non pris en charge');
      }
      return state;
    } catch (error) {
      preserveCorruptStorage('lbx_tv_state_v2', raw, error);
      // Ne jamais remplacer un état v2 illisible par sa projection v1 périmée.
      throw new Error('Lecture des séries impossible : données conservées, écriture interrompue.');
    }
  }
  return {
    schemaVersion: 2,
    shows: readRegisteredStorage('tvShows', []),
    showTombstones: readJsonStorage('lbx_tv_show_tombstones', [], Array.isArray),
    seasonTombstones: readJsonStorage('lbx_tv_season_tombstones', [], Array.isArray),
  };
}

function backupLegacyTvState() {
  if (localStorage.getItem('lbx_tv_state_v2') !== null) return true;
  const originals = Object.fromEntries(['lbx_tv_shows', 'lbx_tv_show_tombstones', 'lbx_tv_season_tombstones'].map(key => [key, localStorage.getItem(key)]));
  if (Object.values(originals).every(value => value === null)) return true;
  const raw = JSON.stringify(originals);
  const key = 'lbx_recovery_tv_before_v2_' + storageRawHash(raw);
  if (localStorage.getItem(key) !== null) return true;
  return writeJsonStorage(key, { key: 'tv-state-v1', detectedAt: new Date().toISOString(), reason: 'Sauvegarde avant migration séries v2', raw });
}

function persistTvState(shows, state = readTvState()) {
  const normalized = normalizeTvShows(shows);
  const before = normalizeTvShows(readTvState().shows);
  if (!backupLegacyTvState()) return false;
  const next = { schemaVersion: 2, shows: normalized, showTombstones: state.showTombstones, seasonTombstones: state.seasonTombstones };
  // setItem est atomique : une erreur laisse l'état précédent intact, avec
  // ses tombstones. Les projections ne participent pas au succès du commit.
  if (!writeJsonStorage('lbx_tv_state_v2', next)) return false;
  writeRegisteredStorage('tvShows', normalized);
  writeJsonStorage('lbx_tv_show_tombstones', next.showTombstones);
  writeJsonStorage('lbx_tv_season_tombstones', next.seasonTombstones);
  if (tvStableJson(before) !== tvStableJson(normalized)) {
    const ids = new Set([...before, ...normalized].map(show => String(show.tmdbTvId)));
    const changed = [...ids].filter(id => tvStableJson(before.find(s => String(s.tmdbTvId) === id))
      !== tvStableJson(normalized.find(s => String(s.tmdbTvId) === id)));
    notifyTvViewsChanged(changed);
  }
  return true;
}

function nextTvChangeTime(state) {
  let time = Date.now();
  const include = stamp => { const ms = Date.parse(stamp); if (Number.isFinite(ms)) time = Math.max(time, ms + 1); };
  for (const show of state.shows) {
    for (const entity of [show, ...Object.values(show.seasons || {})]) {
      include(entity._sync?.createdAt);
      Object.values(entity._sync?.fields || {}).forEach(include);
      Object.values(entity._sync?.episodes || {}).forEach(event => include(event.updatedAt));
    }
  }
  [...state.showTombstones, ...state.seasonTombstones].forEach(tomb => include(tomb.deletedAt));
  return new Date(time).toISOString();
}

function recordTvDeletions(before, after, state, at) {
  const add = (list, key) => {
    const tomb = list.find(item => item.key === key);
    if (tomb) tomb.deletedAt = at;
    else list.push({ key, deletedAt: at });
  };
  for (const show of before) {
    const next = after.find(item => String(item.tmdbTvId) === String(show.tmdbTvId));
    if (!next) add(state.showTombstones, String(show.tmdbTvId));
    for (const seasonKey of Object.keys(show.seasons)) {
      if (!next?.seasons[seasonKey]) add(state.seasonTombstones, show.tmdbTvId + ':' + seasonKey);
    }
  }
}

// Les listes séries ne sont pas purgées au bout de 90 jours : un appareil
// longtemps hors ligne ne doit pas ressusciter des données supprimées.
function mergeTvTombstones(a, b) {
  const byKey = new Map();
  for (const tomb of [...a, ...b]) {
    if ((byKey.get(tomb.key)?.deletedAt || '') < tomb.deletedAt) byKey.set(tomb.key, { ...tomb });
  }
  return [...byKey.values()].sort((x, y) => x.key.localeCompare(y.key));
}

// Les gestionnaires DOM consomment les rejets ; la transaction, elle, les
// expose toujours aux appelants et aux tests. Aucun faux toast de succès.
function tvAction(handler) {
  return async (...args) => {
    try { return await handler(...args); }
    catch (error) { showToast(error.message || 'Action non enregistrée.'); }
  };
}
