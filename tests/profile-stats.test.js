// Tests des fonctions pures de l'onglet Profil : formatage du temps
// visionné, calcul de série (streak) hebdomadaire, et badges débloqués.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { formatWatchTime, getISOWeekKey, computeWeekStreak, computeDayStreak, computeBadges } = require('../src/03b-pure-logic.js');

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
  test('historique vide : aucun badge au palier I', () => {
    const badges = computeBadges([], {});
    assert.ok(badges.every(b => b.tier === 0));
  });
  test('10 films debloque le palier I du Critique mais pas le palier II', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ title: `Film ${i}` }));
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'critique').tier, 1);
  });
  test('100 films debloque le palier II du Critique', () => {
    const history = Array.from({ length: 100 }, (_, i) => ({ title: `Film ${i}` }));
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'critique').tier, 2);
  });
  test('genres multiples sur un meme film comptent chacun separement (le "Double Hit" du document)', () => {
    const history = [
      { genre: 'Action, Science-Fiction' },
      { genre: 'Action, Aventure' },
    ];
    const badges = computeBadges(history, {});
    const action = badges.find(b => b.id === 'genre_action');
    assert.equal(action.value, 2);
  });
  test('badge Marathonien (24h/100h/500h) selon le temps total', () => {
    const under = computeBadges([], { totalMinutes: 60 * 10 });
    assert.equal(under.find(b => b.id === 'marathonien').tier, 0);
    const palierI = computeBadges([], { totalMinutes: 60 * 25 });
    assert.equal(palierI.find(b => b.id === 'marathonien').tier, 1);
  });
  test('badge Fidelite selon le streak JOURNALIER fourni (pas hebdomadaire)', () => {
    const badges = computeBadges([], { dayStreak: 10 });
    assert.equal(badges.find(b => b.id === 'fidelite').tier, 2); // palier II = 10 jours
  });
  test('badge de genre : palier I a partir de 5 films dans ce genre', () => {
    const history = [
      { genre: 'Horreur' }, { genre: 'Horreur' }, { genre: 'Horreur' },
      { genre: 'Horreur' }, { genre: 'Horreur' }, // 5 films Horreur
      { genre: 'Comédie' }, { genre: 'Comédie' }, // seulement 2 Comédie
    ];
    const badges = computeBadges(history, {});
    const horreur = badges.find(b => b.id === 'genre_horreur');
    const comedie = badges.find(b => b.id === 'genre_comedie');
    assert.ok(horreur, 'le badge Horreur devrait exister');
    assert.equal(horreur.tier, 1);
    assert.equal(horreur.name, 'Livre des Morts'); // nom "flavor" du document
    assert.ok(comedie, 'le badge Comédie devrait exister (progres partiel)');
    assert.equal(comedie.tier, 0);
    assert.equal(comedie.value, 2);
  });
  test('un genre jamais explore ne genere pas de badge du tout', () => {
    const history = [{ genre: 'Horreur' }];
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'genre_western'), undefined);
  });
  test('limite a 8 badges de genre maximum, meme avec plus de genres explores', () => {
    const genres = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const history = genres.map(g => ({ genre: g }));
    const badges = computeBadges(history, {});
    const genreBadgeCount = badges.filter(b => b.id.startsWith('genre_')).length;
    assert.equal(genreBadgeCount, 8);
  });
  test('Chef-d\'Oeuvre et l\'Ame du Demon comptent les notes extremes', () => {
    const history = [
      { score: '9.5', savedAt: '2026-01-01' }, { score: '9.0', savedAt: '2026-01-02' },
      { score: '2.0', savedAt: '2026-01-03' },
      { score: '6.0', savedAt: '2026-01-04' },
    ];
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'chef_oeuvre').value, 2);
    assert.equal(badges.find(b => b.id === 'ame_demon').value, 1);
  });
  test('Coup de Foudre compte les films aimes', () => {
    const history = [{ liked: true }, { liked: true }, { liked: false }];
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'coup_foudre').value, 2);
  });
  test('Le Puriste compte la plus longue serie SANS coup de coeur', () => {
    const history = [
      { liked: false, savedAt: '2026-01-01' },
      { liked: false, savedAt: '2026-01-02' },
      { liked: true, savedAt: '2026-01-03' }, // casse la serie
      { liked: false, savedAt: '2026-01-04' },
      { liked: false, savedAt: '2026-01-05' },
      { liked: false, savedAt: '2026-01-06' },
    ];
    const badges = computeBadges(history, {});
    assert.equal(badges.find(b => b.id === 'puriste').value, 3); // la 2e serie (3), pas la 1ere (2)
  });
  test('Le Critique compte aussi les series notees (tvRatings)', () => {
    const history = Array.from({ length: 5 }, () => ({}));
    const badges = computeBadges(history, { tvRatings: Array.from({ length: 5 }, () => ({ score: '8.0' })) });
    assert.equal(badges.find(b => b.id === 'critique').tier, 1); // 5+5=10, palier I
  });
});

describe('computeDayStreak', () => {
  test('aucune activite -> 0', () => {
    assert.equal(computeDayStreak([], new Date('2026-01-10')), 0);
  });
  test('3 jours consecutifs jusqu\'a aujourd\'hui', () => {
    const history = [
      { savedAt: '2026-01-08T10:00:00.000Z' },
      { savedAt: '2026-01-09T10:00:00.000Z' },
      { savedAt: '2026-01-10T10:00:00.000Z' },
    ];
    assert.equal(computeDayStreak(history, new Date('2026-01-10T20:00:00.000Z')), 3);
  });
  test('un jour manquant casse le streak', () => {
    const history = [
      { savedAt: '2026-01-05T10:00:00.000Z' },
      { savedAt: '2026-01-10T10:00:00.000Z' },
    ];
    assert.equal(computeDayStreak(history, new Date('2026-01-10T20:00:00.000Z')), 1);
  });
});
