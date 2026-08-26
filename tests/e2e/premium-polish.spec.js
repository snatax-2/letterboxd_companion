const { test, expect } = require('@playwright/test');
test('le meta theme-color suit le theme actif', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.waitForTimeout(300);
  // La garantie testée est que la meta SUIT le thème, pas qu'elle vaut une
  // couleur précise. Les valeurs étaient figées en dur (#14181c) et ont
  // silencieusement divergé quand la palette par défaut a été retouchée
  // (#0E1116 aujourd'hui) — un échec sans rapport avec le comportement. On
  // compare donc à la valeur réelle du token, ce qui reste vrai après
  // n'importe quelle retouche de palette tout en attrapant une meta figée.
  const bgDuTheme = () => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase());
  const metaCouleur = () => page.locator('meta[name="theme-color"]')
    .getAttribute('content').then(c => c.toLowerCase());

  const initial = await metaCouleur();
  expect(initial).toBe(await bgDuTheme());

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'technicolor'));
  await page.waitForTimeout(200);
  const tech = await metaCouleur();
  expect(tech).toBe(await bgDuTheme());
  expect(tech).not.toBe(initial); // la bascule a bien change quelque chose
});
test('les polices sont chargees depuis le head avec preconnect', async ({ page }) => {
  await page.goto('/');
  const preconnects = await page.locator('link[rel="preconnect"]').count();
  expect(preconnects).toBe(2);
  const fontLink = await page.locator('link[rel="stylesheet"][href*="fonts.googleapis"]').count();
  expect(fontLink).toBe(1);
});
