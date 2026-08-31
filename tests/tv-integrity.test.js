const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeTvShows, normalizeTvShows, stampTvChanges } = require('../src/03b-pure-logic.js');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

const copy = value => JSON.parse(JSON.stringify(value));
const fixture = () => [{ tmdbTvId: 1, title: 'A', catalogEpisodeTotal: 20, seasons: {
  1: { seasonName: 'Saison 1', totalEpisodes: 10, watchedEpisodes: [1, 2], rating: { score: '8.0', date: '2026-08-20' } },
} }];
function change(base, edit, at = '2026-08-31T10:00:00.000Z') {
  const next = copy(base);
  edit(next[0], next[0].seasons[1]);
  return stampTvChanges(base, next, at);
}
function app(t) {
  const w = loadAppInJsdom(t);
  for (const fn of ['renderAll', 'renderWatchlist', 'renderTvWatchlist', 'renderTvHistory', 'renderTvContinueList', 'renderWatchlistTabs']) w[fn] = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify(fixture()));
  return w;
}

test('fusion : une décoche explicite survit à une ancienne copie cloud', () => {
  const base = fixture();
  const local = change(base, (_, season) => { season.watchedEpisodes = [1]; });
  assert.deepEqual(mergeTvShows(local, base, [], [])[0].seasons[1].watchedEpisodes, [1]);
});
test('fusion : progressions et notes indépendantes, sans perte de métadonnées', () => {
  const base = fixture();
  const a = change(base, (show, season) => { show.poster_path = '/chosen.jpg'; season.watchedEpisodes.push(3); });
  const b = change(base, (_, season) => { season.watchedEpisodes.push(4); season.rating = { score: '9.0', date: '2000-01-01' }; });
  const merged = mergeTvShows(a, b, [], []);
  assert.deepEqual(merged[0].seasons[1].watchedEpisodes, [1, 2, 3, 4]);
  assert.equal(merged[0].seasons[1].rating.score, '9.0');
  assert.equal(merged[0].catalogEpisodeTotal, 20);
  assert.equal(merged[0].poster_path, '/chosen.jpg');
  assert.deepEqual(merged, mergeTvShows(b, a, [], []));
  assert.deepEqual(merged, mergeTvShows(merged, merged, [], []));
});
test('migration : idempotente, notes inchangées et aucune fausse date de modification', () => {
  const base = fixture();
  const normalized = normalizeTvShows(base);
  assert.deepEqual(normalized, normalizeTvShows(normalized));
  assert.deepEqual(normalized[0].seasons[1].rating, base[0].seasons[1].rating);
  assert.equal(normalized[0].seasons[1]._sync.fields.rating || '', '');
  assert.equal(base[0]._sync, undefined);
});
test('suppression puis reprise : une ancienne note ne ressuscite pas avec la série', () => {
  const old = fixture();
  const fresh = stampTvChanges([], [{ tmdbTvId: 1, title: 'A', seasons: { 1: { watchedEpisodes: [], totalEpisodes: 10 } } }], '2026-08-31T10:00:00.001Z');
  const tombs = [{ key: '1', deletedAt: '2026-08-31T10:00:00.000Z' }];
  const merged = mergeTvShows(old, fresh, tombs, []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].seasons[1].rating, undefined);
  assert.deepEqual(merged[0].seasons[1].watchedEpisodes, []);
});
test('file locale : la fusion relit après une mutation en attente', async t => {
  const w = app(t);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = w.mutateTvShows(async shows => { await gate; shows[0].seasons[1].watchedEpisodes.push(3); });
  await Promise.resolve();
  const merging = w.mergeWithRemote({ tvShows: fixture() });
  release();
  await pending;
  await merging;
  assert.deepEqual(copy(w.loadTvShows()[0].seasons[1].watchedEpisodes), [1, 2, 3]);
});
test('stockage refusé : pas de faux succès et la file reste utilisable', async t => {
  const w = app(t);
  const original = w.saveTvShows;
  w.saveTvShows = () => false;
  await assert.rejects(w.mutateTvShows(shows => { shows[0].title = 'Perdu'; }), /enregistr|stockage/i);
  assert.equal(w.loadTvShows()[0].title, 'A');
  w.saveTvShows = original;
  await w.mutateTvShows(shows => { shows[0].title = 'Conservé'; });
  assert.equal(w.loadTvShows()[0].title, 'Conservé');
});
test('cible de notation : changer de série invalide la saison précédente', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1');
  w.openTvDetailSheet = async () => {};
  await w.selectShow({ id: 2, name: 'B' });
  await w.saveTvSeasonRating();
  assert.equal(w.loadTvShows().find(show => show.tmdbTvId === 2), undefined);
});
test('cible de notation : une sauvegarde en attente garde son identité initiale', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = w.mutateTvShows(async () => { await gate; });
  const saving = w.saveTvSeasonRating();
  w.openTvDetailSheet = async () => {};
  await w.selectShow({ id: 2, name: 'B' });
  release();
  await pending;
  await saving;
  assert.equal(w.loadTvShows().find(show => show.tmdbTvId === 2), undefined);
  assert.equal(w.loadTvShows()[0].seasons[1].rating.score, '8.0');
});
test('cloud : une modification pendant le POST reste à synchroniser', async t => {
  const w = app(t);
  w.setSyncCode('test-code-only');
  let release, sent;
  const started = new Promise(resolve => {
    w.fetch = async (_url, options) => {
      if (options?.method !== 'POST') return { ok: true, json: async () => ({ found: false }) };
      sent = JSON.parse(options.body);
      resolve();
      return new Promise(done => { release = () => done({ ok: true, status: 200 }); });
    };
  });
  const pushing = w.pushToCloud(true);
  await started;
  await w.mutateTvShows(shows => { shows[0].seasons[1].watchedEpisodes.push(3); });
  release();
  assert.equal(await pushing, true);
  assert.equal(w.localStorage.getItem('lbx_sync_last_hash'), w.hashPayload(sent));
  assert.notEqual(w.localStorage.getItem('lbx_sync_last_hash'), w.hashPayload(w.currentLocalSnapshot()));
});

