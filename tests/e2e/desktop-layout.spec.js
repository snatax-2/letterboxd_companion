const { test, expect } = require('@playwright/test');

// Verifie specifiquement le bug d'affichage PC trouve suite a un
// signalement utilisateur : le carrousel "Tendances du moment" (flex +
// overflow-x:auto sans min-width:0) forcait toute la colonne de droite a
// deborder bien au-dela de l'ecran, cassant la mise en page a deux colonnes.
// Ce test tourne a une largeur de bureau (le layout a deux colonnes ne
// s'active qu'au-dessus de 860px, voir le point de rupture dans styles.css).

const DETAIL = { id: 1, title: 'Film Test', poster_path: '/p.jpg', release_date: '2020-01-01', credits: { crew: [], cast: [] } };
const TRENDING_MANY = { results: Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, title: 'Tendance ' + i, poster_path: '/t.jpg', vote_average: 7 })) };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
  });
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?id=1', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: null } }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
  await page.route('**/api/search?trending=true', route => route.fulfill({ json: TRENDING_MANY }));
});

test('le carrousel Tendances (10 films) ne fait plus deborder la page en largeur bureau', async ({ page }) => {
  await page.goto('/');
  await page.click('#tab-right-discover');
  await page.waitForTimeout(1000);

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(1440);

  const rightCol = await page.locator('.col-right').boundingBox();
  // La colonne de droite doit rester dans une fourchette raisonnable
  // (~0.55fr d'un layout limite a 1100px), pas des milliers de pixels.
  expect(rightCol.width).toBeLessThan(700);
});

test('aucun chevauchement entre les deux colonnes sur les 4 onglets, avec des tendances chargees', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  for (const tab of ['discover', 'watchlist', 'profile']) {
    await page.click(`#tab-right-${tab}`);
    await page.waitForTimeout(600);
    const leftBox = await page.locator('.layout > *:first-child').first().boundingBox();
    const rightBox = await page.locator('.col-right').boundingBox();
    expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x + 1); // +1 tolerance d'arrondi
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
  }
});
