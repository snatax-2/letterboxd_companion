const { test, expect } = require('@playwright/test');

test('export inclut les series, pas seulement les films', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', genre: 'Policier', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
      } },
    ]));
    localStorage.setItem('lbx_tv_watchlists_meta', JSON.stringify([{ id: 'default', name: 'À voir' }]));
    localStorage.setItem('lbx_tv_watchlist_default', JSON.stringify([{ title: 'Severance', tmdbId: 95396, addedAt: '2026-01-02T00:00:00.000Z' }]));
    localStorage.setItem('lbx_analyses', JSON.stringify([{ id: 'a1', filmId: 1, date: '2026-01-03T00:00:00.000Z', retour: {} }]));
    localStorage.setItem('lbx_owned_providers', JSON.stringify(['Netflix']));
    localStorage.setItem('lbx_settings', JSON.stringify({ appName: 'Mon Ludex', theme: 'default' }));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(400);

  const downloadPromise = page.waitForEvent('download');
  await page.click('#export-btn');
  const download = await downloadPromise;
  const path = await download.path();
  const content = require('fs').readFileSync(path, 'utf-8');
  const data = JSON.parse(content);

  console.log('structure exportee:', JSON.stringify(Object.keys(data)));
  expect(data.schemaVersion).toBe(2);
  expect(data.history).toHaveLength(1);
  expect(data.tvShows).toHaveLength(1);
  expect(data.tvShows[0].title).toBe('True Detective');
  expect(data.tvShows[0].seasons['1'].rating.score).toBe('9.0');
  expect(data.tvWatchlists.default[0].title).toBe('Severance');
  expect(data.analyses).toHaveLength(1);
  expect(data.ownedProviders).toEqual(['Netflix']);
  expect(data.settings.appName).toBe('Mon Ludex');
});

test('import complet restaure watchlists series, analyses et plateformes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');

  const backup = JSON.stringify({
    schemaVersion: 2,
    history: [],
    tvShows: [],
    watchlistsMeta: [{ id: 'default', name: 'À voir' }],
    watchlists: { default: [] },
    tvWatchlistsMeta: [{ id: 'default', name: 'Séries à voir' }],
    tvWatchlists: { default: [{ title: 'The Bear', tmdbId: 136315, addedAt: '2026-01-01T00:00:00.000Z' }] },
    analyses: [{ id: 'analysis-1', filmId: 1, date: '2026-01-01T00:00:00.000Z', retour: { synthese: 'Test' } }],
    ownedProviders: ['MUBI'],
    settings: { appName: 'Cinémathèque', theme: 'default' },
  });
  await page.evaluate(text => window.importLudexJson(text), backup);
  await page.click('#modal-confirm');

  const restored = await page.evaluate(() => ({
    tvList: JSON.parse(localStorage.getItem('lbx_tv_watchlist_default')),
    analyses: JSON.parse(localStorage.getItem('lbx_analyses')),
    providers: JSON.parse(localStorage.getItem('lbx_owned_providers')),
    settings: JSON.parse(localStorage.getItem('lbx_settings')),
  }));
  expect(restored.tvList[0].title).toBe('The Bear');
  expect(restored.analyses[0].id).toBe('analysis-1');
  expect(restored.providers).toEqual(['MUBI']);
  expect(restored.settings.appName).toBe('Cinémathèque');
});

test('import ancien format (tableau simple, sans series) reste retrocompatible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);

  const oldFormatBackup = JSON.stringify([
    { title: 'Vieux Film', tmdbId: '5', year: '2019', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2025-01-01', savedAt: '2025-01-01T10:00:00.000Z' },
  ]);

  await page.evaluate((text) => {
    window.importLudexJson(text);
  }, oldFormatBackup);
  await page.waitForTimeout(300);
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  console.log('film importe depuis ancien format:', stored[0]?.title);
  expect(stored.some(f => f.title === 'Vieux Film')).toBe(true);
});

test('import nouveau format fusionne films ET series, doublons ignores', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', genre: 'Policier', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1,2,3,4,5,6,7,8], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);

  const newFormatBackup = JSON.stringify({
    history: [{ title: 'Nouveau Film', tmdbId: '6', year: '2024', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-02-01', savedAt: '2026-02-01T10:00:00.000Z' }],
    tvShows: [
      // Meme serie/saison deja presente localement (avec la meme note) -> doit etre ignoree comme doublon
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', genre: 'Policier', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '5.0', stars: '', review: '', date: '2020-01-01T00:00:00.000Z' } },
      } },
      // Nouvelle serie -> doit etre ajoutee
      { tmdbTvId: 66732, title: 'Stranger Things', poster_path: '/p2.jpg', genre: 'Fantastique', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ],
  });

  await page.evaluate((text) => { window.importLudexJson(text); }, newFormatBackup);
  await page.waitForTimeout(300);
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const films = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(films.some(f => f.title === 'Nouveau Film')).toBe(true);

  const shows = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  console.log('series apres import:', shows.map(s => s.title));
  expect(shows).toHaveLength(2);
  const td = shows.find(s => s.title === 'True Detective');
  // La saison 1 deja presente localement (note 9.0) ne doit PAS avoir ete ecrasee par le doublon importe (note 5.0)
  expect(td.seasons['1'].rating.score).toBe('9.0');
  const st = shows.find(s => s.title === 'Stranger Things');
  expect(st).toBeTruthy();
});
