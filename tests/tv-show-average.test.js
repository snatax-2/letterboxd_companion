// Tests de computeShowAverageScore (note globale d'une série — Phase 3 du
// module Séries) : moyenne des saisons NOTÉES uniquement, jamais stockée,
// toujours recalculée. Lance avec : npm test

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeShowAverageScore } = require('../src/03b-pure-logic.js');

describe('computeShowAverageScore', () => {
  test('null si la série n\'a aucune saison', () => {
    assert.equal(computeShowAverageScore({ seasons: {} }), null);
  });

  test('null si aucune saison n\'est notée', () => {
    const show = { seasons: { '1': { watchedEpisodes: [1, 2], totalEpisodes: 8 } } };
    assert.equal(computeShowAverageScore(show), null);
  });

  test('une seule saison notée : la moyenne est sa propre note', () => {
    const show = { seasons: { '1': { rating: { score: '8.5' } } } };
    assert.equal(computeShowAverageScore(show), 8.5);
  });

  test('plusieurs saisons notées : vraie moyenne', () => {
    const show = { seasons: {
      '1': { rating: { score: '10.0' } },
      '2': { rating: { score: '6.0' } },
    } };
    assert.equal(computeShowAverageScore(show), 8.0);
  });

  test('une saison NON notée n\'entre pas dans la moyenne (pas comptée comme 0)', () => {
    const show = { seasons: {
      '1': { rating: { score: '10.0' } },
      '2': { rating: { score: '6.0' } },
      '3': { watchedEpisodes: [1], totalEpisodes: 8 }, // suivie mais pas notée
    } };
    assert.equal(computeShowAverageScore(show), 8.0); // pas 5.33
  });

  test('null/undefined en entrée ne plante pas', () => {
    assert.equal(computeShowAverageScore(null), null);
    assert.equal(computeShowAverageScore(undefined), null);
  });
});
