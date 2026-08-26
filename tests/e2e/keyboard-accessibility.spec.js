// Accessibilité clavier — activation par Entrée/Espace des cartes cliquables
// (div avec role="button", qui ne déclenchent pas nativement de clic sur
// Entrée contrairement à un vrai <button>), et gestion du focus à
// l'ouverture des fiches.
const { test, expect } = require('@playwright/test');

test('appuyer sur Entrée sur une carte de tendance (focus clavier) ouvre sa fiche', async ({ page }) => {
  // fa0caea a remplace la rangee "tendances" unique par plusieurs carrousels
  // (nouveautes, classiques, international, topRated, historique), chacun avec
  // ses propres parametres et charge a l'intersection. Ne repondre qu'a
  // trending=true laissait donc des squelettes : 25 .poster-min a l'ecran,
  // aucun avec data-item-id, donc rien de focusable. On repond a TOUS les
  // endroits de liste avec la meme carte.
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('id=42')) {
      return route.fulfill({ json: { id: 42, title: 'Film Clavier', release_date: '2020-01-01', poster_path: '/x.jpg', genres: [], credits: { crew: [], cast: [] } } });
    }
    return route.fulfill({ json: { results: [{ id: 42, title: 'Film Clavier', poster_path: '/x.jpg' }] } });
  });

  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.click('#nav-discover');
  // Attendre une VRAIE carte, pas un squelette : .poster-min sert aux deux, et
  // seul l'element porteur de data-item-id est focusable et gere l'Entree.
  await page.waitForSelector('.poster-min[data-item-id]', { timeout: 15000 });

  const item = page.locator('.poster-min[data-item-id]').first();
  await item.focus();
  await expect(item).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
});

test('ouvrir la fiche film déplace le focus dedans (pas laissé sur l\'élément déclencheur)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 1, title: 'Test', release_date: '2020-01-01', poster_path: null, genres: [], credits: { crew: [], cast: [] } } });
  });
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('1'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await expect(page.locator('#mds-close-btn')).toBeFocused();
});

test('le focus reste piégé dans la fiche ouverte (Tab ne sort pas vers le contenu derrière)', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 1, title: 'Test', release_date: '2020-01-01', poster_path: null, genres: [], credits: { crew: [], cast: [] } } });
  });
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
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
