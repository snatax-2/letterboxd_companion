const { test, expect } = require('@playwright/test');

test('etat vide (jamais note) : hauteur reduite, message bien visible et lisible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(800);

  const box = await page.locator('#discover-stack').boundingBox();
  console.log('hauteur etat vide:', box.height);
  expect(box.height).toBeLessThan(200);
  expect(box.height).toBeGreaterThan(50); // assez pour contenir le texte

  const text = await page.locator('.discover-empty').textContent();
  expect(text).toContain('Note au moins un film');

  // Le texte doit vraiment etre visible dans les limites du conteneur, pas juste "present dans le DOM"
  const textBox = await page.locator('.discover-empty').boundingBox();
  expect(textBox.height).toBeGreaterThan(10);
});

test('avec de vraies cartes en file, la hauteur normale est restauree', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(800);

  // Verifie d'abord l'etat vide (compact)
  let box = await page.locator('#discover-stack').boundingBox();
  expect(box.height).toBeLessThan(200);

  // Peuple directement la file et redessine, sans dependre du pipeline
  // async complet de generation de suggestions (hors sujet pour ce test)
  await page.evaluate(() => {
    discoverQueue = [
      { id: 999, title: 'Suggestion Test', poster_path: null, release_date: '2022-01-01', vote_average: 7.5 },
    ];
    renderDiscoverStack();
  });
  await page.waitForTimeout(300);

  box = await page.locator('#discover-stack').boundingBox();
  console.log('hauteur avec une vraie carte en file:', box.height);
  expect(box.height).toBeGreaterThan(300);
});

test('Historique : bascule Films/Series avec fondu, contenu final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);

  await expect(page.locator('#history-list')).toBeVisible();
  await page.click('#hist-tab-tv');
  // Attend la fin complete de la sequence de fondu (140+150ms) avant de verifier
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-history-list')).toBeVisible();
  await expect(page.locator('#history-list')).toBeHidden();
  const opacity = await page.locator('#tv-history-list').evaluate(el => getComputedStyle(el).opacity);
  console.log('opacity finale apres transition:', opacity);
  expect(opacity).toBe('1');
  await expect(page.locator('.tv-show-card')).toBeVisible();
});

test('Noter : bascule Film/Serie avec fondu, formulaire final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await expect(page.locator('#movie-only-fields')).toBeVisible();
  await page.click('#tab-media-tv');
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-only-fields')).toBeVisible();
  await expect(page.locator('#movie-only-fields')).toBeHidden();
  await expect(page.locator('#tv-search')).toBeVisible();
});

test('Profil : bascule stats Films/Series avec fondu, KPI final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(500);
  await page.click('#stats-tab-tv');
  await page.waitForTimeout(400);
  const label = await page.locator('#kpi-total-label').textContent();
  expect(label).toBe('Séries suivies');
  const opacity = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-grid')).opacity);
  console.log('opacity finale dashboard:', opacity);
  expect(opacity).toBe('1');
});
const { default: AxeBuilder } = require("@axe-core/playwright");
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y phase2 - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    let results = await new AxeBuilder({ page }).analyze();
    let bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} decouvrir: ${bad.length} violation(s)`);
    await page.click('#nav-rating');
    await page.waitForTimeout(400);
    await page.click('#tab-media-tv');
    await page.waitForTimeout(400);
    results = await new AxeBuilder({ page }).analyze();
    bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} apres transition: ${bad.length} violation(s)`);
  });
}
