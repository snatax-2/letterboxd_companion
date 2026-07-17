const { test, expect } = require('@playwright/test');

const DETAIL = {
  id: 500, title: 'Argylle', release_date: '2024-01-31', poster_path: '/orig.jpg',
  genres: [], credits: { crew: [], cast: [] }, videos: { results: [] }, overview: 'Synopsis.',
};
const POSTERS = { posters: [
  { file_path: '/a.jpg', iso_639_1: 'fr' },
  { file_path: '/b.jpg', iso_639_1: null },
  { file_path: '/c.jpg', iso_639_1: 'en' },
] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('images=')) return route.fulfill({ json: POSTERS });
    return route.fulfill({ json: DETAIL });
  });
});

test('choisir une affiche la persiste dans l\'historique et rafraichit la fiche', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Argylle', year: '2024', tmdbId: '500', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', poster: 'https://image.tmdb.org/t/p/w185/orig.jpg' },
  ])));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');

  // Le bouton est present (film dans la collection)
  await page.click('.mds-poster-change-btn');
  await page.waitForSelector('.poster-picker-cell[data-poster-path]');
  const cells = await page.locator('.poster-picker-cell[data-poster-path]').count();
  expect(cells).toBe(3);

  // Choisit la 2e affiche (sans texte)
  await page.locator('.poster-picker-cell[data-poster-path]').nth(1).click();
  await page.waitForTimeout(400);

  // Persistee dans l'historique, ET updatedAt rafraichi : c'est ce qui
  // empeche la fusion de la synchro cloud d'ecraser le choix au sync suivant
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(history[0].poster).toBe('https://image.tmdb.org/t/p/w185/b.jpg');
  expect(new Date(history[0].updatedAt).getTime()).toBeGreaterThan(Date.now() - 60000);

  // Et l'image du selecteur porte bien le ratio portrait (le bug d'affichage
  // en tranches venait d'un ratio pose sur le bouton au lieu de l'image)

  // La fiche affiche la nouvelle affiche (w342), la modale est fermee
  const src = await page.locator('#movie-detail-sheet .mds-poster').getAttribute('src');
  expect(src).toContain('/b.jpg');
  const modalOpen = await page.locator('#poster-picker-modal.open').count();
  expect(modalOpen).toBe(0);
});

test('pas de bouton pour un film hors collection', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  await expect(page.locator('.mds-poster-change-btn')).toHaveCount(0);
});

test('les vignettes du selecteur ont bien un ratio portrait 2:3, en 2 colonnes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Argylle', year: '2024', tmdbId: '500', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
  ])));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  await page.click('.mds-poster-change-btn');
  await page.waitForSelector('.poster-picker-cell[data-poster-path]');

  const cells = page.locator('.poster-picker-cell[data-poster-path]');
  const box0 = await cells.nth(0).boundingBox();
  const box1 = await cells.nth(1).boundingBox();
  expect(box0.height / box0.width).toBeGreaterThan(1.4);
  expect(box0.height / box0.width).toBeLessThan(1.6);
  expect(box0.y).toBeCloseTo(box1.y, 0); // meme ligne = bien 2 colonnes
});

test('chaque affiche est affichee en entier, sans etre rognee (object-fit: contain)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Argylle', year: '2024', tmdbId: '500', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
  ])));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  await page.click('.mds-poster-change-btn');
  await page.waitForSelector('.poster-picker-cell[data-poster-path] img');

  const fit = await page.locator('.poster-picker-cell img').first().evaluate(el => getComputedStyle(el).objectFit);
  expect(fit).toBe('contain');
});
