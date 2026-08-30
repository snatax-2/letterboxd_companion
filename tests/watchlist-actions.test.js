const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom');

test('le menu retrouve le bon film après un réordonnancement de la liste', t => {
  const window = loadAppInJsdom(t);
  const first = { title: 'Premier', tmdbId: 1 };
  const second = { title: 'Deuxième', tmdbId: 2 };
  window.saveWatchlist([first, second]);
  window.openWatchlistCardMenu('movie', 0);
  window.saveWatchlist([second, first]);
  window.document.querySelector('#action-sheet .danger').click();
  assert.deepEqual(Array.from(window.loadWatchlist(), item => item.tmdbId), [2]);
});

test('une affiche supprimée ailleurs ne fait pas supprimer sa voisine', t => {
  const window = loadAppInJsdom(t);
  window.saveWatchlist([{ title: 'Premier', tmdbId: 1 }, { title: 'Deuxième', tmdbId: 2 }]);
  window.openWatchlistCardMenu('movie', 0);
  window.saveWatchlist([{ title: 'Deuxième', tmdbId: 2 }]);
  window.document.querySelector('#action-sheet .danger').click();
  assert.equal(window.loadWatchlist().length, 1);
});

test('les actions dans une fiche existent seulement pour la liste active et échappent les identifiants', t => {
  const window = loadAppInJsdom(t);
  window.saveWatchlist([{ title: 'Film', tmdbId: '1" onclick="bad' }]);
  const html = window.watchlistDetailActionsHtml('1" onclick="bad', 'movie');
  const container = window.document.createElement('div');
  container.innerHTML = html;
  assert.equal(container.querySelector('button').getAttribute('onclick'), null);
  assert.equal(window.watchlistDetailActionsHtml(2, 'movie'), '');
});
