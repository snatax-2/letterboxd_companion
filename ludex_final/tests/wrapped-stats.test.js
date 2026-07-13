// Tests de computeWrappedStats — rétrospective annuelle ("Wrapped").
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeWrappedStats } = require('../src/03b-pure-logic.js');

describe('computeWrappedStats', () => {
  test('historique vide -> tout à zéro/null, pas d\'erreur', () => {
    const stats = computeWrappedStats([], 2026);
    assert.equal(stats.totalFilms, 0);
    assert.equal(stats.avgScore, 0);
    assert.equal(stats.topGenre, null);
    assert.equal(stats.bestRated, null);
    assert.equal(stats.totalMinutes, 0);
  });

  test('filtre correctement par année (ignore les autres années)', () => {
    const history = [
      { title: 'Film 2025', score: '7.0', savedAt: '2025-06-01T10:00:00Z' },
      { title: 'Film 2026 A', score: '8.0', savedAt: '2026-01-01T10:00:00Z' },
      { title: 'Film 2026 B', score: '6.0', savedAt: '2026-03-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.totalFilms, 2);
  });

  test('moyenne calculée uniquement sur les films de l\'année filtrée', () => {
    const history = [
      { title: 'A', score: '10.0', savedAt: '2026-01-01T10:00:00Z' },
      { title: 'B', score: '6.0', savedAt: '2026-02-01T10:00:00Z' },
      { title: 'Hors annee', score: '0.0', savedAt: '2020-01-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.avgScore, 8); // (10+6)/2, le film hors annee est ignore
  });

  test('genre/réalisateur/acteur les plus fréquents sont bien identifiés', () => {
    const history = [
      { title: 'A', score: '7', savedAt: '2026-01-01T10:00:00Z', genre: 'Action, Aventure', director: 'Realisateur X', actors: 'Acteur A, Acteur B' },
      { title: 'B', score: '8', savedAt: '2026-02-01T10:00:00Z', genre: 'Action', director: 'Realisateur X', actors: 'Acteur A' },
      { title: 'C', score: '6', savedAt: '2026-03-01T10:00:00Z', genre: 'Comedie', director: 'Realisateur Y', actors: 'Acteur C' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.topGenre.name, 'Action');
    assert.equal(stats.topGenre.count, 2);
    assert.equal(stats.topDirector.name, 'Realisateur X');
    assert.equal(stats.topDirector.count, 2);
    assert.equal(stats.topActor.name, 'Acteur A');
    assert.equal(stats.topActor.count, 2);
  });

  test('le mois le plus actif est bien identifié', () => {
    const history = [
      { title: 'A', score: '7', savedAt: '2026-03-01T10:00:00Z' },
      { title: 'B', score: '7', savedAt: '2026-03-15T10:00:00Z' },
      { title: 'C', score: '7', savedAt: '2026-07-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.topMonth.name, '2026-03');
    assert.equal(stats.topMonth.count, 2);
  });

  test('le film le mieux noté de l\'année est correctement identifié', () => {
    const history = [
      { title: 'Moyen', score: '5.0', savedAt: '2026-01-01T10:00:00Z' },
      { title: 'Excellent', score: '9.5', savedAt: '2026-02-01T10:00:00Z' },
      { title: 'Bien', score: '7.0', savedAt: '2026-03-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.bestRated.title, 'Excellent');
  });

  test('temps total visionné additionne correctement les durées', () => {
    const history = [
      { title: 'A', score: '7', savedAt: '2026-01-01T10:00:00Z', runtime: '120 min' },
      { title: 'B', score: '7', savedAt: '2026-02-01T10:00:00Z', runtime: '90 min' },
      { title: 'Sans duree', score: '7', savedAt: '2026-03-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.totalMinutes, 210);
  });

  test('films sans date (savedAt ni date) sont ignorés sans planter', () => {
    const history = [
      { title: 'Sans date', score: '7' },
      { title: 'Avec date', score: '8', savedAt: '2026-01-01T10:00:00Z' },
    ];
    const stats = computeWrappedStats(history, 2026);
    assert.equal(stats.totalFilms, 1);
  });
});
