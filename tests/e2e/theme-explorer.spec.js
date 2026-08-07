const { test, expect } = require('@playwright/test');

test('exploration par theme : puces, ouverture, grille sans barre de completion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?keywordId=10051*', route => route.fulfill({ json: { results: [
    { id: 1, title: 'Ocean\'s Eleven', poster_path: '/p1.jpg', release_date: '2001-12-07' },
    { id: 2, title: 'Heat', poster_path: '/p2.jpg', release_date: '1995-12-15' },
  ] } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.theme-chip');

  const chipCount = await page.locator('.theme-chip').count();
  console.log('nombre de puces de theme:', chipCount);
  expect(chipCount).toBe(8);

  await page.click('.theme-chip[data-theme-id="10051"]'); // Braquage
  await page.waitForSelector('#curated-list-sheet.open');
  const title = await page.locator('#cls-title').textContent();
  console.log('titre de la fiche theme:', title);
  expect(title).toBe('Braquage');

  const filmCount = await page.locator('#curated-list-sheet .pds-film-item').count();
  console.log('nombre de films:', filmCount);
  expect(filmCount).toBe(2);

  // Pas de barre de completion ni de bouton d'ajout en masse (esprit decouverte, pas collection)
  await expect(page.locator('#curated-list-sheet .pds-completion')).toHaveCount(0);
  await expect(page.locator('#cls-add-missing-btn')).toHaveCount(0);

  // Cliquer un film ouvre bien sa fiche
  await page.route('**/api/search?id=1', route => route.fulfill({ json: { id: 1, title: 'Ocean\'s Eleven', genres: [], credits: { crew: [], cast: [] } } }));
  await page.click('#curated-list-sheet .pds-film-item[data-movie-id="1"]');
  await page.waitForSelector('#movie-detail-sheet.open');
});
