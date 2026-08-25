// Bandeau "nouvelle version disponible" — la simulation d'un vrai cycle de
// mise à jour de service worker est complexe à reproduire de façon fiable ;
// on vérifie ici que le bandeau est bien caché par défaut, s'affiche
// correctement une fois déclenché, et que le bouton recharge la page.
const { test, expect } = require('@playwright/test');

test('le bandeau de mise à jour est caché par défaut', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await expect(page.locator('#update-banner')).not.toHaveClass(/show/);
});

test('le bandeau s\'affiche et le bouton recharge la page', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => document.getElementById('update-banner').classList.add('show'));
  await expect(page.locator('#update-banner')).toHaveClass(/show/);
  await expect(page.locator('#update-banner')).toBeVisible();

  let reloaded = false;
  page.on('load', () => { reloaded = true; });
  await page.click('#update-banner-reload-btn');
  await page.waitForLoadState('load');
  expect(reloaded).toBe(true);
});
