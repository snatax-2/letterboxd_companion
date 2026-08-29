const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom');

function click(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

test('la recherche éditoriale Films gère ouverture, désactivation et Escape', async (t) => {
  const window = loadAppInJsdom(t);
  const { document } = window;
  const search = document.getElementById('watchlist-movie-search');
  const toggle = document.getElementById('watchlist-search-toggle');
  const input = document.getElementById('watchlist-input');
  const addButton = document.getElementById('watchlist-add-btn');

  assert.equal(search.classList.contains('is-open'), false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(input.disabled, true);
  assert.equal(addButton.disabled, true);

  click(window, toggle);
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  assert.equal(search.classList.contains('is-open'), true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(input.disabled, false);
  assert.equal(addButton.disabled, false);
  assert.equal(document.activeElement, input);

  input.value = 'Texte à effacer';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(search.classList.contains('is-open'), false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(input.disabled, true);
  assert.equal(input.value, '');
  assert.equal(document.activeElement, toggle);
});

test('l’ajout manuel Films reste relié à la liste active', (t) => {
  const window = loadAppInJsdom(t);
  const { document } = window;
  click(window, document.getElementById('watchlist-search-toggle'));
  const input = document.getElementById('watchlist-input');
  input.value = 'Film ajouté manuellement';
  click(window, document.getElementById('watchlist-add-btn'));

  const list = window.loadWatchlist();
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'Film ajouté manuellement');
});

test('le switch conserve sa pastille et bascule vers la recherche Séries', (t) => {
  const window = loadAppInJsdom(t);
  const { document } = window;
  const switchEl = document.getElementById('wl-media-tabs');
  const movieSearch = document.getElementById('watchlist-movie-search');
  const tvSearch = document.getElementById('watchlist-tv-search');

  click(window, document.getElementById('wl-tab-tv'));
  assert.equal(switchEl.classList.contains('series-active'), true);
  assert.equal(movieSearch.hidden, true);
  assert.equal(tvSearch.hidden, false);
  assert.equal(document.getElementById('wl-movie-section').style.display, 'none');
  assert.equal(document.getElementById('wl-tv-section').style.display, '');

  click(window, document.getElementById('wl-tv-search-toggle'));
  const input = document.getElementById('wl-tv-input');
  input.value = 'Série ajoutée manuellement';
  click(window, document.getElementById('wl-tv-add-btn'));

  const list = window.loadWatchlist(null, 'tv');
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'Série ajoutée manuellement');
});
