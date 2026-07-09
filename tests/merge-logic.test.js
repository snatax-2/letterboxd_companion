// Tests de la logique de fusion de la synchro cloud (historique, watchlist,
// tombstones). C'est la logique la plus critique de l'app : une régression ici
// pourrait faire perdre des films silencieusement lors d'une synchro.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeHistory,
  mergeWatchlist,
  mergeTombstoneLists,
  historyItemKey,
  watchlistItemKey,
} = require('../src/03b-pure-logic.js');

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('mergeHistory', () => {
  test('deux films différents, un par appareil -> les deux sont conservés (union)', () => {
    const local = [{ title: 'Dune', savedAt: daysAgo(5), updatedAt: daysAgo(5) }];
    const remote = [{ title: 'Oppenheimer', savedAt: daysAgo(3), updatedAt: daysAgo(3) }];
    const result = mergeHistory(local, remote, []);
    const titles = result.map(m => m.title).sort();
    assert.deepEqual(titles, ['Dune', 'Oppenheimer']);
  });

  test('même film modifié des deux côtés -> la version la plus récente (updatedAt) gagne', () => {
    const local = [{ title: 'Dune', score: '7.0', savedAt: daysAgo(5), updatedAt: daysAgo(5) }];
    const remote = [{ title: 'Dune', score: '9.0', savedAt: daysAgo(5), updatedAt: daysAgo(1) }];
    const result = mergeHistory(local, remote, []);
    assert.equal(result.length, 1);
    assert.equal(result[0].score, '9.0');
  });

  test('la comparaison de titre ignore la casse', () => {
    const local = [{ title: 'Dune', savedAt: daysAgo(5), updatedAt: daysAgo(5) }];
    const remote = [{ title: 'dune', savedAt: daysAgo(5), updatedAt: daysAgo(1) }];
    const result = mergeHistory(local, remote, []);
    assert.equal(result.length, 1);
  });

  test('film supprimé (tombstone) plus récent que la dernière modif -> disparaît de la fusion', () => {
    const local = [];
    const remote = [{ title: 'Barbie', savedAt: daysAgo(10), updatedAt: daysAgo(10) }];
    const tombstones = [{ key: 'barbie', deletedAt: daysAgo(2) }];
    const result = mergeHistory(local, remote, tombstones);
    assert.equal(result.length, 0);
  });

  test('tombstone plus ANCIEN que la dernière modif -> le film reste', () => {
    const local = [];
    const remote = [{ title: 'Barbie', savedAt: daysAgo(10), updatedAt: daysAgo(1) }];
    const tombstones = [{ key: 'barbie', deletedAt: daysAgo(5) }];
    const result = mergeHistory(local, remote, tombstones);
    assert.equal(result.length, 1);
  });

  test('liste vide des deux côtés -> résultat vide, pas d\'erreur', () => {
    assert.deepEqual(mergeHistory([], [], []), []);
  });

  test('résultat trié du plus récent au plus ancien (savedAt)', () => {
    const local = [
      { title: 'Ancien film', savedAt: daysAgo(30), updatedAt: daysAgo(30) },
      { title: 'Film récent', savedAt: daysAgo(1), updatedAt: daysAgo(1) },
    ];
    const result = mergeHistory(local, [], []);
    assert.deepEqual(result.map(m => m.title), ['Film récent', 'Ancien film']);
  });
});

describe('mergeWatchlist', () => {
  test('même film (même tmdbId) ajouté des deux côtés -> pas de doublon', () => {
    const local = [{ title: 'Dune 2', tmdbId: 693134, addedAt: daysAgo(3) }];
    const remote = [{ title: 'Dune 2', tmdbId: 693134, addedAt: daysAgo(1) }];
    const result = mergeWatchlist(local, remote, []);
    assert.equal(result.length, 1);
  });

  test('films différents des deux côtés -> union complète', () => {
    const local = [{ title: 'Dune 2', tmdbId: 1, addedAt: daysAgo(3) }];
    const remote = [{ title: 'Poor Things', tmdbId: 2, addedAt: daysAgo(1) }];
    const result = mergeWatchlist(local, remote, []);
    assert.equal(result.length, 2);
  });

  test('film retiré (tombstone) sur un appareil -> ne réapparaît pas via l\'autre', () => {
    const local = [];
    const remote = [{ title: 'Madame Web', tmdbId: 42, addedAt: daysAgo(10) }];
    const tombstones = [{ key: 'id:42', deletedAt: daysAgo(2) }];
    const result = mergeWatchlist(local, remote, tombstones);
    assert.equal(result.length, 0);
  });

  test('film sans tmdbId -> clé de secours par titre', () => {
    const local = [{ title: 'Film obscur', tmdbId: null, addedAt: daysAgo(3) }];
    const remote = [{ title: 'Film obscur', tmdbId: null, addedAt: daysAgo(1) }];
    const result = mergeWatchlist(local, remote, []);
    assert.equal(result.length, 1);
  });
});

describe('mergeTombstoneLists', () => {
  test('même clé des deux côtés -> garde la date de suppression la plus récente', () => {
    const recentDate = daysAgo(1);
    const a = [{ key: 'x', deletedAt: daysAgo(5) }];
    const b = [{ key: 'x', deletedAt: recentDate }];
    const result = mergeTombstoneLists(a, b);
    assert.equal(result.length, 1);
    assert.equal(result[0].deletedAt, recentDate);
  });

  test('tombstone de plus de 90 jours -> purgée automatiquement', () => {
    const old = [{ key: 'vieux-film', deletedAt: daysAgo(200) }];
    const result = mergeTombstoneLists(old, []);
    assert.equal(result.length, 0);
  });

  test('tombstone récente (< 90 jours) -> conservée', () => {
    const recent = [{ key: 'film-recent', deletedAt: daysAgo(10) }];
    const result = mergeTombstoneLists(recent, []);
    assert.equal(result.length, 1);
  });
});

describe('clés d\'identité', () => {
  test('historyItemKey : insensible à la casse', () => {
    assert.equal(historyItemKey({ title: 'Interstellar' }), historyItemKey({ title: 'INTERSTELLAR' }));
  });

  test('watchlistItemKey : préfère tmdbId au titre quand disponible', () => {
    assert.equal(watchlistItemKey({ title: 'A', tmdbId: 99 }), watchlistItemKey({ title: 'B', tmdbId: 99 }));
  });

  test('watchlistItemKey : retombe sur le titre si pas de tmdbId', () => {
    assert.equal(watchlistItemKey({ title: 'Sans ID' }), 'title:sans id');
  });
});
