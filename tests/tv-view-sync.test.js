const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
const copy = value => JSON.parse(JSON.stringify(value));
const episode = n => ({ episode_number: n, name: `Épisode ${n}`, air_date: '2020-01-01', runtime: 30, overview: 'Synopsis test' });
const seed = () => ({ tmdbTvId: 42, title: 'Série A', genre: 'Drame', poster_path: '/a.jpg', seasons: {
  1: { seasonName: 'Saison 1', totalEpisodes: 2, watchedEpisodes: [1], rating: { score: '8.0', date: '2026-08-01' } },
  2: { seasonName: 'Saison 2', totalEpisodes: 2, watchedEpisodes: [] },
} });
async function setup(t) {
  const w = loadAppInJsdom(t);
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify([seed()]));
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? {
    id: 42, name: 'Série A', poster_path: '/a.jpg', status: 'Ended', seasons: [1, 2].map(n => ({ season_number: n, name: `Saison ${n}`, episode_count: 2 })),
  } : String(url).includes('tvSeasonShowId=') ? { episodes: [episode(1), episode(2)] } : {} });
  w.switchHistoryMediaFilter('tv');
  await w.openTvDetailSheet(42);
  await w.renderTvContinueList();
  w.document.querySelector('[data-season-number="1"]').click();
  await tick();
  return w;
}

test('une transaction rafraîchit fiche, widget et historique sans perdre la saison ni le focus', async t => {
  const w = await setup(t);
  const button = w.document.querySelector('.tv-episode-check[data-episode="2"]');
  const tab = w.document.querySelector('.tds-season-tab.active');
  const box = w.document.querySelector('#tv-detail-sheet .mds-box');
  button.focus(); box.scrollTop = 125;
  await w.setTvEpisodesWatched(42, '1', [2], true);
  await tick();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(w.document.activeElement, button);
  assert.equal(w.document.querySelector('.tds-season-tab.active'), tab);
  assert.equal(box.scrollTop, 125);
  assert.match(w.document.querySelector('.tds-series-progress').textContent, /2\/4/);
  assert.match(w.document.querySelector('.hist-grid-progress').title, /2\/4/);
  assert.match(w.document.querySelector('.tv-continue-ep-title').textContent, /Saison 2/);
});

test('fusion cloud : notes et décoches actualisées sans recharger le formulaire en cours', async t => {
  const w = await setup(t);
  w.document.getElementById('review-text').value = 'Brouillon non enregistré';
  const before = w.normalizeTvShows(w.loadTvShows());
  let remote = copy(before);
  remote[0].seasons[1].watchedEpisodes = [];
  remote[0].seasons[1].rating = { score: '6.0', date: '2026-08-02' };
  remote = w.stampTvChanges(before, remote, '2026-08-31T13:00:00.000Z');
  await w.mergeWithRemote({ tvShows: remote });
  await tick();
  assert.equal(w.document.querySelector('.tv-episode-check').getAttribute('aria-pressed'), 'false');
  assert.match(w.document.querySelector('.mds-personal-score').textContent, /6.0/);
  assert.match(w.document.getElementById('tds-season-status-row').textContent, /6.0/);
  assert.equal(w.document.getElementById('review-text').value, 'Brouillon non enregistré');
});

test('autre onglet : un événement storage relit le dernier état, pas le payload périmé', async t => {
  const w = await setup(t);
  const state = { schemaVersion: 2, shows: [{ ...seed(), paused: true }], showTombstones: [], seasonTombstones: [] };
  w.localStorage.setItem('lbx_tv_state_v2', JSON.stringify(state));
  w.dispatchEvent(new w.StorageEvent('storage', { key: 'lbx_tv_state_v2', newValue: 'obsolete', storageArea: w.localStorage }));
  await tick();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(0)');
  assert.match(w.document.getElementById('tds-start-btn').textContent, /Reprendre/);
  assert.equal(w.document.querySelector('.tds-season-tab.active').dataset.seasonNumber, '1');
});

test('suppression distante : la fiche ouverte reste consultable mais ne présente plus de note ni de suivi', async t => {
  const w = await setup(t);
  await w.mutateTvShows(() => []);
  await tick();
  assert.equal(w.document.querySelector('.mds-personal-score'), null);
  assert.match(w.document.getElementById('tds-start-btn').textContent, /Commencer/);
  assert.equal(w.document.querySelector('.tds-season-tab.active').dataset.seasonNumber, '1');
  assert.equal(w.document.querySelector('.tds-rate-now-btn').style.display, 'none');
  assert.equal(w.document.querySelectorAll('.tv-episode-check.watched').length, 0);
  assert.equal(w.document.querySelectorAll('#tv-history-list [data-show-id]').length, 0);
});

test('écriture refusée : aucun événement ni fausse projection', async t => {
  const w = await setup(t);
  let count = 0;
  w.document.addEventListener('ludex:tv-changed', () => count++);
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) { if (key === 'lbx_tv_state_v2') throw Error('quota'); return original.call(this, key, value); };
  await assert.rejects(w.setTvFollowingState(42, { paused: true }));
  await tick();
  assert.equal(count, 0);
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(1)');
  assert.equal(w.document.getElementById('tds-start-btn'), null);
});

