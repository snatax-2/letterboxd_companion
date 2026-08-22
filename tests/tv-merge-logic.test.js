// Tests de mergeTvShows (fusion cloud des séries suivies) : contrairement à
// mergeHistory/mergeWatchlist (listes plates), une série contient des
// saisons imbriquées — la fusion se fait à deux niveaux, avec deux listes
// de tombstones séparées (série entière / saison individuelle). Lance
// avec : npm test

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { mergeTvShows } = require('../src/03b-pure-logic.js');

describe('mergeTvShows', () => {
  test('série présente seulement en local -> conservée', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8 } } }];
    const result = mergeTvShows(local, [], [], []);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'A');
  });

  test('série présente seulement à distance -> ajoutée', () => {
    const remote = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8 } } }];
    const result = mergeTvShows([], remote, [], []);
    assert.equal(result.length, 1);
  });

  test('même saison des deux côtés, une notée une pas -> priorité à la notée', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1, 2], totalEpisodes: 8 } } }];
    const remote = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1, 2, 3, 4, 5, 6, 7, 8], totalEpisodes: 8, rating: { score: '9.0', date: '2026-01-01T00:00:00.000Z' } } } }];
    const result = mergeTvShows(local, remote, [], []);
    assert.equal(result[0].seasons['1'].rating.score, '9.0');
  });

  test('même saison notée des deux côtés -> priorité à la note la plus récente', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8, rating: { score: '5.0', date: '2020-01-01T00:00:00.000Z' } } } }];
    const remote = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8, rating: { score: '9.0', date: '2026-01-01T00:00:00.000Z' } } } }];
    const result = mergeTvShows(local, remote, [], []);
    assert.equal(result[0].seasons['1'].rating.score, '9.0');
  });

  test('tombstone de série plus récent que la dernière note -> série supprimée', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8, rating: { score: '9.0', date: '2026-01-01T00:00:00.000Z' } } } }];
    const showTomb = [{ key: '1', deletedAt: '2026-06-01T00:00:00.000Z' }];
    const result = mergeTvShows(local, [], showTomb, []);
    assert.equal(result.length, 0);
  });

  test('tombstone de saison retire juste cette saison, pas toute la série', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: {
      '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8 },
      '2': { seasonName: 'S2', watchedEpisodes: [1], totalEpisodes: 8 },
    } }];
    const seasonTomb = [{ key: '1:1', deletedAt: '2026-06-01T00:00:00.000Z' }];
    const result = mergeTvShows(local, [], [], seasonTomb);
    assert.equal(result.length, 1);
    assert.deepEqual(Object.keys(result[0].seasons), ['2']);
  });

  test('série sans plus aucune saison après fusion -> retirée du résultat', () => {
    const local = [{ tmdbTvId: 1, title: 'A', seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8 } } }];
    const seasonTomb = [{ key: '1:1', deletedAt: '2026-06-01T00:00:00.000Z' }];
    const result = mergeTvShows(local, [], [], seasonTomb);
    assert.equal(result.length, 0);
  });
});
