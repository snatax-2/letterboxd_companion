const { test, expect } = require('@playwright/test');

test('fiche film : panne reseau -> etat d\'erreur -> Reessayer recharge', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));

  let failing = true;
  await page.route('**/api/search*', async (route) => {
    if (failing) return route.abort();
    return route.fulfill({
      json: {
        id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: null,
        genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
        overview: 'Un synopsis.',
      },
    });
  });

  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open');

  // L'état d'erreur dessiné apparaît (pas un vide ni un toast générique)
  await page.waitForSelector('.error-state', { timeout: 5000 });
  await expect(page.locator('.error-state-msg')).toContainText('connexion');

  // Le réseau revient : Réessayer recharge la fiche complète
  failing = false;
  await page.click('.error-retry-btn');
  await page.waitForSelector('.mds-title', { timeout: 5000 });
  await expect(page.locator('.mds-title')).toContainText('Argylle');
});
