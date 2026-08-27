const { test, expect } = require('@playwright/test');

// Ces tests ne PINGLENT PLUS le numero de version du schema. Ils le faisaient
// (toBe('2')), et chaque nouvelle migration les faisait echouer sans que rien
// ne soit casse : le numero est un detail d'implementation, ce qui compte est
// que la chaine se soit executee et que les donnees aient la bonne forme.
// Le second test lit meme la version que l'app vient d'ecrire, plutot que de
// la coder en dur — il reste donc valide quel que soit le nombre de
// migrations a venir.

// Polices Google bloquees : elles mettent une dizaine de secondes a resoudre
// sur ce runner, et ce fichier enchaine plusieurs chargements de page. Aucun
// rapport avec les migrations testees ici.
async function bloquerPolices(page) {
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
}

test('des donnees ancienne forme sont migrees au chargement (version, sauvegarde, normalisation)', async ({ page }) => {
  await bloquerPolices(page);
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    // Ancienne forme : pas de savedAt, pas de values, pas de version stockee
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Vieux Film', year: '1999', score: '7.0', mode: 'quick', date: '2020-05-10' },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(400);

  // La chaine a tourne jusqu'au bout : au moins jusqu'a v2, celle qui
  // normalise l'historique et dont ce test verifie l'effet juste en dessous.
  const version = await page.evaluate(() => localStorage.getItem('lbx_schema_version'));
  expect(Number(version)).toBeGreaterThanOrEqual(2);

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
  await expect(page.locator('.hist-item .hist-item-open').first()).toHaveAttribute('aria-label', /Vieux Film/);
});

test('donnees deja a jour : aucune re-migration, pas de nouvelle sauvegarde', async ({ page }) => {
  await bloquerPolices(page);
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));

  // Premier chargement a vide : l'app ecrit elle-meme la version courante.
  // On la LIT au lieu de la coder en dur — c'est ce qui rend ce test
  // insensible aux migrations futures.
  await page.goto('/');
  await page.waitForTimeout(400);
  const versionCourante = await page.evaluate(() => localStorage.getItem('lbx_schema_version'));
  expect(versionCourante, "l'app doit ecrire une version de schema").toBeTruthy();

  // Second chargement, cette fois avec des donnees DEJA a jour.
  await page.evaluate((v) => {
    localStorage.setItem('lbx_schema_version', v);
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film', year: '2024', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
    ]));
    localStorage.removeItem('lbx_pre_migration_backup');
  }, versionCourante);
  await page.reload();
  await page.waitForTimeout(400);

  const backup = await page.evaluate(() => localStorage.getItem('lbx_pre_migration_backup'));
  expect(backup, 'la chaine ne doit pas se relancer sur des donnees a jour').toBeNull();
});
