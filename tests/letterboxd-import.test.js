// Tests du parseur CSV et du mapping Letterboxd -> historique Ludex.
// Les cas piégeux : titres avec virgules ("Paris, Texas"), guillemets
// doublés, colonnes dans un ordre différent, notes absentes.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { parseCsv, mapLetterboxdCsv } = require('../src/03b-pure-logic.js');

describe('parseCsv', () => {
  test('ligne simple', () => {
    assert.deepEqual(parseCsv('a,b,c'), [['a', 'b', 'c']]);
  });
  test('champ entre guillemets contenant une virgule', () => {
    assert.deepEqual(parseCsv('Date,"Paris, Texas",1984'), [['Date', 'Paris, Texas', '1984']]);
  });
  test('guillemets doublés dans un champ', () => {
    assert.deepEqual(parseCsv('"Il a dit ""bonjour""",x'), [['Il a dit "bonjour"', 'x']]);
  });
  test('plusieurs lignes avec fins de ligne windows (CRLF)', () => {
    assert.deepEqual(parseCsv('a,b\r\nc,d'), [['a', 'b'], ['c', 'd']]);
  });
  test('retour à la ligne DANS un champ entre guillemets', () => {
    assert.deepEqual(parseCsv('"ligne1\nligne2",x'), [['ligne1\nligne2', 'x']]);
  });
  test('ligne vide finale ignorée', () => {
    assert.deepEqual(parseCsv('a,b\n'), [['a', 'b']]);
  });
});

describe('mapLetterboxdCsv', () => {
  test('diary.csv : colonnes standard, note /5 convertie en /10', () => {
    const rows = parseCsv(
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2024-01-15,Oppenheimer,2023,https://boxd.it/abc,4.5,,,2024-01-14\n'
    );
    const { items, kind } = mapLetterboxdCsv(rows);
    assert.equal(kind, 'diary');
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Oppenheimer');
    assert.equal(items[0].year, '2023');
    assert.equal(items[0].score, '9.0');
    assert.equal(items[0].values.quick, 4.5);
    assert.equal(items[0].date, '2024-01-14'); // Watched Date prioritaire sur Date
    assert.equal(items[0].importedFrom, 'letterboxd');
  });

  test('ratings.csv : sans Watched Date, la colonne Date sert de date', () => {
    const rows = parseCsv(
      'Date,Name,Year,Letterboxd URI,Rating\n' +
      '2023-06-10,"Paris, Texas",1984,uri,5\n'
    );
    const { items, kind } = mapLetterboxdCsv(rows);
    assert.equal(kind, 'ratings');
    assert.equal(items[0].title, 'Paris, Texas');
    assert.equal(items[0].score, '10.0');
    assert.equal(items[0].date, '2023-06-10');
  });

  test('watched.csv : pas de note du tout -> score vide, pas de values.quick', () => {
    const rows = parseCsv(
      'Date,Name,Year,Letterboxd URI\n' +
      '2022-03-01,Alien,1979,uri\n'
    );
    const { items, kind } = mapLetterboxdCsv(rows);
    assert.equal(kind, 'watched');
    assert.equal(items[0].score, '');
    assert.deepEqual(items[0].values, {});
  });

  test('CSV quelconque sans colonne Name -> rejeté proprement', () => {
    const rows = parseCsv('foo,bar\n1,2\n');
    const { items, kind } = mapLetterboxdCsv(rows);
    assert.equal(kind, null);
    assert.equal(items.length, 0);
  });

  test('lignes sans titre comptées comme ignorées', () => {
    const rows = parseCsv('Name,Year,Rating\nAlien,1979,4\n,,\n');
    const { items, skipped } = mapLetterboxdCsv(rows);
    assert.equal(items.length, 1);
    assert.equal(skipped, 1);
  });
});
