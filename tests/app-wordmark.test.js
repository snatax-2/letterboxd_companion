const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

test('le titre LUDeX expose un nom accessible et un e distinct', t => {
  const window = loadAppInJsdom(t);
  window.renderAppTitle('Ludex');
  const title = window.document.getElementById('main-app-title');
  assert.equal(title.textContent, 'LUDeX');
  assert.equal(title.getAttribute('aria-label'), 'Ludex');
  assert.equal(title.querySelector('.app-wordmark-e').textContent, 'e');
  assert.equal(title.firstElementChild.getAttribute('aria-hidden'), 'true');
  assert.ok(title.classList.contains('app-wordmark'));
});

test('les anciens noms par défaut affichent la nouvelle signature', t => {
  const window = loadAppInJsdom(t);
  for (const name of ['', 'Ludex Rating Companion', '<em>Ludex</em> Rating Companion', 'LUDEX']) {
    assert.equal(window.normalizeAppName(name), 'Ludex');
    window.renderAppTitle(name);
    assert.equal(window.document.getElementById('main-app-title').textContent, 'LUDeX');
  }
});

test('les noms personnalisés restent disponibles et rendus comme texte sûr', t => {
  const window = loadAppInJsdom(t);
  window.renderAppTitle('Ludex');
  window.renderAppTitle('<img src=x onerror="window.__xss=1"> Mon Ludex');
  const title = window.document.getElementById('main-app-title');
  assert.equal(title.textContent, 'Mon Ludex');
  assert.equal(title.children.length, 0);
  assert.equal(title.getAttribute('aria-label'), null);
  assert.equal(title.classList.contains('app-wordmark'), false);
});

test('le bouton de réglages conserve son action et son icône', t => {
  const window = loadAppInJsdom(t);
  const button = window.document.getElementById('settings-btn');
  assert.ok(button.querySelector('svg'));
  assert.equal(button.getAttribute('aria-label'), "Personnaliser l'apparence");
  button.click();
  assert.ok(window.document.getElementById('settings-modal').classList.contains('open'));
});
