// Tests des fonctions pures de l'onglet Profil : formatage du temps
// visionné, calcul de série (streak) hebdomadaire, et badges débloqués.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { formatWatchTime, getISOWeekKey, computeWeekStreak, computeBadges } = require('../src/03b-pure-logic.js');

describe('formatWatchTime', () => {
  test('0 minute -> tiret', () => {
    assert.equal(formatWatchTime(0), '—');
  });
  test('moins d\'une heure -> "0 h"', () => {
    assert.equal(formatWatchTime(45), '0 h');
  });
  test('quelques heures, pas de jour entier', () => {
    assert.equal(formatWatchTime(150), '2 h'); // 2h30 arrondi a l'heure
  });
  test('jours et heures combines', () => {
    assert.equal(formatWatchTime(60 * 30), '1 j 6 h'); // 30h = 1j + 6h
  });
  test('jours pile, pas d\'heures affichees', () => {
    assert.equal(formatWatchTime(60 * 48), '2 j');
  });
});

describe('getISOWeekKey', () => {
  test('deux dates de la meme semaine ISO donnent la meme cle', () => {
    const lundi = new Date('2026-01-05'); // un lundi
    const dimanche = new Date('2026-01-11'); // le dimanche suivant, meme semaine ISO
    assert.equal(getISOWeekKey(lundi), getISOWeekKey(dimanche));
  });
  test('deux dates de semaines differentes donnent des cles differentes', () => {
    const semaine1 = new Date('2026-01-05');
    const semaine2 = new Date('2026-01-12');
    assert.notEqual(getISOWeekKey(semaine1), getISOWeekKey(semaine2));
  });
});

describe('computeWeekStreak', () => {
  test('aucun historique -> streak 0', () => {
    assert.equal(computeWeekStreak([], new Date('2026-01-15')), 0);
  });
  test('un film cette semaine seulement -> streak 1', () => {
    const ref = new Date('2026-01-15'); // jeudi
    const history = [{ savedAt: '2026-01-13' }]; // meme semaine (mardi)
    assert.equal(computeWeekStreak(history, ref), 1);
  });
  test('3 semaines consecutives -> streak 3', () => {
    const ref = new Date('2026-01-15'); // semaine du 12-18 janvier
    const history = [
      { savedAt: '2026-01-13' }, // semaine de ref
      { savedAt: '2026-01-06' }, // semaine precedente
      { savedAt: '2025-12-30' }, // encore avant
    ];
    assert.equal(computeWeekStreak(history, ref), 3);
  });
  test('une semaine manquante interrompt la serie', () => {
    const ref = new Date('2026-01-15');
    const history = [
      { savedAt: '2026-01-13' }, // semaine de ref
      // semaine du 5-11 janvier : rien
      { savedAt: '2025-12-30' }, // semaine encore avant : ne compte pas, la chaine est cassee
    ];
    assert.equal(computeWeekStreak(history, ref), 1);
  });
  test('la semaine en cours sans activite -> streak 0 (pas de faux positif)', () => {
    const ref = new Date('2026-01-15');
    const history = [{ savedAt: '2026-01-06' }]; // semaine precedente seulement
    assert.equal(computeWeekStreak(history, ref), 0);
  });
});

describe('computeBadges', () => {
  test('historique vide : aucun badge debloque', () => {
    const badges = computeBadges([], {});
    assert.ok(badges.every(b => !b.unlocked));
  });
  test('10 films debloque le badge correspondant mais pas 50', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ title: `Film ${i}` }));
    const badges = computeBadges(history, {});
    assert.ok(badges.find(b => b.id === 'films_10').unlocked);
    assert.ok(!badges.find(b => b.id === 'films_50').unlocked);
  });
  test('genres distincts comptes correctement (insensible aux espaces)', () => {
    const history = [
      { genre: 'Action, Aventure' },
      { genre: 'Comédie' },
      { genre: 'Drame, Action' }, // Action deja compte, ne double pas
      { genre: 'Horreur' },
      { genre: 'Thriller' },
    ];
    const badges = computeBadges(history, {});
    // genres distincts : Action, Aventure, Comédie, Drame, Horreur, Thriller = 6
    assert.ok(badges.find(b => b.id === 'genres_5').unlocked);
    assert.ok(!badges.find(b => b.id === 'genres_10').unlocked);
  });
  test('badge marathon (24h) et cinephile (7j) selon le temps total', () => {
    const under = computeBadges([], { totalMinutes: 60 * 10 });
    assert.ok(!under.find(b => b.id === 'marathon').unlocked);
    const marathon = computeBadges([], { totalMinutes: 60 * 25 });
    assert.ok(marathon.find(b => b.id === 'marathon').unlocked);
    assert.ok(!marathon.find(b => b.id === 'cinephile').unlocked);
    const cinephile = computeBadges([], { totalMinutes: 60 * 24 * 8 });
    assert.ok(cinephile.find(b => b.id === 'cinephile').unlocked);
  });
  test('badge streak selon le nombre de semaines fourni', () => {
    const badges = computeBadges([], { streak: 5 });
    assert.ok(badges.find(b => b.id === 'streak_4').unlocked);
  });

  test('badge de genre debloque a partir de 5 films dans ce genre', () => {
    const history = [
      { genre: 'Horreur' }, { genre: 'Horreur' }, { genre: 'Horreur' },
      { genre: 'Horreur' }, { genre: 'Horreur' }, // 5 films Horreur
      { genre: 'Comédie' }, { genre: 'Comédie' }, // seulement 2 Comédie
    ];
    const badges = computeBadges(history, {});
    const horreur = badges.find(b => b.id === 'genre_horreur');
    const comedie = badges.find(b => b.id === 'genre_comedie');
    assert.ok(horreur, 'le badge Horreur devrait exister');
    assert.equal(horreur.unlocked, true);
    assert.ok(comedie, 'le badge Comédie devrait exister (progres partiel)');
    assert.equal(comedie.unlocked, false);
    assert.ok(comedie.label.includes('2/5'));
  });

  test('pas de badge de genre pour un genre jamais regarde', () => {
    const history = [{ genre: 'Action' }];
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'genre_western'), undefined);
  });

  test('genres multiples sur un meme film comptent chacun separement', () => {
    const history = [
      { genre: 'Action, Science-Fiction' },
      { genre: 'Action, Aventure' },
    ];
    const badges = computeBadges(history, {});
    const action = badges.find(b => b.id === 'genre_action');
    assert.ok(action.label.includes('2/5'));
  });

  test('limite a 8 badges de genre maximum, meme avec plus de genres explores', () => {
    const genres = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const history = genres.map(g => ({ genre: g }));
    const badges = computeBadges(history, {});
    const genreBadgeCount = badges.filter(b => b.id.startsWith('genre_')).length;
    assert.equal(genreBadgeCount, 8);
  });
});
