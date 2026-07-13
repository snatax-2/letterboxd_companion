// Tests du calcul de score (mode rapide et mode détaillé).
// Lance avec : npm test  (ou directement : node --test tests/)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  computeQuickScore,
  computeWeightedScore,
  scoreToStars,
  getStarStr,
} = require('../src/03b-pure-logic.js');

describe('computeQuickScore (mode rapide, étoiles -> /10)', () => {
  test('5 étoiles = 10/10', () => {
    assert.equal(computeQuickScore(5), 10);
  });

  test('0.5 étoile = 1/10', () => {
    assert.equal(computeQuickScore(0.5), 1);
  });

  test('3.5 étoiles = 7/10', () => {
    assert.equal(computeQuickScore(3.5), 7);
  });
});

describe('computeWeightedScore (mode détaillé, moyenne pondérée)', () => {
  test('poids égaux (1) -> simple moyenne arithmétique', () => {
    const values = { scenario: 8, realisation: 6, photo: 10, acteurs: 4 };
    const weights = { scenario: 1, realisation: 1, photo: 1, acteurs: 1 };
    assert.equal(computeWeightedScore(values, weights), 7);
  });

  test('un critère à poids plus élevé influence davantage la moyenne', () => {
    const values = { scenario: 10, realisation: 0 };
    const weights = { scenario: 3, realisation: 1 };
    assert.equal(computeWeightedScore(values, weights), 7.5);
  });

  test('tous les critères notés pareil -> le score = cette note, peu importe les poids', () => {
    const values = { scenario: 6, realisation: 6, photo: 6 };
    const weights = { scenario: 5, realisation: 1, photo: 0.5 };
    assert.equal(computeWeightedScore(values, weights), 6);
  });

  test('poids manquant pour un critère -> traité comme poids 1 par défaut', () => {
    const values = { scenario: 10, realisation: 0 };
    const weights = { scenario: 1 };
    assert.equal(computeWeightedScore(values, weights), 5);
  });

  test('objet de valeurs vide -> retombe sur 5 par défaut (évite une division par zéro)', () => {
    assert.equal(computeWeightedScore({}, {}), 5);
  });
});

describe('scoreToStars (score /10 -> étoiles, pas de 0.5)', () => {
  test('10/10 -> 5 étoiles', () => {
    assert.equal(scoreToStars(10), 5);
  });
  test('0/10 -> 0 étoile', () => {
    assert.equal(scoreToStars(0), 0);
  });
  test('7.4/10 arrondit à 3.5 étoiles', () => {
    assert.equal(scoreToStars(7.4), 3.5);
  });
  test('7.6/10 arrondit à 4 étoiles', () => {
    assert.equal(scoreToStars(7.6), 4);
  });
});

describe('getStarStr (affichage ★★★½)', () => {
  test('5 étoiles pleines', () => {
    assert.equal(getStarStr(5), '★★★★★');
  });
  test('0 étoile -> affiche quand même un demi-symbole (jamais vide)', () => {
    assert.equal(getStarStr(0), '½');
  });
  test('3.5 étoiles -> 3 pleines + un demi', () => {
    assert.equal(getStarStr(3.5), '★★★½');
  });
  test('2 étoiles pleines, pas de demi', () => {
    assert.equal(getStarStr(2), '★★');
  });
});
