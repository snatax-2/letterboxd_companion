const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('renderStats est differe pendant que Profil est masque, et rattrape a l\'affichage', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.renderAll === 'function');

  await page.evaluate(() => {
    window.__statsCalls = 0;
    const original = window.renderStats;
    window.renderStats = function (...args) { window.__statsCalls++; return original.apply(this, args); };
  });

  // Sur l'onglet Noter (jamais Profil), on invoque directement renderAll() —
  // comme le ferait une sauvegarde — sans passer par l'UI de recherche.
  await page.evaluate(() => window.renderAll());
  await page.waitForTimeout(100);
  const callsWhileHidden = await page.evaluate(() => window.__statsCalls);
  expect(callsWhileHidden).toBe(0);

  // On bascule sur Profil : le rattrapage doit se produire
  await page.click('#nav-profile');
  await page.waitForTimeout(200);
  const callsAfterSwitch = await page.evaluate(() => window.__statsCalls);
  expect(callsAfterSwitch).toBeGreaterThanOrEqual(1);
});

test('reste sur Profil : renderStats s\'execute immediatement, pas de retard', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    window.__statsCalls = 0;
    const original = window.renderStats;
    window.renderStats = function (...args) { window.__statsCalls++; return original.apply(this, args); };
  });

  // Toujours sur Profil au moment de l'appel : calcul immediat, pas de report.
  await page.evaluate(() => window.renderAll());
  await page.waitForTimeout(100);
  const calls = await page.evaluate(() => window.__statsCalls);
  expect(calls).toBeGreaterThanOrEqual(1);
});
