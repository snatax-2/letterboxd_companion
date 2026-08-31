const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');
const copy = x => JSON.parse(JSON.stringify(x));
const tick = () => new Promise(resolve => setImmediate(resolve));
const ep = (n, date = '2020-01-01') => ({ episode_number: n, name: `Titre ${n}`, air_date: date, runtime: 30 });
const local = () => ({ tmdbTvId: 42, title: 'A', seasons: { 1: { totalEpisodes: 2, seasonName: 'Saison 1', watchedEpisodes: [1, 2], rating: { score: '8.0', date: '2026-08-20' } } } });
const detail = (id = 42) => ({ id, name: id === 42 ? 'A' : 'B', status: 'Ended', seasons: [
  { season_number: 1, name: 'Saison 1', episode_count: 2 },
  { season_number: 3, name: 'Saison 3', episode_count: 2 },
] });
function setup(t, show = local()) {
  const w = loadAppInJsdom(t);
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify([show]));
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? detail() : String(url).includes('tvSeasonShowId=') ? { episodes: [ep(1), ep(2)] } : {} });
  return w;
}

test('résoudre puis rendre la suite ne crée pas la saison ni de transaction personnelle', async t => {
  const w = setup(t);
  const before = w.localStorage.getItem('lbx_tv_shows');
  const next = await w.resolveNextTvEpisode({ show: w.loadTvShows()[0] });
  assert.equal(next.seasonKey, '3');
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(1)');
  assert.equal(w.localStorage.getItem('lbx_tv_shows'), before);
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), null);
  await w.setTvEpisodesWatched(42, '3', [1], true);
  assert.deepEqual(copy(w.loadTvShows()[0].seasons[3].watchedEpisodes), [1]);
  assert.equal(w.loadTvShows()[0].seasons[1].rating.score, '8.0');
});
test('les progressions de fiche et historique utilisent le même total et le même état à jour', async t => {
  const w = setup(t);
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? detail() : { episodes: [ep(1, '2099-01-01'), ep(2, '2099-01-08')] } });
  await w.loadTvCatalogue(w.loadTvShows()[0]);
  const show = w.loadTvShows()[0];
  const sheet = w.buildTdsSeriesProgressHtml(show, detail().seasons);
  const card = w.renderTvShowCard(show, 'normal');
  for (const html of [sheet, card]) {
    assert.match(html, /2\/4/);
    assert.match(html, /data-progress-state="up_to_date"/);
    assert.match(html, /width:50%/);
  }
});
test('pause puis reprise persistante, même avec une saison précédente complète', async t => {
  const show = local();
  show.seasons[3] = { totalEpisodes: 2, watchedEpisodes: [], paused: true };
  const w = setup(t, show);
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(0)');
  assert.match(w.buildTdsContent(detail(), w.loadTvShows()[0]), /id="tds-start-btn"[^>]*>[\s\S]*?Reprendre le suivi/);
  await w.setTvFollowingState(42, { paused: false, hidden: false });
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(1)');
  await w.setTvFollowingState(42, { hidden: true });
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(0)');
  assert.equal(w.loadTvShows()[0].continueHidden, true);
  assert.match(w.buildTdsContent(detail(), w.loadTvShows()[0]), /Réafficher dans En cours/);
  assert.equal(w.loadTvShows()[0].seasons[1].rating.score, '8.0');
});
test('une panne réseau ne fait pas disparaître la série du compteur', async t => {
  const w = setup(t);
  w.fetch = async () => { throw new Error('offline'); };
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(1)');
  assert.match(w.document.getElementById('tv-continue-list').textContent, /indisponible/);
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), null);
});
test('dernier épisode de la série : compteur à zéro, note précédente inchangée', async t => {
  const w = setup(t);
  await w.resolveNextTvEpisode({ show: w.loadTvShows()[0] });
  await w.setTvEpisodesWatched(42, '3', [1, 2], true);
  await w.renderTvContinueList();
  assert.equal(w.document.getElementById('tv-continue-count').textContent, '(0)');
  assert.equal(w.getTvProgress(w.loadTvShows()[0]).state, 'completed');
  assert.equal(w.loadTvShows()[0].seasons[1].rating.score, '8.0');
});
test('cache partagé : requête dédupliquée et valeur périmée conservée hors ligne', async t => {
  const w = setup(t);
  let calls = 0;
  w.fetch = async url => { if (String(url) === '/api/search?tvId=42') calls++; await tick(); return { ok: true, json: async () => String(url).includes('tvId=42') ? detail() : {} }; };
  await Promise.all([w.fetchTvCataloguePart(42, null), w.fetchTvCataloguePart(42, null)]);
  assert.equal(calls, 1);
  w.readTvCatalogueEntry(42).detail.fetchedAt = 1;
  w.fetch = async () => { throw new Error('offline'); };
  const result = await w.fetchTvCataloguePart(42, null);
  assert.equal(result.stale, true);
  assert.equal(result.data.name, 'A');
  assert.equal(w.localStorage.getItem('lbx_tv_state_v2'), null);
});
test('catalogue périmé sans prochain épisode : fiche et historique indiquent tous deux À vérifier', async t => {
  const show = local();
  show.seasons[3] = { totalEpisodes: 2, watchedEpisodes: [1, 2] };
  const w = setup(t, show);
  await w.loadTvCatalogue(show);
  w.readTvCatalogueEntry(42).detail.fetchedAt = 1;
  for (const html of [w.buildTdsSeriesProgressHtml(show, detail().seasons), w.renderTvShowCard(show, 'normal')]) {
    assert.match(html, /data-progress-state="unknown"/);
  }
  assert.equal(w.getTvProgress(show).inContinue, true);
});
test('actualiser un catalogue ajoute un épisode au total sans modifier le suivi ni la note', async t => {
  const w = setup(t);
  await w.loadTvCatalogue(w.loadTvShows()[0]);
  const before = w.localStorage.getItem('lbx_tv_shows');
  w.readTvCatalogueEntry(42).detail.fetchedAt = 1;
  w.fetch = async url => ({ ok: true, json: async () => {
    if (String(url).includes('tvId=')) { const d = detail(); d.seasons[1].episode_count = 3; return d; }
    return { episodes: [ep(1), ep(2), ep(3)] };
  } });
  await w.loadTvCatalogue(w.loadTvShows()[0]);
  assert.equal(w.getTvProgress(w.loadTvShows()[0]).total, 5);
  assert.equal(w.readTvCatalogueEntry(42).seasons[3].data.episodes.length, 3);
  assert.equal(w.localStorage.getItem('lbx_tv_shows'), before);
});
test('un cache catalogue malformé est ignoré sans toucher aux données personnelles', async t => {
  const w = setup(t);
  const before = w.localStorage.getItem('lbx_tv_shows');
  w.localStorage.setItem('lbx_tv_catalogue_v1_42', JSON.stringify({ version: 1, detail: { data: { name: 'A', seasons: {} } }, seasons: { 3: { data: { episodes: [null] } } } }));
  await w.loadTvCatalogue(w.loadTvShows()[0]);
  assert.equal(w.getTvProgress(w.loadTvShows()[0]).total, 4);
  assert.equal(w.localStorage.getItem('lbx_tv_shows'), before);
});
test('deux ouvertures inversées : seule la dernière fiche reçoit les détails', async t => {
  const w = setup(t);
  w.localStorage.setItem('lbx_tv_shows', '[]');
  const requests = new Map();
  w.fetch = url => new Promise(resolve => requests.set(String(url), resolve));
  const a = w.openTvDetailSheet(42);
  const b = w.openTvDetailSheet(99);
  requests.get('/api/search?tvId=99')({ ok: true, json: async () => detail(99) });
  await b;
  requests.get('/api/search?tvId=42')({ ok: true, json: async () => detail(42) });
  await a;
  assert.match(w.document.getElementById('tds-content').textContent, /B/);
  assert.equal(w.document.querySelector('#tds-content .mds-title').textContent, 'B');
});
test('deux rendus widget inversés : un ancien chargement ne remplace pas une nouvelle carte', async t => {
  const w = setup(t);
  let release;
  const real = w.resolveNextTvEpisode;
  w.resolveNextTvEpisode = () => new Promise(resolve => { release = resolve; });
  const old = w.renderTvContinueList();
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify([{ ...local(), tmdbTvId: 99, title: 'B' }]));
  w.resolveNextTvEpisode = real;
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? detail(99) : { episodes: [ep(1), ep(2)] } });
  await w.renderTvContinueList();
  release({ show: local(), progress: { inContinue: true } });
  await old;
  assert.equal(w.document.querySelector('.tv-continue-show-title').textContent, 'B');
});
test('disponibilité : futurs et sans date bloqués par la commande et masqués dans la checklist', async t => {
  const w = setup(t);
  const episodes = [ep(1, '2099-01-01'), ep(2, null), ep(3, 'date-invalide')];
  w.fetch = async () => ({ ok: true, json: async () => ({ episodes }) });
  for (const n of [1, 2, 3]) await assert.rejects(w.setTvEpisodesWatched(42, '3', [n], true), /disponible/);
  const panel = w.document.createElement('div');
  w.renderTdsEpisodeChecklist(panel, 42, '3', 'Saison 3', episodes);
  assert.equal(panel.querySelectorAll('button.tv-episode-check:disabled').length, 3);
  assert.match(w.renderTvContinueCard({ show: local(), seasonKey: '3', seasonEntry: {}, episode: episodes[2] }), /Date de diffusion inconnue/);
  assert.doesNotMatch(panel.textContent, /Titre/);
  assert.equal(w.loadTvShows()[0].seasons[3], undefined);
});
test('rattrapage : seuls les épisodes diffusés sont cochés, même avant une cible disponible', async t => {
  const w = setup(t);
  const episodes = [ep(1), ep(2, '2099-01-01'), ep(3, null), ep(4)];
  w.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=') ? detail() : { episodes } });
  await w.openTvDetailSheet(42);
  w.confirm = () => true;
  const panel = w.document.getElementById('tds-season-episodes');
  w.renderTdsEpisodeChecklist(panel, 42, '3', 'Saison 3', episodes);
  await w.onTdsEpisodeCheckClick(42, '3', 'Saison 3', 4, 4, panel);
  assert.deepEqual(copy(w.loadTvShows()[0].seasons[3].watchedEpisodes), [1, 4]);
});