test('migration : sauvegarde exacte avant écriture et pas de deuxième migration', async t => {
  const w = app(t);
  const original = w.localStorage.getItem('lbx_tv_shows');
  await w.mutateTvShows(shows => { shows[0].seasons[1].watchedEpisodes.push(3); });
  const backups = w.collectStorageRecovery().filter(item => item.key === 'tv-state-v1');
  assert.equal(backups.length, 1);
  assert.equal(JSON.parse(backups[0].raw).lbx_tv_shows, original);
  const state = w.localStorage.getItem('lbx_tv_state_v2');
  await w.mutateTvShows(() => {});
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), state);
  assert.equal(w.collectStorageRecovery().filter(item => item.key === 'tv-state-v1').length, 1);
});

test('migration : quota refusant la copie bloque toute écriture', async t => {
  const w = app(t);
  const raw = w.localStorage.getItem('lbx_tv_shows');
  const originalSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) {
    if (key.startsWith('lbx_recovery_tv_before_v2_')) throw new Error('Quota');
    return originalSet.call(this, key, value);
  };
  await assert.rejects(w.mutateTvShows(shows => { shows[0].title = 'B'; }));
  assert.equal(w.localStorage.getItem('lbx_tv_shows'), raw);
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), null);
});

test('transaction : une suppression et ses tombstones réussissent ou échouent ensemble', async t => {
  const w = app(t);
  await w.mutateTvShows(() => {});
  const initial = w.localStorage.getItem('lbx_tv_state_v2');
  const originalSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) {
    if (key === 'lbx_tv_state_v2') throw new Error('Quota');
    return originalSet.call(this, key, value);
  };
  await assert.rejects(w.mutateTvShows(() => []));
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), initial);
  assert.equal(w.loadTombstones('lbx_tv_show_tombstones').length, 0);
  w.Storage.prototype.setItem = originalSet;
  await w.mutateTvShows(() => []);
  assert.equal(w.loadTvShows().length, 0);
  assert.equal(w.loadTombstones('lbx_tv_show_tombstones')[0].key, '1');
  assert.equal(w.loadTombstones('lbx_tv_season_tombstones')[0].key, '1:1');
  await w.mergeWithRemote({ tvShows: fixture() });
  assert.equal(w.loadTvShows().length, 0);
});

