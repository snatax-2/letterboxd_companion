const { test, expect } = require('@playwright/test');

const LONG_OVERVIEW = 'Un synopsis vraiment tres long qui va largement depasser le seuil de troncage de cent quatre-vingts caracteres pour verifier que le bouton Lire la suite apparait bien et fonctionne correctement une fois cliqu.'.repeat(1).padEnd(200, ' et encore plus de texte ici pour etre bien sur');
const SHORT_OVERVIEW = 'Un synopsis court.';

function detailWith(overview) {
  return {
    id: 42, title: 'Film Mystère', original_title: 'Film Mystère', release_date: '2015-06-01',
    poster_path: '/poster.jpg', overview,
    credits: { crew: [{ job: 'Director', name: 'Réal Isateur' }], cast: [{ name: 'Act Rice' }] },
    vote_average: 7.2,
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('synopsis court : pas de bouton "Lire la suite" (rien a replier)', async ({ page }) => {
  const detail = detailWith(SHORT_OVERVIEW);
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: detail }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Mystère');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.fdj-synopsis-card');

  await expect(page.locator('.fdj-synopsis-text')).toContainText(SHORT_OVERVIEW);
  await expect(page.locator('.fdj-synopsis-toggle')).toHaveCount(0);
});

test('synopsis long : tronque par defaut, "Lire la suite" deplie sans recharger', async ({ page }) => {
  const detail = detailWith(LONG_OVERVIEW);
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: detail }));

  let idCalls = 0;
  await page.route('**/api/search?id=42', route => { idCalls++; return route.fulfill({ json: detail }); });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Mystère');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.fdj-synopsis-card');

  await expect(page.locator('.fdj-synopsis-toggle')).toHaveText('Lire la suite');
  const clampedBefore = await page.locator('.fdj-synopsis-text').evaluate(el => el.classList.contains('fdj-synopsis-clamped'));
  expect(clampedBefore).toBe(true);

  await page.click('.fdj-synopsis-toggle');
  const clampedAfter = await page.locator('.fdj-synopsis-text').evaluate(el => el.classList.contains('fdj-synopsis-clamped'));
  expect(clampedAfter).toBe(false);
  await expect(page.locator('.fdj-synopsis-toggle')).toHaveText('Réduire');

  // Aucun nouvel appel reseau au depli (deja dans le DOM)
  expect(idCalls).toBeLessThanOrEqual(1);

  // Cliquer le bouton ne doit pas ouvrir la fiche du film par erreur
  await expect(page.locator('#movie-detail-sheet.open')).toHaveCount(0);
});

test('cliquer sur la carte synopsis (hors bouton) ouvre bien la fiche du film', async ({ page }) => {
  const detail = detailWith(SHORT_OVERVIEW);
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: detail } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: detail }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Mystère');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.fdj-synopsis-card');

  await page.click('.fdj-synopsis-text');
  await expect(page.locator('#movie-detail-sheet.open')).toBeVisible();
});
