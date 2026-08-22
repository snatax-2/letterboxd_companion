const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

// Ludex 2.0 : le test "l'aperçu du swipe se joue à la première visite" a été
// retiré ici — maybePlaySwipeHint() n'est plus jamais appelée (voir
// 01-navigation.js), l'Historique étant passé en grille sans geste de
// swipe. Le second test ci-dessous, sans rapport avec le swipe, reste
// inchangé.
test('l\'en-tete de la fiche film reste opaque (fond permanent, teinte ou pas)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({
      json: {
        id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: null,
        genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
        overview: Array.from({ length: 15 }, () => 'Long synopsis pour defiler.').join(' '),
      },
    });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await page.waitForTimeout(400);

  // Le fond calcule de l'en-tete ne doit JAMAIS etre entierement transparent
  const bg = await page.locator('.mds-header').evaluate(el => getComputedStyle(el).backgroundImage + '|' + getComputedStyle(el).backgroundColor);
  const fullyTransparent = bg === 'none|rgba(0, 0, 0, 0)';
  expect(fullyTransparent).toBe(false);
});
