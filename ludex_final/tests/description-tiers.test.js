// Tests de getDesc (texte descriptif par palier + qualificatif bas/haut de
// fourchette). Couvre en particulier le bug de bord découvert à la valeur
// maximale (10.0), où le qualificatif se calculait à partir de la valeur
// testée elle-même au lieu d'une borne fixe.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { getDesc, DESCS } = require('../src/03b-pure-logic.js');

describe('getDesc - paliers de base', () => {
  test('renvoie le texte du palier correspondant', () => {
    const text = getDesc('scenario', 8.0);
    assert.equal(text.includes('(plutôt'), true); // doit inclure un qualificatif
    assert.equal(text.startsWith(DESCS.scenario.find(([t]) => t === 7.5)[1]), true);
  });

  test('toutes les valeurs de 0 à 10 par pas de 0.5 renvoient un texte non vide', () => {
    for (const criterion of Object.keys(DESCS)) {
      for (let v = 0; v <= 10; v += 0.5) {
        const text = getDesc(criterion, v);
        assert.ok(text && text.length > 0, `${criterion} @ ${v} devrait avoir un texte`);
      }
    }
  });
});

describe('getDesc - qualificatif bas/haut de fourchette', () => {
  test('valeur basse d\'un palier -> qualificatif "bas"', () => {
    // Palier 8.5 couvre {8.5, 9.0} : 8.5 est la valeur basse
    assert.ok(getDesc('scenario', 8.5).includes('bas dans cette tranche'));
  });

  test('valeur haute d\'un palier -> qualificatif "haut"', () => {
    // Palier 8.5 couvre {8.5, 9.0} : 9.0 est la valeur haute
    assert.ok(getDesc('scenario', 9.0).includes('haut dans cette tranche'));
  });

  test('RÉGRESSION : la valeur maximale (10.0) doit être "haut", pas médiane', () => {
    // Bug corrigé : la borne haute du palier le plus élevé était calculée à
    // partir de la valeur testée elle-même (val + 1), ce qui donnait un
    // résultat incohérent précisément à val=10 (la borne théorique). Elle est
    // maintenant fixe (thresh + 1), indépendante de la valeur testée.
    const text = getDesc('scenario', 10.0);
    assert.ok(text.includes('haut dans cette tranche'), `Attendu "haut", reçu : ${text}`);
    assert.equal(text.includes('bas dans cette tranche'), false);
  });

  test('valeur médiane du dernier palier (0.5, qui couvre {0, 0.5, 1.0}) -> pas de qualificatif', () => {
    const text = getDesc('scenario', 0.5);
    assert.equal(text.includes('bas dans cette tranche'), false);
    assert.equal(text.includes('haut dans cette tranche'), false);
  });

  test('bornes du dernier palier (0 et 1.0) -> qualificatifs bas/haut respectifs', () => {
    assert.ok(getDesc('scenario', 0).includes('bas dans cette tranche'));
    assert.ok(getDesc('scenario', 1.0).includes('haut dans cette tranche'));
  });

  test('cohérent sur les 7 critères, pas seulement "scenario"', () => {
    for (const criterion of Object.keys(DESCS)) {
      assert.ok(getDesc(criterion, 10.0).includes('haut dans cette tranche'), `${criterion} @ 10.0`);
    }
  });
});
