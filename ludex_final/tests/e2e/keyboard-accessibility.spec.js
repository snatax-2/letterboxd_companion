// Accessibilité clavier — activation par Entrée/Espace des cartes cliquables
// (div avec role="button", qui ne déclenchent pas nativement de clic sur
// Entrée contrairement à un vrai <button>), et gestion du focus à
// l'ouverture des fiches.
const { test, expect } = require('@playwright/test');

test('appuyer sur Entrée sur une carte de tendance (focus clavier) ouvre sa fiche', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('trending=true')) {
      return route.fulfill({ json: { results: [{ id: 42, title: 'Film Clavier', poster_path: '/x.jpg' }] } });
    }
    if (url.includes('id=42')) {
      return route.fulfill({ json: { id: 42, title: 'Film Clavier', release_date: '2020-01-01', poster_path: '/x.jpg', genres: [], credits: { crew: [], cast: [] } } });
    }
    return route.fulfill({ json: { results: [] } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.trending-item', { timeout: 5000 });

  const item = page.locator('.trending-item').first();
  await item.focus();
  await expect(item).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
});

test('ouvrir la fiche film déplace le focus dedans (pas laissé sur l\'élément déclencheur)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 1, title: 'Test', release_date: '2020-01-01', poster_path: null, genres: [], credits: { crew: [], cast: [] } } });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('1'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await expect(page.locator('#mds-close-btn')).toBeFocused();
});

test('le focus reste piégé dans la fiche ouverte (Tab ne sort pas vers le contenu derrière)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 1, title: 'Test', release_date: '2020-01-01', poster_path: null, genres: [], credits: { crew: [], cast: [] } } });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('1'));
  await page.waitForSelector('#movie-detail-sheet.open');

  // Shift+Tab depuis le premier élément focusable doit boucler vers le dernier,
  // pas sortir de la fiche.
  await page.keyboard.press('Shift+Tab');
  const stillInSheet = await page.evaluate(() => {
    const sheet = document.getElementById('movie-detail-sheet');
    return sheet.contains(document.activeElement);
  });
  expect(stillInSheet).toBe(true);
});
