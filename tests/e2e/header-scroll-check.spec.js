const { test, expect } = require('@playwright/test');

test('le bouton fermer reste visible apres defilement, et rien ne perce au-dessus de l\'en-tete', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({
      json: {
        id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: '/argylle.jpg',
        runtime: 135, genres: [{name:'Action'},{name:'Aventure'},{name:'Comédie'}],
        vote_average: 6.0,
        credits: { crew: [{ job: 'Director', name: 'Matthew Vaughn' }], cast: [] },
        videos: { results: [] },
      },
    });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await page.waitForTimeout(500);

  const box = page.locator('#movie-detail-sheet .mds-box');
  await box.evaluate(el => el.scrollTo(0, 400));
  await page.waitForTimeout(300);

  const closeBtn = page.locator('#mds-close-btn');
  await expect(closeBtn).toBeVisible();
  const closeBox = await closeBtn.boundingBox();
  const boxBox = await box.boundingBox();
  // Le bouton doit rester pres du haut de la fiche visible (pas defile hors-vue)
  expect(closeBox.y - boxBox.y).toBeLessThan(60);

  // Rien ne doit deborder AU-DESSUS du haut visible de la fiche
  const headerTop = await page.locator('.mds-header').evaluate(el => el.getBoundingClientRect().top);
  expect(headerTop).toBeGreaterThanOrEqual(boxBox.y - 2);
});
