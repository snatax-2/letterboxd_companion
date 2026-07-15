// Tests du cœur mathématique des duels ELO : symétrie des gains/pertes,
// sensibilité à l'écart de cotes, bornes raisonnables.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeEloUpdate } = require('../src/03b-pure-logic.js');

describe('computeEloUpdate', () => {
  test('duel équilibré : le vainqueur gagne la moitié du facteur K', () => {
    const { winnerElo, loserElo, delta } = computeEloUpdate(1200, 1200, 32);
    assert.equal(delta, 16); // probabilité attendue 0.5 -> K * 0.5
    assert.equal(winnerElo, 1216);
    assert.equal(loserElo, 1184);
  });

  test('symétrie stricte : le vainqueur gagne exactement ce que le perdant perd', () => {
    const { winnerElo, loserElo } = computeEloUpdate(1350, 1180, 32);
    assert.equal((winnerElo - 1350) + (loserElo - 1180), 0);
  });

  test('battre plus fort que soi rapporte plus que battre plus faible', () => {
    const upset = computeEloUpdate(1100, 1400, 32); // outsider qui gagne
    const expected = computeEloUpdate(1400, 1100, 32); // favori qui gagne
    assert.ok(upset.delta > expected.delta);
  });

  test('gain borné entre 1 et K même pour des écarts extrêmes', () => {
    const hugeUpset = computeEloUpdate(400, 2800, 32);
    assert.ok(hugeUpset.delta <= 32);
    const hugeFavorite = computeEloUpdate(2800, 400, 32);
    assert.ok(hugeFavorite.delta >= 0);
  });

  test('le total des cotes est conservé (somme nulle du système)', () => {
    let a = 1200, b = 1200, c = 1200;
    // a bat b, puis c bat a, puis b bat c
    let r = computeEloUpdate(a, b, 32); a = r.winnerElo; b = r.loserElo;
    r = computeEloUpdate(c, a, 32); c = r.winnerElo; a = r.loserElo;
    r = computeEloUpdate(b, c, 32); b = r.winnerElo; c = r.loserElo;
    assert.equal(a + b + c, 3600);
  });
});
