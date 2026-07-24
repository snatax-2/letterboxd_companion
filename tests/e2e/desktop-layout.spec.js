const { test, expect } = require('@playwright/test');

// Verifie le bug d'affichage PC trouve suite a un signalement utilisateur :
// le carrousel "Tendances du moment" (flex + overflow-x:auto sans
// min-width:0) forcait la page a deborder bien au-dela de l'ecran. Corrige,
// puis la mise en page desktop a ete refondue en systeme d'onglets uniques
// (comme sur mobile) a la demande de l'utilisateur -- ce test verifie les
// deux : pas de debordement horizontal, et un seul onglet visible a la fois.

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
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(1440);
});

test('la barre a 5 onglets est visible en haut sur PC, un seul onglet actif a la fois', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);

  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(page.locator('.nav-btn')).toHaveCount(5);

  await expect(page.locator('#col-rating')).toBeVisible();
  await expect(page.locator('#col-right-views')).toBeHidden();

  for (const tab of ['discover', 'watchlist', 'profile', 'history']) {
    await page.click(`#nav-${tab}`);
    await page.waitForTimeout(500);
    await expect(page.locator('#col-rating')).toBeHidden();
    await expect(page.locator('#col-right-views')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
  }

  await page.click('#nav-rating');
  await page.waitForTimeout(400);
  await expect(page.locator('#col-rating')).toBeVisible();
  await expect(page.locator('#col-right-views')).toBeHidden();
});
