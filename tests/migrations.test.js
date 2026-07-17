// Tests de la normalisation v2 des items d'historique. La propriété la plus
// importante : l'IDEMPOTENCE — rejouer la migration ne change rien, ce qui
// protège contre les doubles exécutions et rend la chaîne sûre par construction.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { normalizeHistoryItemV2 } = require('../src/03b-pure-logic.js');

describe('normalizeHistoryItemV2', () => {
  test('complete savedAt depuis la date de visionnage', () => {
    const out = normalizeHistoryItemV2({ title: 'Alien', date: '2024-03-01' });
    assert.equal(out.savedAt, '2024-03-01T12:00:00.000Z');
  });

  test('sans date du tout : epoque neutre (pas "maintenant", qui fausserait les tris)', () => {
    const out = normalizeHistoryItemV2({ title: 'Alien' });
    assert.equal(out.savedAt, '1970-01-01T00:00:00.000Z');
  });

  test('garantit values comme objet', () => {
    assert.deepEqual(normalizeHistoryItemV2({ title: 'X' }).values, {});
    assert.deepEqual(normalizeHistoryItemV2({ title: 'X', values: null }).values, {});
    const kept = normalizeHistoryItemV2({ title: 'X', values: { quick: 4 } });
    assert.deepEqual(kept.values, { quick: 4 });
  });

  test('title toujours une chaine, meme depuis un import casse', () => {
    assert.equal(normalizeHistoryItemV2({ title: null }).title, '');
    assert.equal(normalizeHistoryItemV2({ title: 42 }).title, '42');
  });

  test('IDEMPOTENCE : normaliser deux fois = normaliser une fois', () => {
    const inputs = [
      { title: 'Alien', date: '2024-03-01' },
      { title: 'Complet', savedAt: '2023-01-01T00:00:00.000Z', values: { quick: 3 }, date: '2023-01-01' },
      { title: null },
      { title: 'Sans rien' },
    ];
    for (const input of inputs) {
      const once = normalizeHistoryItemV2(input);
      const twice = normalizeHistoryItemV2(once);
      assert.deepEqual(twice, once);
    }
  });

  test('ne mute pas l\'original', () => {
    const input = { title: 'Alien' };
    normalizeHistoryItemV2(input);
    assert.equal(input.savedAt, undefined);
  });
});
