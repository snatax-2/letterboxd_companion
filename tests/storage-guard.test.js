const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

describe('garde-fous localStorage', () => {
  test('une valeur JSON corrompue est préservée sans être écrasée', (t) => {
    const window = loadAppInJsdom(t);
    const raw = '[{"title":"Heat"}';
    window.localStorage.setItem('lbx_v2', raw);

    assert.equal(window.loadHistory().length, 0);
    assert.equal(window.localStorage.getItem('lbx_v2'), raw);

    const recovery = window.collectStorageRecovery();
    assert.equal(recovery.length, 1);
    assert.equal(recovery[0].key, 'lbx_v2');
    assert.equal(recovery[0].raw, raw);
  });

  test('la même corruption ne crée pas plusieurs copies identiques', (t) => {
    const window = loadAppInJsdom(t);
    window.localStorage.setItem('lbx_analyses', '{invalide');

    window.readJsonStorage('lbx_analyses', []);
    window.readJsonStorage('lbx_analyses', []);

    assert.equal(window.collectStorageRecovery().length, 1);
  });

  test('un schéma valide en JSON mais invalide pour le registre est récupéré', (t) => {
    const window = loadAppInJsdom(t);
    window.localStorage.setItem('lbx_tv_shows', JSON.stringify({ unexpected: true }));

    assert.equal(window.loadTvShows().length, 0);
    const recovery = window.collectStorageRecovery();
    assert.equal(recovery.length, 1);
    assert.match(recovery[0].reason, /Schéma local inattendu/);
  });

  test('les copies de récupération sont incluses dans l export manuel uniquement', (t) => {
    const window = loadAppInJsdom(t);
    window.localStorage.setItem('lbx_v2', '{cassé');
    window.loadHistory();

    const cloudSnapshot = window.currentLocalSnapshot();
    const exportSnapshot = window.currentLocalSnapshot({ includeExportDate: true });
    assert.equal(cloudSnapshot.recovery, undefined);
    assert.equal(exportSnapshot.recovery.length, 1);
    assert.equal(exportSnapshot.recovery[0].key, 'lbx_v2');
  });

  test('une erreur de quota ne fait pas remonter d exception applicative', (t) => {
    const window = loadAppInJsdom(t);
    const originalSetItem = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'lbx_v2') throw new window.DOMException('Quota dépassé', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
    t.after(() => { window.Storage.prototype.setItem = originalSetItem; });

    assert.doesNotThrow(() => window.saveHistory([{ title: 'Heat' }]));
    assert.equal(window.saveHistory([{ title: 'Heat' }]), false);
  });

  test('un brouillon corrompu est récupéré sans casser le formulaire', (t) => {
    const window = loadAppInJsdom(t);
    const raw = '{brouillon-casse';
    window.localStorage.setItem('lbx_draft', raw);

    assert.doesNotThrow(() => window.loadDraft());
    assert.equal(window.localStorage.getItem('lbx_draft'), raw);
    assert.equal(window.collectStorageRecovery().some(item => item.key === 'lbx_draft'), true);
  });

  test('réglages et plateformes passent par le registre validé', (t) => {
    const window = loadAppInJsdom(t);

    assert.equal(window.writeRegisteredStorage('settings', { theme: 'default' }), true);
    assert.equal(window.saveOwnedProviders(['Netflix']), true);
    assert.equal(JSON.stringify(window.readRegisteredStorage('settings', {})), JSON.stringify({ theme: 'default' }));
    assert.equal(JSON.stringify(window.loadOwnedProviders()), JSON.stringify(['Netflix']));
    assert.equal(window.writeRegisteredStorage('ownedProviders', { invalid: true }), false);
  });
});