test('transaction : l’échec de la projection ancienne ne perd pas le commit', async t => {
  const w = app(t);
  const originalSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) {
    if (key === 'lbx_tv_shows') throw new Error('Quota');
    return originalSet.call(this, key, value);
  };
  await w.mutateTvShows(shows => { shows[0].title = 'Persisté'; });
  assert.equal(w.loadTvShows()[0].title, 'Persisté');
  assert.equal(w.currentLocalSnapshot().tvShows[0].title, 'Persisté');
});

test('transaction : corruption v2 ne provoque jamais un retour silencieux à la v1', async t => {
  const w = app(t);
  w.localStorage.setItem('lbx_tv_state_v2', '{cassé');
  await assert.rejects(w.mutateTvShows(() => []), /Lecture des séries impossible/);
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), '{cassé');
  assert.equal(w.collectStorageRecovery().some(item => item.key === 'lbx_tv_state_v2'), true);
});

test('deux appareils : convergence après trois modifications simultanées', () => {
  const base = fixture();
  const a = change(base, (_, s) => { s.watchedEpisodes = [1]; });
  const b = change(base, (_, s) => { s.watchedEpisodes.push(3); s.paused = true; });
  const c = change(base, (_, s) => { s.rating = { score: '7.0', date: '2000-01-01' }; });
  const merge = (x, y) => mergeTvShows(x, y, [], []);
  assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
  assert.deepEqual(merge(merge(c, a), b)[0].seasons[1].watchedEpisodes, [1, 3]);
});

test('même milliseconde : une décoche et une coche convergent sans dépendre de l’ordre', () => {
  const base = fixture();
  const unchecked = change(base, (_, s) => { s.watchedEpisodes = [1]; });
  const checked = change(unchecked, (_, s) => { s.watchedEpisodes = [1, 2]; });
  const ab = mergeTvShows(unchecked, checked, [], []), ba = mergeTvShows(checked, unchecked, [], []);
  assert.deepEqual(ab, ba);
  assert.deepEqual(ab[0].seasons[1].watchedEpisodes, [1]);
});

test('fusion : une note datée dans le passé ne perd pas une modification récente', () => {
  const base = fixture();
  const newer = change(base, (_, s) => { s.rating = { score: '9.0', date: '1990-01-01' }; });
  assert.equal(mergeTvShows(base, newer, [], [])[0].seasons[1].rating.score, '9.0');
});

test('notation : les poids sont restaurés et un simple changement de date conserve le score', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1');
  w.document.getElementById('tv-view-date').value = '2000-01-01';
  await w.saveTvSeasonRating();
  assert.equal(w.loadTvShows()[0].seasons[1].rating.score, '8.0');
  assert.equal(w.loadTvShows()[0].seasons[1].rating.weights, undefined);
  w.document.getElementById('scenario').value = '10';
  w.document.getElementById('w-scenario').value = '3';
  await w.saveTvSeasonRating();
  const saved = copy(w.loadTvShows()[0].seasons[1].rating);
  w.document.getElementById('w-scenario').value = '1';
  w.reopenTvSeason(1, '1');
  assert.equal(w.document.getElementById('w-scenario').value, '3');
  assert.equal(w.calculateScore().toFixed(1), saved.score);
  await w.saveTvSeasonRating();
  assert.deepEqual(copy(w.loadTvShows()[0].seasons[1].rating), saved);
});

test('nouvelle critique : aucune sauvegarde ne peut utiliser l’ancienne saison', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1');
  w.resetForm();
  await w.saveTvSeasonRating();
  assert.deepEqual(copy(w.loadTvShows()), fixture());
});

test('restauration : les éléments locaux non envoyés restent à synchroniser', async t => {
  const w = app(t);
  w.setSyncCode('test-code-only');
  w.fetch = async () => ({ ok: true, json: async () => ({ found: true, payload: { schemaVersion: 3, tvShows: [] } }) });
  await w.pullFromCloud();
  assert.equal(w.loadTvShows().length, 1);
  assert.notEqual(w.localStorage.getItem('lbx_sync_last_hash'), w.hashPayload(w.currentLocalSnapshot()));
});

