const { test, expect } = require('@playwright/test');

test('des donnees ancienne forme sont migrees au chargement (version, sauvegarde, normalisation)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    // Ancienne forme : pas de savedAt, pas de values, pas de version stockee
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Vieux Film', year: '1999', score: '7.0', mode: 'quick', date: '2020-05-10' },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(400);

  const version = await page.evaluate(() => localStorage.getItem('lbx_schema_version'));
  expect(version).toBe('2');

  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(history[0].savedAt).toBe('2020-05-10T12:00:00.000Z');
  expect(history[0].values).toEqual({});

  // La sauvegarde pre-migration contient l'etat d'AVANT
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_pre_migration_backup')));
  expect(backup.fromVersion).toBe(1);
  const backupHistory = JSON.parse(backup.history);
  expect(backupHistory[0].savedAt).toBeUndefined();

  // L'app fonctionne normalement avec les donnees migrees
  await page.click('#nav-history');
  await expect(page.locator('.hist-title').first()).toContainText('Vieux Film');
});

test('donnees deja a jour : aucune re-migration, pas de nouvelle sauvegarde', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_schema_version', '2');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film', year: '2024', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(400);

  const backup = await page.evaluate(() => localStorage.getItem('lbx_pre_migration_backup'));
  expect(backup).toBeNull(); // la chaine ne s'est pas relancee
});
