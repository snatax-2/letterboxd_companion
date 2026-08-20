const { test, expect } = require('@playwright/test');

// Deuxieme vague de finitions UX : bouton d'effacement sur les deux champs
// de recherche, verre depoli etendu au fond des fenetres modales et au
// toast, intensite du flou de la barre de nav relevee.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('bouton effacer sur le champ de recherche du formulaire de notation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#search-clear-btn')).toBeHidden();
  await page.fill('#movie-search', 'test');
  await expect(page.locator('#search-clear-btn')).toBeVisible();
  await page.click('#search-clear-btn');
  await expect(page.locator('#movie-search')).toHaveValue('');
  await expect(page.locator('#search-clear-btn')).toBeHidden();
});

test('mise en page mobile : date et coeur restent alignes sur la meme ligne (regression du wrapper de recherche)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  await page.waitForTimeout(300);
  const dateBox = await page.locator('.date-input').boundingBox();
  const heartBox = await page.locator('.heart-btn').boundingBox();
  // Meme ligne : les deux doivent partager (a peu pres) la meme position Y
  expect(Math.abs(dateBox.y - heartBox.y)).toBeLessThan(5);
  // Le coeur ne doit pas s'etirer sur toute la largeur (signe du bug corrige)
  expect(heartBox.width).toBeLessThan(100);
});

test('bouton effacer sur le champ de recherche de l\'historique, filtre bien la liste', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
      { title: 'Autre Film', tmdbId: '2', year: '2019', score: '6.0', mode: 'quick', values: { quick: 3 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForTimeout(300);
  await expect(page.locator('#history-search-clear-btn')).toBeHidden();
  await page.fill('#history-search', 'Film Test');
  await expect(page.locator('#history-search-clear-btn')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('.hist-item')).toHaveCount(1);
  await page.click('#history-search-clear-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#history-search')).toHaveValue('');
  await expect(page.locator('.hist-item')).toHaveCount(2);
});

test('accessibilite : recherche avec bouton effacer + fenetre modale avec verre depoli', async ({ page }) => {
  const AxeBuilder = require('@axe-core/playwright').default;
  await page.addInitScript(() => {
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Evil Dead', tmdbId: '767', year: '1981', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search?id=767', route => route.fulfill({ json: {
    id: 767, title: 'Evil Dead', poster_path: '/p.jpg', release_date: '1981-04-15',
    overview: 'x', genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
  } }));
  await page.goto('/');
  await page.fill('#movie-search', 'test');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);

  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForTimeout(400);
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);
});
