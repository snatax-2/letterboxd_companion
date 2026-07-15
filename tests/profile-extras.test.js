// Tests des calculs des cartes Profil : compte quotidien (heatmap),
// statistiques par décennie, et retrouvailles "il y a un an".
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeDailyCounts, computeDecadeStats, findOneYearAgoFilm } = require('../src/03b-pure-logic.js');

describe('computeDailyCounts', () => {
  test('regroupe par jour, plusieurs films le même jour additionnés', () => {
    const counts = computeDailyCounts([
      { date: '2026-01-05' }, { date: '2026-01-05' }, { date: '2026-01-06' }, { date: '' },
    ]);
    assert.deepEqual(counts, { '2026-01-05': 2, '2026-01-06': 1 });
  });
});

describe('computeDecadeStats', () => {
  test('regroupe par décennie avec moyenne, trié par compte décroissant', () => {
    const stats = computeDecadeStats([
      { year: '1994', score: '8.0' }, { year: '1999', score: '9.0' },
      { year: '2023', score: '7.0' },
      { year: 'n/a', score: '5.0' }, // année invalide, ignoré
    ]);
    assert.equal(stats.length, 2);
    assert.equal(stats[0].decade, 1990);
    assert.equal(stats[0].count, 2);
    assert.equal(stats[0].avg, 8.5);
    assert.equal(stats[1].decade, 2020);
  });
  test('films sans note : comptés mais moyenne nulle', () => {
    const stats = computeDecadeStats([{ year: '1975', score: '' }]);
    assert.equal(stats[0].count, 1);
    assert.equal(stats[0].avg, null);
  });
});

describe('findOneYearAgoFilm', () => {
  test('trouve le film au jour exact d\'il y a un an', () => {
    const r = findOneYearAgoFilm([{ title: 'Alien', date: '2025-07-15' }], new Date('2026-07-15T12:00:00Z'));
    assert.equal(r.item.title, 'Alien');
  });
  test('élargit jusqu\'à ±3 jours si rien au jour exact', () => {
    const r = findOneYearAgoFilm([{ title: 'Seven', date: '2025-07-12' }], new Date('2026-07-15T12:00:00Z'));
    assert.equal(r.item.title, 'Seven');
  });
  test('au-delà de ±3 jours : rien', () => {
    const r = findOneYearAgoFilm([{ title: 'Heat', date: '2025-07-08' }], new Date('2026-07-15T12:00:00Z'));
    assert.equal(r, null);
  });
});
