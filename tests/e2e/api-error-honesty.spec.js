const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('recherche principale : une erreur API precise est affichee, pas traitee comme "0 resultat"', async ({ page }) => {
  await page.route('**/api/search?query=*', route => route.fulfill({
    status: 429,
    json: { error: 'Trop de requêtes, réessaie dans un instant.' },
  }));
  await page.goto('/');
  await page.fill('#movie-search', 'Dune');
  await page.waitForTimeout(500);

  const toast = await page.locator('#toast').textContent();
  expect(toast).toContain('Trop de requêtes');
});

test('recherche watchlist : meme comportement', async ({ page }) => {
  await page.route('**/api/search?query=*', route => route.fulfill({
    status: 500,
    json: { error: "Erreur lors de l'appel API" },
  }));
  await page.goto('/');
  await page.click('#nav-watchlist');
  await page.fill('#watchlist-input', 'Dune');
  await page.waitForTimeout(500);

  const toast = await page.locator('#toast').textContent();
  expect(toast).toContain("Erreur lors de l'appel API");
});

test('selecteur d\'affiches : une erreur API precise s\'affiche, pas "aucune affiche disponible"', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Argylle', year: '2024', tmdbId: '500', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
  ])));
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('images=')) return route.fulfill({ status: 429, json: { error: 'Trop de requêtes, réessaie dans un instant.' } });
    return route.fulfill({ json: { id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: null, genres: [], credits: { crew: [], cast: [] }, videos: { results: [] }, overview: 'x' } });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  await page.click('.mds-poster-change-btn');
  await page.waitForTimeout(400);

  const msg = await page.locator('.poster-picker-empty, .error-state-msg').first().textContent();
  expect(msg).toContain('Trop de requêtes');
  expect(msg).not.toContain('Aucune affiche alternative');
});
