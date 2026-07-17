const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_sync_code', 'test-code-1234');
  });
});

test('une erreur API precise (ex: limite de requetes) s\'affiche telle quelle, pas "verifie ta connexion"', async ({ page }) => {
  await page.route('**/api/sync*', route => route.fulfill({
    status: 429,
    json: { error: 'Trop de requêtes, réessaie dans un instant.' },
  }));
  await page.goto('/');
  await page.evaluate(() => window.pushToCloud());
  await page.waitForTimeout(400);

  const status = await page.evaluate(() => document.getElementById('sync-status').textContent);
  expect(status).toContain('Trop de requêtes');
  expect(status).not.toContain('connexion');
});

test('une vraie coupure reseau (hors ligne) dit explicitement "hors ligne", pas une erreur generique', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.pushToCloud());
  await page.waitForTimeout(400);

  const status = await page.evaluate(() => document.getElementById('sync-status').textContent);
  expect(status).toContain('hors ligne');
  await context.setOffline(false);
});

test('un echec generique du service (fetch qui echoue en ligne) reste neutre, sans accuser la connexion de l\'utilisateur', async ({ page }) => {
  await page.route('**/api/sync*', route => route.abort('failed'));
  await page.goto('/');
  await page.evaluate(() => window.pushToCloud());
  await page.waitForTimeout(400);

  const status = await page.evaluate(() => document.getElementById('sync-status').textContent);
  expect(status).toContain('service de synchronisation');
});
