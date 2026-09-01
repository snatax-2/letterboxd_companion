const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom');
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
const fixture = () => [1, 2].map(id => ({ tmdbTvId: id, title: `Série ${id}`, genre: 'Drame', poster_path: '/original.jpg', seasons: {
  1: { seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 2, rating: { mode: 'detail', score: '8.0', date: '2026-08-01', review: 'Ancienne note' } },
  2: { seasonName: 'Saison 2', watchedEpisodes: [1, 2], totalEpisodes: 2 },
} }));
function app(t) {
  const w = loadAppInJsdom(t);
  w.Element.prototype.scrollIntoView = () => {};
  w.localStorage.setItem('lbx_tv_shows', JSON.stringify(fixture()));
  for (const name of ['renderAll', 'renderTvContinueList', 'renderTvHistory']) w[name] = () => {};
  return w;
}
function review(w, value) {
  const el = w.document.getElementById('review-text');
  el.value = value; el.dispatchEvent(new w.Event('input'));
}

test('brouillons film et saisons isolés, y compris date et pondérations', async t => {
  const w = app(t);
  w.document.getElementById('movie-title').value = 'Film';
  review(w, 'Mon film');
  w.reopenTvSeason(1, '1'); review(w, 'Brouillon S1');
  w.document.getElementById('w-scenario').value = '3';
  w.document.getElementById('w-scenario').dispatchEvent(new w.Event('input'));
  w.document.getElementById('tv-view-date').value = '2026-08-17';
  w.document.getElementById('tv-view-date').dispatchEvent(new w.Event('change'));
  w.reopenTvSeason(1, '2'); review(w, 'Brouillon S2');
  w.reopenTvSeason(1, '1');
  assert.equal(w.document.getElementById('review-text').value, 'Brouillon S1');
  assert.equal(w.document.getElementById('tv-view-date').value, '2026-08-17');
  assert.equal(w.document.getElementById('w-scenario').value, '3');
  w.setMediaType('movie');
  assert.equal(w.document.getElementById('review-text').value, 'Mon film');
  w.setMediaType('tv');
  assert.equal(w.document.getElementById('review-text').value, 'Brouillon S1');
  await tick();
});

test('la dernière saison notée ne se rouvre pas sans brouillon à reprendre', t => {
  const w = app(t);
  w.localStorage.setItem('lbx_tv_rating_last', '1:1');
  w.localStorage.setItem('lbx_tv_rating_draft_1:1', JSON.stringify({ cleared: true }));
  w.setMediaType('tv');
  assert.equal(w.document.getElementById('notation-card').style.display, 'none');
  assert.equal(w.document.getElementById('tv-search').value, '');
  assert.equal(w.localStorage.getItem('lbx_tv_rating_last'), null);
});

test('rouvrir pour noter ferme la fiche et restaure la date par le même chemin', async t => {
  const w = app(t);
  w.document.getElementById('tv-detail-sheet').classList.add('open');
  w.reopenTvSeason(1, '1');
  assert.equal(w.document.getElementById('tv-detail-sheet').classList.contains('open'), false);
  assert.equal(w.document.getElementById('tv-view-date').value, '2026-08-01');
  await tick();
});

test('une modification distante de note ne peut être écrasée par un formulaire périmé', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1'); review(w, 'Mon brouillon');
  await w.mutateTvShows(shows => { shows[0].seasons[1].rating.review = 'Modification ailleurs'; });
  await assert.rejects(w.saveTvSeasonRating(), /modifiée|modifié/);
  assert.equal(w.loadTvShows()[0].seasons[1].rating.review, 'Modification ailleurs');
  assert.equal(w.document.getElementById('review-text').value, 'Mon brouillon');
  await tick();
});

test('À voir : ouvrir Commencer à suivre ne retire rien de la liste', async t => {
  const w = app(t);
  w.saveTvWatchlist([{ tmdbId: 1, title: 'Série 1' }]);
  w.openTvDetailSheet = async () => {};
  w.tvWatchlistToForm(0);
  assert.equal(w.loadTvWatchlist().length, 1);
  await tick();
});

test('import ancien conserve coups de cœur, pauses et affiche ; format malformé refusé avant toute écriture', async t => {
  const w = app(t);
  const imported = fixture()[0]; imported.tmdbTvId = 3;
  imported.liked = true; imported.paused = true; imported.posterOverride = '/chosen.jpg';
  let confirm;
  w.openModal = (_title, _text, fn) => { confirm = fn; };
  w.importLudexJson(JSON.stringify({ tvShows: [imported] })); await confirm();
  const saved = w.loadTvShows().find(s => s.tmdbTvId === 3);
  assert.equal(saved.liked, true); assert.equal(saved.paused, true);
  assert.equal(saved.poster_path, '/chosen.jpg');
  const historyBefore = w.localStorage.getItem('lbx_v2');
  assert.throws(() => w.importLudexJson(JSON.stringify({ history: [{ title: 'Ne pas ajouter' }], tvShows: [{ tmdbTvId: 4, seasons: { bad: {} } }] })), /Saison|saison/);
  assert.equal(w.localStorage.getItem('lbx_v2'), historyBefore);
  await tick();
});

