// Tests de computeFeaturedTiers() — regroupement des coups de cœur
// consécutifs pour la grille Historique base 6 (voir 03b-pure-logic.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeFeaturedTiers } = require('../src/03b-pure-logic.js');

// Helper : items simplifiés {liked} pour ces tests — la fonction ne
// s'intéresse qu'au résultat de isFeaturedFn, pas à la forme réelle des items.
function items(pattern) {
  // pattern ex: 'nfnff' -> n=normal, f=featured
  return pattern.split('').map(c => ({ liked: c === 'f' }));
}
const isFeatured = (item) => item.liked;

describe('computeFeaturedTiers', () => {
  test('liste vide', () => {
    assert.deepEqual(computeFeaturedTiers([], isFeatured), []);
  });

  test('aucune vedette -> tout en normal', () => {
    const tiers = computeFeaturedTiers(items('nnnn'), isFeatured);
    assert.deepEqual(tiers, ['normal', 'normal', 'normal', 'normal']);
  });

  test('vedette isolée AU MILIEU -> isolated (66%), pas banner', () => {
    const tiers = computeFeaturedTiers(items('nfnn'), isFeatured);
    assert.deepEqual(tiers, ['normal', 'isolated', 'normal', 'normal']);
  });

  test('vedette isolée EN TOUTE FIN de groupe -> banner (rien pour combler le tiers restant)', () => {
    const tiers = computeFeaturedTiers(items('nnf'), isFeatured);
    assert.deepEqual(tiers, ['normal', 'normal', 'banner']);
  });

  test('vedette isolée en tout DÉBUT (mais pas seule dans la liste) -> isolated, pas banner', () => {
    const tiers = computeFeaturedTiers(items('fnn'), isFeatured);
    assert.deepEqual(tiers, ['isolated', 'normal', 'normal']);
  });

  test('une seule vedette et RIEN d\'autre dans le groupe -> banner (cas limite de "fin de groupe")', () => {
    const tiers = computeFeaturedTiers(items('f'), isFeatured);
    assert.deepEqual(tiers, ['banner']);
  });

  test('paire consécutive (nombre pair) -> pair/pair', () => {
    const tiers = computeFeaturedTiers(items('nffn'), isFeatured);
    assert.deepEqual(tiers, ['normal', 'pair', 'pair', 'normal']);
  });

  test('quatre consécutives (pair) -> deux paires', () => {
    const tiers = computeFeaturedTiers(items('ffff'), isFeatured);
    assert.deepEqual(tiers, ['pair', 'pair', 'pair', 'pair']);
  });

  test('trio consécutif (impair) -> le premier absorbe en banner, les 2 suivants en paire', () => {
    const tiers = computeFeaturedTiers(items('fffn'), isFeatured);
    assert.deepEqual(tiers, ['banner', 'pair', 'pair', 'normal']);
  });

  test('cinq consécutives (impair) -> premier en banner, puis deux paires', () => {
    const tiers = computeFeaturedTiers(items('fffffn'), isFeatured);
    assert.deepEqual(tiers, ['banner', 'pair', 'pair', 'pair', 'pair', 'normal']);
  });

  test('deux groupes de vedettes séparés par du normal -> traités indépendamment', () => {
    const tiers = computeFeaturedTiers(items('fnnff'), isFeatured);
    assert.deepEqual(tiers, ['isolated', 'normal', 'normal', 'pair', 'pair']);
  });

  test('exactement le cas signalé par l\'utilisateur (2 coups de cœur consécutifs, School of Rock + Pacific Rim)', () => {
    const tiers = computeFeaturedTiers(items('nffn'), isFeatured);
    assert.equal(tiers[1], 'pair');
    assert.equal(tiers[2], 'pair');
  });

  test('ne réordonne jamais les items — même longueur, même position que l\'entrée', () => {
    const input = items('nfnffn');
    const tiers = computeFeaturedTiers(input, isFeatured);
    assert.equal(tiers.length, input.length);
  });

  test('fonctionne avec un isFeaturedFn basé sur la note (pas seulement liked)', () => {
    const withScores = [{ score: '6.0' }, { score: '9.0' }, { score: '9.2' }, { score: '5.0' }];
    const tiers = computeFeaturedTiers(withScores, item => parseFloat(item.score) >= 8.5);
    assert.deepEqual(tiers, ['normal', 'pair', 'pair', 'normal']);
  });
});
