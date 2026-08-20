const { test, expect } = require('@playwright/test');

test('radar vide ne reserve plus 160px, se replie proprement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);

  const containerBox = await page.locator('#radar-chart-container').boundingBox();
  console.log('radar-chart-container vide:', JSON.stringify(containerBox));
  expect(containerBox.height).toBeLessThan(20);
});

test('radar reprend sa hauteur normale une fois des notes detaillees presentes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'detail',
        values: { scenario: '8', realisation: '7', photo: '8', acteurs: '7', ambiance: '8', rythme: '7', affect: '8' },
        date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  const containerBox = await page.locator('#radar-chart-container').boundingBox();
  console.log('radar-chart-container avec donnees:', JSON.stringify(containerBox));
  expect(containerBox.height).toBeGreaterThanOrEqual(150);
  await expect(page.locator('#radar-chart-container svg')).toBeVisible();
});

test('distribution des notes affiche un message au lieu de 10 lignes a zero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('.histo-row')).toHaveCount(0);
  const text = await page.locator('#histogram').textContent();
  console.log('contenu histogramme vide:', text);
  expect(text).toContain('Note quelques films');
});

test('distribution des notes revient a l\'affichage normal des que des notes existent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('.histo-row')).toHaveCount(10);
});

test('bouton telecharger desactive quand la carte de profil est verrouillee', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('#profile-share-btn')).toBeDisabled();
});

test('bouton telecharger actif des qu\'il y a au moins un film note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
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
  await page.waitForTimeout(600);
  await expect(page.locator('#profile-share-btn')).toBeEnabled();
});
const { default: AxeBuilder } = require("@axe-core/playwright");
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y profil corrige - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-profile');
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme}: ${bad.length} violation(s)`);
    for (const v of bad) console.log('  ', v.id);
  });
}