test('durées : cache périmé préservé hors ligne et inconnues signalées', async t => {
  const w = app(t);
  w.localStorage.setItem('lbx_profile_episode_runtime_v1', JSON.stringify({ '1:1': { at: 1, episodes: [{ number: 1, runtime: 50 }] } }));
  w.fetch = async () => { throw Error('offline'); };
  const s = fixture()[0]; delete s.seasons[2];
  const result = await w.getWatchedEpisodeMinutes([s], { details: true });
  assert.equal(result.minutes, 50);
  assert.equal(result.unknownEpisodes, 1);
  assert.equal(result.stale, true);
  await tick();
});

test('export/restauration des brouillons par cible, priorité au brouillon local', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1'); review(w, 'Premier brouillon');
  w.reopenTvSeason(2, '2'); review(w, 'Second brouillon');
  const snapshot = w.currentLocalSnapshot();
  assert.equal(snapshot.draft.tvDrafts['1:1'].form.review, 'Premier brouillon');
  review(w, 'Ne pas écraser');
  w.localStorage.removeItem('lbx_tv_rating_draft_1:1');
  await w.mergeWithRemote(snapshot);
  w.reopenTvSeason(1, '1');
  assert.equal(w.document.getElementById('review-text').value, 'Premier brouillon');
  w.reopenTvSeason(2, '2');
  assert.equal(w.document.getElementById('review-text').value, 'Ne pas écraser');
  await tick();
});

test('saisie pendant une sauvegarde puis changement de saison conserve le nouveau brouillon', async t => {
  const w = app(t);
  w.reopenTvSeason(1, '1'); review(w, 'À enregistrer');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const waiting = w.mutateTvShows(async () => { await gate; });
  const saving = w.saveTvSeasonRating();
  review(w, 'Saisie suivante');
  w.reopenTvSeason(2, '2');
  release(); await waiting; await saving;
  assert.equal(w.loadTvShows()[0].seasons[1].rating.review, 'À enregistrer');
  w.reopenTvSeason(1, '1');
  assert.equal(w.document.getElementById('review-text').value, 'Saisie suivante');
  await w.saveTvSeasonRating();
  assert.equal(w.loadTvShows()[0].seasons[1].rating.review, 'Saisie suivante');
  await tick();
});

test('affiche : aucun faux succès sur quota, choix conservé malgré un catalogue distant plus récent', async t => {
  const w = app(t);
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) {
    if (key === 'lbx_tv_state_v2') throw Error('quota');
    return original.call(this, key, value);
  };
  await assert.rejects(w.applyChosenTvPoster(1, '/chosen.jpg'));
  assert.equal(w.loadTvShows()[0].poster_path, '/original.jpg');
  w.Storage.prototype.setItem = original;
  await w.applyChosenTvPoster(1, '/chosen.jpg');
  const local = w.loadTvShows();
  const remote = JSON.parse(JSON.stringify(local));
  delete remote[0].posterOverride; delete remote[0]._sync.fields.posterOverride;
  remote[0].poster_path = '/catalogue.jpg';
  remote[0]._sync.fields.poster_path = '2099-01-01T00:00:00.000Z';
  await w.mergeWithRemote({ tvShows: remote });
  assert.equal(w.loadTvShows()[0].poster_path, '/chosen.jpg');
  await tick();
});

test('copier une critique de saison ne reprend ni titre ni contexte du film', async t => {
  const w = app(t);
  w.document.getElementById('movie-title').value = 'Film secret';
  w.document.getElementById('movie-director').value = 'Réalisateur film';
  w.reopenTvSeason(1, '1'); review(w, 'Critique série');
  let copied = '';
  w.navigator.clipboard = { writeText: async text => { copied = text; } };
  w.document.getElementById('copy-btn').click();
  assert.match(copied, /Série 1 — Saison 1/);
  assert.match(copied, /Critique série/);
  assert.doesNotMatch(copied, /Film secret|Réalisateur film/);
  await tick();
});

test('sélecteur d’affiche : une ancienne réponse ne remplace pas la nouvelle cible', async t => {
  const w = app(t);
  const releases = {};
  w.fetch = url => new Promise(resolve => { releases[url] = data => resolve({ ok: true, json: async () => data }); });
  const a = w.openPosterPicker(1, 'tv');
  const b = w.openPosterPicker(2, 'tv');
  releases['/api/search?tvImages=2']({ posters: [{ file_path: '/two.jpg' }] }); await b;
  releases['/api/search?tvImages=1']({ posters: [{ file_path: '/one.jpg' }] }); await a;
  assert.equal(w.document.getElementById('poster-picker-grid').dataset.tmdbId, '2');
  assert.equal(w.document.querySelector('.poster-picker-cell').dataset.posterPath, '/two.jpg');
  await tick();
});
