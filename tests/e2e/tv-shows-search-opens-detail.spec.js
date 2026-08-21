const { test, expect } = require('@playwright/test');

test('recherche une serie ouvre directement la fiche detaillee, pas de puces de saisons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.',
    genres: [{ id: 1, name: 'Policier' }, { id: 2, name: 'Drame' }],
    created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
    seasons: [
      { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
      { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
    ],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));

  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(600);

  // La fiche s'ouvre directement, pas de puces de saison
  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#tv-season-picker [data-season-number]')).toHaveCount(0);
  await expect(page.locator('#tds-title')).toHaveText('True Detective');

  // La pastille Commencer doit etre visible (jamais suivie)
  await expect(page.locator('#tds-start-btn')).toBeVisible();
  await expect(page.locator('#tds-start-btn')).toContainText('Commencer');
});

test('cliquer Commencer demarre a la Saison 1, ajoute au widget, met a jour la fiche sur place', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.',
    genres: [{ id: 1, name: 'Policier' }],
    created_by: [],
    seasons: [
      { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
      { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
    ],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55, overview: 'Un synopsis.' }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);

  await page.click('#tds-start-btn');
  await page.waitForTimeout(800);

  // Genre bien capture (pas perdu par le changement de flux)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  const show = stored.find(s => String(s.tmdbTvId) === '4607');
  expect(show.genre).toBe('Policier');
  expect(show.seasons['1'].watchedEpisodes).toEqual([]);
  expect(show.seasons['1'].totalEpisodes).toBe(8);

  // La fiche s'est rechargee sur place, montre maintenant la progression demarree
  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#tds-start-btn')).toHaveCount(0); // remplace par la liste de progression
  const rowsText = await page.locator('.tds-season-progress-row').first().textContent();
  expect(rowsText).toContain('0/8');

  // Le widget En cours (fond de page, derriere la fiche) doit deja etre a jour
  await page.click('#tds-close-btn');
  await page.waitForTimeout(400);
  const widgetText = await page.locator('.tv-continue-list').textContent();
  expect(widgetText).toContain('True Detective');
  expect(widgetText).toContain('Ep 1');
});
