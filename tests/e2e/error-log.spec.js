const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('une erreur JS imprevue est journalisee, signalee une fois, et consultable dans Reglages', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.renderAll === 'function');

  // Provoque une VRAIE erreur non interceptee (comme le ferait un bug reel)
  await page.evaluate(() => {
    setTimeout(() => { throw new Error('Erreur de test volontaire'); }, 10);
  });
  await page.waitForTimeout(500);

  // Journalisee dans localStorage, sans toucher aux donnees de films
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_error_log') || '[]'));
  expect(log.length).toBeGreaterThanOrEqual(1);
  expect(log[log.length - 1].message).toContain('Erreur de test volontaire');
  const history = await page.evaluate(() => localStorage.getItem('lbx_v2'));
  expect(history).toBeNull(); // aucune donnee de films creee/touchee par le filet de securite

  // Avertissement affiche une seule fois (toast)
  await expect(page.locator('#toast.show')).toContainText('problème technique');

  // Visible et copiable depuis Reglages
  await page.click('#settings-btn');
  await expect(page.locator('#error-log-section')).toBeVisible();
  await page.click('#error-log-copy-btn');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('Erreur de test volontaire');
});

test('une deuxieme erreur en cascade ne redeclenche pas un second toast', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.renderAll === 'function');

  await page.evaluate(() => {
    setTimeout(() => { throw new Error('Premiere erreur'); }, 10);
    setTimeout(() => { throw new Error('Deuxieme erreur'); }, 50);
  });
  await page.waitForTimeout(600);

  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_error_log') || '[]'));
  expect(log.length).toBeGreaterThanOrEqual(2); // les DEUX sont journalisees...

  const toastCount = await page.locator('.toast-undo-btn').count(); // pas de UI d'accumulation de toasts
  expect(toastCount).toBe(0); // pas de bouton "annuler" ici, juste verifie qu'il n'y a qu'un seul toast visible
  const toastText = await page.locator('#toast').textContent();
  expect((toastText.match(/problème technique/g) || []).length).toBe(1); // ...mais un seul avertissement affiche
});
