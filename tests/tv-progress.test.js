const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeTvProgress, computeTvSeasonProgress, tvEpisodeAvailability, isTvPaused } = require('../src/17c-tv-progress.js');
const today = '2026-08-31';
const ep = (n, date = '2020-01-01') => ({ episode_number: n, air_date: date, name: `Épisode ${n}` });
const local = (watched = [1]) => ({ tmdbTvId: 42, seasons: { 1: { totalEpisodes: 2, watchedEpisodes: watched, rating: { score: '8.0' } } } });
const catalogue = (second = [ep(1), ep(2)], status = 'Ended') => ({ id: 42, status, seasons: [
  { season_number: 1, episode_count: 2, episodes: [ep(1), ep(2)] },
  { season_number: 3, episode_count: 2, episodes: second },
] });

test('progression globale : inclut les saisons non commencées et non contiguës, sans écrire', () => {
  const show = local([1, 2]);
  const before = JSON.stringify(show);
  const p = computeTvProgress(show, catalogue(), today);
  assert.equal(p.total, 4);
  assert.equal(p.watched, 2);
  assert.equal(p.percent, 50);
  assert.equal(p.next.seasonKey, '3');
  assert.equal(p.next.episode.episode_number, 1);
  assert.equal(JSON.stringify(show), before);
});
test('le premier épisode diffusé manquant prime sur une saison plus avancée', () => {
  const show = local([2]);
  show.seasons[3] = { totalEpisodes: 2, watchedEpisodes: [1] };
  assert.equal(computeTvProgress(show, catalogue(), today).next.seasonKey, '1');
  assert.equal(computeTvProgress(show, catalogue(), today).next.episode.episode_number, 1);
});
test('à jour en or avec épisodes futurs : la barre globale reste à 50 %', () => {
  const p = computeTvProgress(local([1, 2]), catalogue([ep(1, '2099-01-01'), ep(2, '2099-01-08')], 'Returning Series'), today);
  assert.equal(p.state, 'up_to_date');
  assert.equal(p.percent, 50);
  assert.equal(p.inContinue, true);
  assert.equal(p.next.availability, 'future');
});
test('terminée personnellement seulement si tous les épisodes connus sont vus', () => {
  const show = local([1, 2]);
  show.seasons[3] = { totalEpisodes: 2, watchedEpisodes: [1, 2] };
  const p = computeTvProgress(show, catalogue(), today);
  assert.equal(p.state, 'completed');
  assert.equal(p.inContinue, false);
  assert.equal(p.percent, 100);
  assert.equal(computeTvProgress(local(), catalogue(), today).state, 'in_progress');
});
test('le catalogue actualisé prime sur un ancien total local', () => {
  const p = computeTvSeasonProgress({ totalEpisodes: 1, watchedEpisodes: [1] }, { episode_count: 2, episodes: [ep(1), ep(2)] }, today);
  assert.equal(p.total, 2);
  assert.equal(p.state, 'in_progress');
  assert.equal(p.complete, false);
});
test('doublons, numéros invalides et hors catalogue ne gonflent pas le pourcentage', () => {
  const p = computeTvSeasonProgress({ watchedEpisodes: [1, 1, '1', -1, 0, 1.5, 900] }, { episode_count: 2, episodes: [ep(1), ep(2)] }, today);
  assert.equal(p.watched, 1);
  assert.equal(p.percent, 50);
});
test('une date manquante/invalide reste inconnue, pas à jour ni cochable', () => {
  for (const date of [null, '', 'not-a-date', '2026-02-31']) assert.equal(tvEpisodeAvailability(ep(1, date), today), 'unknown');
  assert.equal(tvEpisodeAvailability(ep(1, today), today), 'available');
  const p = computeTvProgress(local([1, 2]), catalogue([ep(1, null), ep(2, null)]), today);
  assert.equal(p.state, 'unknown');
  assert.equal(p.inContinue, true);
});
test('un catalogue absent/incomplet ne signifie pas que la série est terminée', () => {
  const p = computeTvProgress(local([1, 2]), null, today);
  assert.equal(p.state, 'unknown');
  assert.equal(p.inContinue, true);
  assert.equal(computeTvSeasonProgress(null, { episode_count: 0 }, today).complete, false);
});
test('pause et retrait sont persistants, indépendants des notes et de la progression', () => {
  const show = local([1, 2]);
  show.seasons[3] = { totalEpisodes: 2, watchedEpisodes: [], paused: true };
  assert.equal(isTvPaused(show), true);
  assert.equal(computeTvProgress(show, catalogue(), today).inContinue, false);
  show.paused = false;
  assert.equal(isTvPaused(show), false);
  assert.equal(computeTvProgress(show, catalogue(), today).inContinue, true);
  show.continueHidden = true;
  assert.equal(computeTvProgress(show, catalogue(), today).inContinue, false);
  assert.equal(show.seasons[1].rating.score, '8.0');
});
test('les spéciaux ne participent pas au total des saisons normales', () => {
  const cat = catalogue();
  cat.seasons.push({ season_number: 0, episode_count: 20 });
  const show = local();
  show.seasons[0] = { totalEpisodes: 20, watchedEpisodes: [1, 2] };
  assert.equal(computeTvProgress(show, cat, today).total, 4);
  assert.equal(computeTvProgress(show, cat, today).watched, 1);
});
