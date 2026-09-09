// Teste mergeWithRemote() (src/10-cloud-sync.js) — l'ORCHESTRATION de la
// synchro cloud, pas les fonctions de fusion pures qu'elle appelle (déjà
// couvertes par merge-logic.test.js). Zone signalée non couverte par l'audit :
// mergeWithRemote lit/écrit localStorage, appelle document.getElementById et
// renderAll(), donc ne peut pas se `require()` isolément comme
// 03b-pure-logic.js — elle a besoin d'un vrai DOM. Voir tests/helpers/load-app-in-jsdom.js.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

function freshWindow(t) {
  return loadAppInJsdom(t);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('mergeWithRemote (orchestration)', () => {
  test('historique local et distant distincts -> union persistée dans localStorage', async (t) => {
    const window = freshWindow(t);
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Dune', savedAt: daysAgo(5), updatedAt: daysAgo(5) },
    ]));

    const result = await window.mergeWithRemote({
      history: [{ title: 'Oppenheimer', savedAt: daysAgo(3), updatedAt: daysAgo(3) }],
    });

    // Array.from()/JSON.parse() ci-dessous : les valeurs sorties de jsdom sont
    // des tableaux d'un AUTRE REALM (leur Array.prototype diffère de celui de
    // Node) — assert.deepEqual échouerait sur la comparaison de prototype
    // malgré un contenu identique. On repasse par une chaîne pour comparer
    // uniquement les valeurs.
    const titles = result.history.map(m => m.title).sort().join(',');
    assert.equal(titles, 'Dune,Oppenheimer');

    // La fonction ne se contente pas de calculer : elle persiste réellement.
    const stored = JSON.parse(window.localStorage.getItem('lbx_v2'));
    assert.equal(stored.map(m => m.title).sort().join(','), 'Dune,Oppenheimer');
  });

  test('meme film modifie des deux cotes -> la version la plus recente (updatedAt) est celle persistee', async (t) => {
    const window = freshWindow(t);
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Dune', score: '7.0', savedAt: daysAgo(5), updatedAt: daysAgo(5) },
    ]));

    await window.mergeWithRemote({
      history: [{ title: 'Dune', score: '9.0', savedAt: daysAgo(5), updatedAt: daysAgo(1) }],
    });

    const stored = JSON.parse(window.localStorage.getItem('lbx_v2'));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].score, '9.0');
  });

  test('un film supprime localement (tombstone) ne revient pas via le distant', async (t) => {
    const window = freshWindow(t);
    // Local : plus aucun film, mais une trace de suppression pour "Dune".
    window.localStorage.setItem('lbx_v2', JSON.stringify([]));
    window.localStorage.setItem('lbx_history_tombstones', JSON.stringify([
      { key: 'dune', deletedAt: daysAgo(1) },
    ]));

    const result = await window.mergeWithRemote({
      // Le distant "ressuscite" Dune avec une version plus ancienne que la suppression.
      history: [{ title: 'Dune', savedAt: daysAgo(10), updatedAt: daysAgo(10) }],
    });

    assert.equal(result.history.find(m => m.title === 'Dune'), undefined);
    const stored = JSON.parse(window.localStorage.getItem('lbx_v2'));
    assert.equal(stored.find(m => m.title === 'Dune'), undefined);
  });

  test('payload distant vide ou absent ne fait rien perdre localement', async (t) => {
    const window = freshWindow(t);
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Parasite', savedAt: daysAgo(2), updatedAt: daysAgo(2) },
    ]));

    const result = await window.mergeWithRemote({});

    assert.equal(result.history.length, 1);
    assert.equal(result.history[0].title, 'Parasite');
  });

  test('watchlist par defaut : union locale/distante persistee sous la bonne cle', async (t) => {
    const window = freshWindow(t);
    window.localStorage.setItem('lbx_watchlist_default', JSON.stringify([
      { title: 'Dune', addedAt: daysAgo(5), updatedAt: daysAgo(5) },
    ]));

    await window.mergeWithRemote({
      watchlists: { default: [{ title: 'Oppenheimer', addedAt: daysAgo(3), updatedAt: daysAgo(3) }] },
    });

    const stored = JSON.parse(window.localStorage.getItem('lbx_watchlist_default'));
    assert.equal(stored.map(m => m.title).sort().join(','), 'Dune,Oppenheimer');
  });

  test('watchlist séries : union et persistance symétriques aux films', async (t) => {
    const window = freshWindow(t);
    window.localStorage.setItem('lbx_tv_watchlist_default', JSON.stringify([
      { title: 'Severance', tmdbId: 95396, addedAt: daysAgo(5) },
    ]));

    const result = await window.mergeWithRemote({
      tvWatchlists: { default: [{ title: 'The Bear', tmdbId: 136315, addedAt: daysAgo(3) }] },
    });

    const stored = JSON.parse(window.localStorage.getItem('lbx_tv_watchlist_default'));
    assert.equal(stored.map(item => item.title).sort().join(','), 'Severance,The Bear');
    assert.equal(result.tvWatchlists.default.length, 2);
  });

  test('analyses et plateformes absentes localement sont restaurées', async (t) => {
    const window = freshWindow(t);
    const result = await window.mergeWithRemote({
      analyses: [{ id: 'a1', filmId: 949, date: daysAgo(1), retour: { synthese: 'Précis' } }],
      ownedProviders: ['MUBI'],
    });

    assert.equal(JSON.parse(window.localStorage.getItem('lbx_analyses'))[0].id, 'a1');
    assert.equal(JSON.parse(window.localStorage.getItem('lbx_owned_providers'))[0], 'MUBI');
    assert.equal(result.analyses.length, 1);
  });
});
