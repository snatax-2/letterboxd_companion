// Tests de computeCriteriaAverages : moyennes personnelles par critère,
// utilisées à la fois pour le repère sur les sliders et pour le radar
// (voir tests/description-tiers.test.js et src/06-history.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeCriteriaAverages } = require('../src/03b-pure-logic.js');

const CRITERIA = ['scenario', 'realisation', 'photo', 'acteurs', 'ambiance', 'rythme', 'affect'];

describe('computeCriteriaAverages', () => {
  test('calcule une moyenne simple sur plusieurs films', () => {
    const history = [
      { mode: 'detail', values: { scenario: 8, realisation: 6, photo: 7, acteurs: 8, ambiance: 6, rythme: 7, affect: 9 } },
      { mode: 'detail', values: { scenario: 6, realisation: 8, photo: 5, acteurs: 6, ambiance: 8, rythme: 5, affect: 7 } },
    ];
    const avgs = computeCriteriaAverages(history, CRITERIA);
    assert.equal(avgs.scenario, 7);
    assert.equal(avgs.affect, 8);
  });

  test('un ancien film sans un critère (ex: "rythme" avant son ajout) ne fausse pas sa moyenne', () => {
    const history = [
      { mode: 'detail', values: { scenario: 8, realisation: 6, photo: 7, acteurs: 8, ambiance: 6, rythme: 7, affect: 9 } },
      { mode: 'detail', values: { scenario: 6, realisation: 8, photo: 5, acteurs: 6, ambiance: 8, affect: 7 } }, // pas de rythme
    ];
    const avgs = computeCriteriaAverages(history, CRITERIA);
    assert.equal(avgs.rythme, 7); // moyenne du seul film qui a une valeur, pas affectée par l'absence de l'autre
    assert.equal(Number.isNaN(avgs.rythme), false);
  });

  test('aucun film noté en détail -> toutes les moyennes sont null (pas 0, pas NaN)', () => {
    const history = [{ mode: 'quick', values: { quick: 4 } }];
    const avgs = computeCriteriaAverages(history, CRITERIA);
    CRITERIA.forEach(c => assert.equal(avgs[c], null));
  });

  test('les entrées en mode rapide ("quick") sont ignorées', () => {
    const history = [
      { mode: 'detail', values: { scenario: 10, realisation: 10, photo: 10, acteurs: 10, ambiance: 10, rythme: 10, affect: 10 } },
      { mode: 'quick', values: { quick: 5 } },
    ];
    const avgs = computeCriteriaAverages(history, CRITERIA);
    assert.equal(avgs.scenario, 10); // pas influencé par l'entrée "quick"
  });

  test('historique vide -> toutes les moyennes sont null', () => {
    const avgs = computeCriteriaAverages([], CRITERIA);
    CRITERIA.forEach(c => assert.equal(avgs[c], null));
  });
});
