const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('l\'apercu du swipe se joue a la premiere visite de l\'historique, puis plus jamais', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Film Test', tmdbId: '1', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
  ])));
  await page.goto('/');
  await page.click('#nav-history');

  // Pendant l'apercu (apres le delai de 600ms), la carte est temporairement decalee
  await page.waitForTimeout(900);
  const midTransform = await page.locator('.hist-item-content').first().evaluate(el => el.style.transform);
  expect(midTransform).toContain('translateX');

  // Puis tout revient a la normale
  await page.waitForTimeout(1600);
  const endTransform = await page.locator('.hist-item-content').first().evaluate(el => el.style.transform);
  expect(endTransform).toBe('');

  // Marque comme vu
  const seen = await page.evaluate(() => localStorage.getItem('lbx_swipe_hint_seen'));
  expect(seen).toBe('1');

  // Deuxieme visite : aucun apercu
  await page.click('#nav-rating');
  await page.click('#nav-history');
  await page.waitForTimeout(900);
  const secondVisit = await page.locator('.hist-item-content').first().evaluate(el => el.style.transform);
  expect(secondVisit).toBe('');
});

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
