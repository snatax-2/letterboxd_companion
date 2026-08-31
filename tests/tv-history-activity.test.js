const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom');
const { normalizeTvShows, stampTvChanges, mergeTvShows } = require('../src/03b-pure-logic');
const show = (id, date) => ({ tmdbTvId: id, title: `Série ${id}`, seasons: {
  1: { seasonName: 'Saison 1', totalEpisodes: 3, watchedEpisodes: [], ...(date ? { rating: { score: '8.0', date } } : {}) },
} });
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
function seen(input, episode, clock, watchedAt) {
  const before = normalizeTvShows([input]);
  const after = structuredClone(before);
  after[0].seasons[1].watchedEpisodes.push(episode);
  return stampTvChanges(before, after, clock, watchedAt)[0];
}

test('Récents mélange notes et épisodes vus dans la même grille mensuelle', async t => {
  const w = loadAppInJsdom(t);
  const unrated = seen(show(2), 1, '2026-08-31T10:00:00.000Z', '2026-08-20T10:00:00.000Z');
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify([show(1, '2026-08-10'), unrated, show(3)]));
  w.enrichTvHistoryEpisodeTotals = () => {};
  w.switchHistoryMediaFilter('tv');
  assert.deepEqual(Array.from(w.getSortedTvShows(), s => s.tmdbTvId), [2, 1, 3]);
  const grids = w.document.querySelectorAll('#tv-history-list .hist-grid');
  assert.deepEqual(Array.from(grids[0].querySelectorAll('.hist-grid-card'), el => el.dataset.showId), ['2', '1']);
  assert.match(w.document.querySelector('.hist-month-recap').textContent, /2 séries · moy. 8.0/);
  assert.equal(w.document.querySelectorAll('.hist-month-sep').length, 1);
  assert.match(w.document.getElementById('history-hero').textContent, /Dernière série notée.*Série 1/s);
  await tick();
});

test('migration, métadonnées et anciens épisodes ne fabriquent pas de date métier', t => {
  const w = loadAppInJsdom(t);
  const legacy = show(1);
  legacy.seasons[1].watchedEpisodes = [1];
  legacy.updatedAt = '2026-08-31T10:00:00.000Z';
  const migrated = stampTvChanges([], [legacy], '2026-08-31T10:00:00.000Z')[0];
  assert.equal(w.tvLatestActivity(migrated).date, '');
  const rated = seen(show(2, '2026-08-22'), 1, '2030-01-01T00:00:00.000Z', '2026-08-20T10:00:00.000Z');
  assert.equal(w.tvLatestActivity(rated).date, '2026-08-22');
});

test('cocher puis décocher utilise la date réelle du geste, pas l’horloge technique', async t => {
  const w = loadAppInJsdom(t);
  const initial = normalizeTvShows([show(1, '2020-01-01')]);
  initial[0]._sync.fields.title = '2030-01-01T00:00:00.000Z';
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify(initial));
  w.fetch = async () => ({ ok: true, json: async () => ({ episodes: [1, 2, 3].map(n => ({ episode_number: n, air_date: '2020-01-01' })) }) });
  const start = Date.now();
  await w.setTvEpisodesWatched(1, '1', [1], true);
  let current = w.loadTvShows()[0];
  const event = current.seasons[1]._sync.episodes[1];
  assert.ok(Date.parse(event.watchedAt) >= start && Date.parse(event.watchedAt) <= Date.now());
  assert.ok(Date.parse(event.updatedAt) >= Date.parse('2030-01-01'));
  await w.setTvEpisodesWatched(1, '1', [1], true);
  assert.equal(w.loadTvShows()[0].seasons[1]._sync.episodes[1].watchedAt, event.watchedAt);
  await w.setTvEpisodesWatched(1, '1', [1], false);
  current = w.loadTvShows()[0];
  assert.equal(w.tvLatestActivity(current).date, '2020-01-01');
  await tick();
});

test('dates de visionnage conservées par fusion, export et collisions à horloge égale', t => {
  const w = loadAppInJsdom(t);
  const base = show(1);
  const a = seen(base, 1, '2026-08-31T10:00:00.000Z', '2026-08-20T10:00:00.000Z');
  const b = seen(base, 2, '2026-08-31T11:00:00.000Z', '2026-08-21T10:00:00.000Z');
  const merged = mergeTvShows([a], [b]);
  assert.deepEqual(merged, mergeTvShows([b], [a]));
  assert.equal(w.tvLatestActivity(JSON.parse(JSON.stringify(merged[0]))).date, '2026-08-21');
  const oldClient = structuredClone(a);
  delete oldClient.seasons[1]._sync.episodes[1].watchedAt;
  assert.deepEqual(mergeTvShows([a], [oldClient]), mergeTvShows([oldClient], [a]));
  assert.equal(w.tvLatestActivity(mergeTvShows([oldClient], [a])[0]).date, '2026-08-20');
  const reimport = stampTvChanges([], JSON.parse(JSON.stringify(merged)), '2026-09-01T00:00:00.000Z');
  assert.equal(w.tvLatestActivity(reimport[0]).date, '2026-08-21');
});

test('dates invalides ignorées pour le tri, mois calculé dans le fuseau local', t => {
  const w = loadAppInJsdom(t);
  assert.equal(w.tvLatestActivity(show(1, '2026-02-30')).date, '');
  assert.equal(w.tvLatestActivity(show(1, 'texte')).date, '');
  const localMidnight = new Date(2026, 8, 1, 0, 15).toISOString();
  const s = seen(show(1), 1, localMidnight, localMidnight);
  assert.equal(w.tvLatestActivity(s).date, '2026-09-01');
  const invalid = structuredClone(s);
  invalid.seasons[1]._sync.episodes[1].watchedAt = 'invalide';
  assert.throws(() => normalizeTvShows([invalid]), /État d’épisode invalide/);
});