test('cloud : après conflit 409, la nouvelle copie et les changements locaux sont refusionnés', async t => {
  const w = app(t);
  w.setSyncCode('test-code-only');
  let posts = 0, sent;
  const remote = change(fixture(), (_, season) => { season.watchedEpisodes.push(4); });
  w.fetch = async (_url, options) => {
    if (options?.method !== 'POST') return { ok: true, json: async () => ({ found: false }) };
    if (++posts === 1) {
      await w.mutateTvShows(shows => { shows[0].seasons[1].watchedEpisodes.push(3); });
      return { ok: false, status: 409, json: async () => ({ payload: { tvShows: remote }, revision: 'new-revision' }) };
    }
    sent = JSON.parse(options.body);
    assert.equal(options.headers['If-Match'], 'new-revision');
    return { ok: true, status: 200 };
  };
  assert.equal(await w.pushToCloud(true), true);
  assert.deepEqual(sent.tvShows[0].seasons[1].watchedEpisodes, [1, 2, 3, 4]);
});

async function untrackedChecklist(w) {
  const data = { id: 2, name: 'B', seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 2 }] };
  const episodes = [{ episode_number: 1, name: 'Pilote', air_date: '2020-01-01' }, { episode_number: 2, name: 'Suite', air_date: '2020-01-08' }];
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=2') ? data : String(url).includes('tvSeasonShowId=2') ? { episodes } : {} });
  await w.openTvDetailSheet(2);
  await new Promise(resolve => setImmediate(resolve));
  const panel = w.document.getElementById('tds-season-episodes');
  w.renderTdsEpisodeChecklist(panel, 2, '1', 'Saison 1', episodes);
  return panel;
}

test('fiche : le premier épisode coché crée réellement la série et sa saison', async t => {
  const w = app(t);
  const panel = await untrackedChecklist(w);
  await w.onTdsEpisodeCheckClick(2, '1', 'Saison 1', 2, 1, panel);
  const show = w.loadTvShows().find(item => Number(item.tmdbTvId) === 2);
  assert.equal(show.title, 'B');
  assert.deepEqual(copy(show.seasons[1].watchedEpisodes), [1]);
  assert.equal(panel.querySelector('[data-episode="1"] button').getAttribute('aria-pressed'), 'true');
  await w.onTdsEpisodeCheckClick(2, '1', 'Saison 1', 2, 1, panel);
  assert.deepEqual(copy(w.loadTvShows().find(item => Number(item.tmdbTvId) === 2).seasons[1].watchedEpisodes), []);
});

test('fiche : un stockage refusé ne coche pas visuellement un épisode', async t => {
  const w = app(t);
  const panel = await untrackedChecklist(w);
  w.saveTvShows = () => false;
  await assert.rejects(w.onTdsEpisodeCheckClick(2, '1', 'Saison 1', 2, 1, panel));
  assert.equal(panel.querySelector('[data-episode="1"] button').getAttribute('aria-pressed'), 'false');
  assert.equal(w.loadTvShows().length, 1);
});

test('import : les clés dangereuses et versions futures sont refusées sans mutation', () => {
  const polluted = JSON.parse('[{"tmdbTvId":1,"seasons":{"__proto__":{"watchedEpisodes":[1]}}}]');
  assert.throws(() => normalizeTvShows(polluted), /Clé invalide/);
  const future = fixture();
  future[0]._sync = { version: 99 };
  assert.throws(() => normalizeTvShows(future), /plus récente/);
});

test('supprimer une saison prime sa modification hors ligne, même avec une date de visionnage future', () => {
  const modified = change(fixture(), (_, s) => { s.rating = { score: '9.0', date: '2099-01-01' }; });
  const tombs = [{ key: '1:1', deletedAt: '2026-08-31T09:00:00.000Z' }];
  assert.deepEqual(mergeTvShows(modified, fixture(), [], tombs), []);
});

test('épisode corrompu : arrêt sans transformer silencieusement le suivi', () => {
  const invalid = normalizeTvShows(fixture());
  invalid[0].seasons[1]._sync.episodes[1] = { watched: 'oui', updatedAt: '' };
  assert.throws(() => normalizeTvShows(invalid), /État d’épisode invalide/);
});
