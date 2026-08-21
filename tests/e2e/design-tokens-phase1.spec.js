const { test, expect } = require('@playwright/test');

test('les affiches film se chargent toujours correctement via la fonction centralisee', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [
    { id: 1, title: 'Dune', poster_path: '/dune.jpg', release_date: '2021-01-01' },
  ] } }));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.fill('#movie-search', 'Dune');
  await page.waitForTimeout(500);
  const img = page.locator('.suggestion-poster');
  await expect(img).toBeVisible();
  const src = await img.getAttribute('src');
  console.log('URL affiche generee:', src);
  expect(src).toBe('https://image.tmdb.org/t/p/w92/dune.jpg');
});

test('image manquante ne casse pas (chaine vide, pas "undefined" dans l\'URL)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_watchlist', JSON.stringify([
      { title: 'Sans affiche', tmdbId: '99', year: '2023', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(500);
  await expect(page.locator('.wl-poster')).toBeVisible();
});

test('fiche film : affiche et casting se chargent via tmdbImage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Dune', tmdbId: '438631', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: 'https://image.tmdb.org/t/p/w342/dune.jpg' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: {
    id: 438631, title: 'Dune', poster_path: '/dune.jpg', release_date: '2021-01-01',
    overview: 'Synopsis.', credits: { cast: [{ id: 1, name: 'Timothee Chalamet', character: 'Paul', profile_path: '/tc.jpg' }], crew: [] },
    videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await page.click('.hist-item-open');
  await page.waitForTimeout(600);
  const posterSrc = await page.locator('.mds-poster').getAttribute('src');
  console.log('affiche fiche film:', posterSrc);
  expect(posterSrc).toContain('image.tmdb.org/t/p/w342/dune.jpg');
  const castSrc = await page.locator('.mds-cast-item img').first().getAttribute('src');
  console.log('photo casting:', castSrc);
  expect(castSrc).toBe('https://image.tmdb.org/t/p/w185/tc.jpg');
});

test('fiche serie : affiche se charge via tmdbImage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/td.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);
  const posterSrc = await page.locator('.mds-poster').getAttribute('src');
  console.log('affiche fiche serie:', posterSrc);
  expect(posterSrc).toBe('https://image.tmdb.org/t/p/w342/td.jpg');
});