test('les fusions identiques ne réinitialisent ni le widget ni son synopsis', async t => {
  const w = await setup(t);
  const fold = w.document.querySelector('.tv-continue-synopsis');
  fold.open = true;
  let count = 0;
  w.document.addEventListener('ludex:tv-changed', () => count++);
  await w.mutateTvShows(() => {});
  await tick();
  assert.equal(count, 0);
  assert.equal(w.document.querySelector('.tv-continue-synopsis'), fold);
  assert.equal(fold.open, true);
});

test('Profil visible actualisé après un changement de note, sans navigation', async t => {
  const w = await setup(t);
  w.document.getElementById('view-profile').classList.add('active');
  let calls = 0;
  w.renderActiveStatsView = () => { calls++; };
  await w.mutateTvShows(shows => { shows[0].seasons[1].rating.score = '7.0'; });
  await tick();
  assert.equal(calls, 1);
});

test('enrichissement historique tardif ne remplace pas le hero Films', async t => {
  const w = await setup(t);
  let release;
  w.loadTvCatalogue = () => new Promise(resolve => { release = resolve; });
  w.enrichTvHistoryEpisodeTotals(w.loadTvShows());
  w.switchHistoryMediaFilter('movie');
  const hero = w.document.getElementById('history-hero');
  hero.textContent = 'Hero Films à préserver';
  w.readTvCatalogueEntry(42).detail.data.seasons[0].episode_count = 8;
  release({}); await tick();
  assert.equal(hero.textContent, 'Hero Films à préserver');
});

test('plusieurs notifications sont regroupées, les projections v1 sont ignorées en v2', async t => {
  const w = await setup(t);
  await w.mutateTvShows(() => {});
  await tick();
  let calls = 0;
  w.renderTvContinueList = () => { calls++; };
  w.dispatchEvent(new w.StorageEvent('storage', { key: 'lbx_tv_shows', newValue: '[]', storageArea: w.localStorage }));
  await tick();
  assert.equal(calls, 0);
  w.notifyTvViewsChanged([42]); w.notifyTvViewsChanged([42]); w.notifyTvViewsChanged([42]);
  await tick();
  assert.equal(calls, 1);
});

test('un échec de rendu n’annule pas le commit et les autres projections continuent', async t => {
  const w = await setup(t);
  const warnings = t.mock.method(w.console, 'warn', () => {});
  w.renderTvHistory = () => { throw Error('échec simulé'); };
  await w.setTvFollowingState(42, { paused: true });
  await tick();
  assert.equal(w.loadTvShows()[0].paused, true);
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(0)');
  assert.match(w.document.getElementById('tds-start-btn').textContent, /Reprendre/);
  w.refreshOpenTvDetail = async () => { throw Error('échec asynchrone simulé'); };
  w.notifyTvViewsChanged([42]);
  await tick();
  assert.ok(warnings.mock.calls.some(call => /différé impossible/.test(call.arguments[0])));
});

test('une ancienne réponse de durée ne remplace pas le nouveau total du Profil', async t => {
  const w = await setup(t);
  const requests = [];
  w.getWatchedEpisodeMinutes = () => new Promise(resolve => requests.push(resolve));
  w.refreshProfileWatchTime([]);
  w.refreshProfileWatchTime([]);
  requests[1](120); await tick();
  const total = w.document.getElementById('profile-hero-watch-total');
  assert.equal(total.textContent, '2 h');
  requests[0](600); await tick();
  assert.equal(total.textContent, '2 h');
});

test('un nouveau catalogue actualise la checklist et les pastilles sans créer de suivi', async t => {
  const w = await setup(t);
  const before = w.localStorage.getItem('lbx_tv_shows');
  const tab = w.document.querySelector('.tds-season-tab.active');
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? {
    id: 42, name: 'Série A', status: 'Ended', seasons: [1, 2, 3].map(n => ({ season_number: n, name: `Saison ${n}`, episode_count: 3 })),
  } : { episodes: [episode(1), episode(2), episode(3)] } });
  await w.loadTvCatalogue(w.loadTvShows()[0], { force: true });
  await tick();
  assert.equal(w.document.querySelectorAll('.tv-episode-check').length, 3);
  assert.equal(w.document.querySelectorAll('.tds-season-tab').length, 3);
  assert.equal(w.document.querySelector('.tds-season-tab.active'), tab);
  assert.equal(w.localStorage.getItem('lbx_tv_shows'), before);
});

test('une notification concernant une autre série ne laisse pas À regarder bloqué en chargement', async t => {
  const w = await setup(t);
  const resolve = w.resolveNextTvEpisode;
  w.document.getElementById('tds-up-next').style.display = 'none';
  let release;
  w.resolveNextTvEpisode = args => new Promise(done => { release = () => resolve(args).then(done); });
  const pending = w.populateTdsUpNext(w.loadTvShows()[0]);
  w.notifyTvViewsChanged([99], 'catalogue');
  release(); await pending;
  assert.equal(w.document.getElementById('tds-up-next').style.display, 'block');
  assert.match(w.document.querySelector('.tds-upnext-title').textContent, /E02/);
});

test('annuler un compteur animé empêche une ancienne valeur de remplacer l’état vide', t => {
  const w = loadAppInJsdom(t);
  let frame;
  w.requestAnimationFrame = callback => { frame = callback; };
  const el = w.document.getElementById('kpi-avg');
  w.animateCountUp(el, 8);
  w.stopCountUp(el);
  el.textContent = '-';
  frame(w.performance.now() + 1000);
  assert.equal(el.textContent, '-');
});
