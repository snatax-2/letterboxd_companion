const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

const show = {
  id: 42, name: 'Série test', seasons: [
    { season_number: 1, name: 'Saison 1', episode_count: 8 },
    { season_number: 2, name: 'Saison 2', episode_count: 10 },
  ],
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const response = name => ({ ok: true, json: async () => ({ episodes: [
  { episode_number: 1, name, air_date: '2020-01-01', runtime: 42 },
] }) });

async function setup(t) {
  const window = loadAppInJsdom(t);
  // Ouvrir par le vrai point d'entrée initialise l'état lexical de l'app.
  // Un second window.eval ne partage pas les let/const du premier eval.
  window.fetch = async url => ({ ok: true, json: async () => String(url).includes('tvId=42') ? show : {} });
  await window.openTvDetailSheet(42);
  await tick();
  const panel = window.document.getElementById('tds-season-episodes');
  const tab = n => window.document.querySelector(`[data-season-number="${n}"]`);
  const requests = [];
  window.fetch = () => new Promise((resolve, reject) => requests.push({ resolve, reject }));
  return { window, panel, tab, requests };
}

test('toutes les saisons ont un compteur, restent pliées et indiquent leur état accessible', async t => {
  const { panel, tab } = await setup(t);
  assert.equal(tab(1).querySelector('.tds-season-tab-count').textContent, '0/8');
  assert.equal(tab(2).querySelector('.tds-season-tab-count').textContent, '0/10');
  assert.equal(tab(2).getAttribute('aria-controls'), panel.id);
  assert.equal(tab(2).getAttribute('aria-expanded'), 'false');
  assert.equal(panel.textContent, '');
});

test('replier pendant le chargement empêche la réponse tardive de rouvrir les épisodes', async t => {
  const { panel, tab, requests } = await setup(t);
  tab(1).click();
  assert.equal(tab(1).getAttribute('aria-expanded'), 'true');
  assert.equal(panel.getAttribute('aria-busy'), 'true');
  tab(1).click();
  requests[0].resolve(response('Ancien épisode'));
  await tick();
  assert.equal(panel.textContent, '');
  assert.equal(panel.getAttribute('aria-busy'), 'false');
  assert.equal(tab(1).getAttribute('aria-expanded'), 'false');
});

test('changer de saison ignore une réponse reçue dans le mauvais ordre', async t => {
  const { panel, tab, requests } = await setup(t);
  tab(1).click();
  tab(2).click();
  requests[1].resolve(response('Épisode saison deux'));
  await tick();
  requests[0].resolve(response('Ancien épisode saison un'));
  await tick();
  assert.match(panel.textContent, /Épisode saison deux/);
  assert.doesNotMatch(panel.textContent, /Ancien épisode/);
  assert.equal(panel.dataset.loadedSeason, '2');
  assert.equal(tab(1).getAttribute('aria-expanded'), 'false');
  assert.equal(tab(2).getAttribute('aria-expanded'), 'true');
});

test('revenir à la saison précédente pendant un chargement affiche la bonne liste', async t => {
  const { panel, tab, requests } = await setup(t);
  tab(1).click();
  requests[0].resolve(response('Première visite'));
  await tick();
  tab(2).click();
  tab(1).click();
  assert.equal(requests.length, 3);
  requests[2].resolve(response('Retour saison un'));
  requests[1].resolve(response('Réponse saison deux'));
  await tick();
  assert.match(panel.textContent, /Retour saison un/);
  assert.equal(panel.dataset.loadedSeason, '1');
});

test('erreur réseau : reprise sur place sans fermer la fiche', async t => {
  const { panel, tab, requests } = await setup(t);
  tab(2).click();
  requests[0].reject(new Error('network'));
  await tick();
  assert.equal(panel.getAttribute('aria-busy'), 'false');
  const retry = panel.querySelector('[data-retry-season="2"]');
  assert.ok(retry);
  retry.click();
  assert.equal(requests.length, 2);
  requests[1].resolve(response('Épisode récupéré'));
  await tick();
  assert.match(panel.textContent, /Épisode récupéré/);
  assert.equal(panel.querySelector('[data-retry-season]'), null);
  assert.equal(tab(2).getAttribute('aria-expanded'), 'true');
});

test('saison vide : message explicite, sans indicateur de chargement permanent', async t => {
  const { panel, tab, requests } = await setup(t);
  tab(1).click();
  requests[0].resolve({ ok: true, json: async () => ({ episodes: [] }) });
  await tick();
  assert.match(panel.textContent, /pas encore disponibles/);
  assert.equal(panel.getAttribute('aria-busy'), 'false');
});

test('actualiser la progression conserve la pastille dépliée et son état accessible', async t => {
  const { window, tab } = await setup(t);
  tab(1).click();
  window.refreshTdsSeasonProgress({ seasons: { '1': { totalEpisodes: 8, watchedEpisodes: [1] } } }, '1');
  assert.equal(tab(1).getAttribute('aria-expanded'), 'true');
  assert.ok(tab(1).classList.contains('active'));
  assert.equal(tab(1).querySelector('.tds-season-tab-count').textContent, '1/8');
});

test('une réponse attachée à une ancienne fiche ne remplit pas la nouvelle', async t => {
  const { window, panel, tab, requests } = await setup(t);
  tab(1).click();
  window.document.getElementById('tds-content').innerHTML = window.buildSeasonProgressionSection(show, null);
  requests[0].resolve(response('Épisode de la fiche fermée'));
  await tick();
  assert.equal(panel.isConnected, false);
  assert.equal(window.document.getElementById('tds-season-episodes').textContent, '');
});
