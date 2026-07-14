const { test, expect } = require('@playwright/test');

test('la bande-annonce se charge au clic (pas automatiquement)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({
      json: {
        id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: null,
        genres: [], credits: { crew: [], cast: [] },
        videos: { results: [{ key: 'abc123', site: 'YouTube', type: 'Trailer', name: 'Bande-annonce' }] },
      },
    });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await page.waitForTimeout(300);

  // Avant le clic : vignette, pas d'iframe
  await expect(page.locator('.mds-trailer-wrap iframe')).toHaveCount(0);
  await expect(page.locator('.mds-trailer-thumb')).toBeVisible();

  await page.click('.mds-trailer-wrap');
  await page.waitForTimeout(300);
  const html = await page.locator('.mds-trailer-wrap').innerHTML();
  console.log('APRES CLIC innerHTML:', html);

  // Apres le clic : l'iframe existe
  await expect(page.locator('.mds-trailer-wrap iframe')).toHaveCount(1);
});
