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

// ── v4 : retrait de quatre thèmes historiques ──
// Ce qui se passe SANS migration mérite d'être dit, parce que c'est subtil :
// 02-theme.js sait retomber sur un thème valide, donc l'app s'afficherait
// correctement. Mais le réglage STOCKÉ garderait « carnet », donc l'écran
// Réglages n'aurait aucune carte sélectionnée (la sélection se fait par
// data-theme), et le prochain enregistrement écrirait alors le thème de la
// première carte au lieu du choix réel de l'utilisateur.
for (const [avant, apres] of [
  ['carnet', 'ludex-light'],
  ['moderne', 'ludex-light'],
  ['filmnoir', 'ludex-dark'],
  ['default', 'ludex-dark'],
]) {
  test(`migration : le thème ${avant} devient ${apres}, et la carte suit`, async ({ page }) => {
    await bloquerPolices(page);
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_schema_version', '3');
      localStorage.setItem('lbx_settings', JSON.stringify({ appName: 'LUD<em>e</em>X', theme: t }));
    }, avant);
    await page.goto('/');
    await page.waitForTimeout(600);

    const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings')).theme);
    expect(stocke, 'le réglage enregistré doit être réécrit').toBe(apres);
    await expect(page.locator('html')).toHaveAttribute('data-theme', apres);

    // Le point qui compte : la carte du thème est bien sélectionnée, donc un
    // enregistrement ultérieur ne trahira pas le choix de l'utilisateur.
    await page.click('#settings-btn');
    await page.waitForSelector('#settings-modal.open');
    await expect(page.locator('.theme-card.selected')).toHaveAttribute('data-theme', apres);
  });
}

test('un thème conservé n\'est pas touché par la migration', async ({ page }) => {
  await bloquerPolices(page);
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_schema_version', '3');
    localStorage.setItem('lbx_settings', JSON.stringify({ appName: 'LUD<em>e</em>X', theme: 'technicolor' }));
  });
  await page.goto('/');
  await page.waitForTimeout(600);
  const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings')).theme);
  expect(stocke).toBe('technicolor');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'technicolor');
});

test('« Auto (Système) » rend enfin un thème CLAIR quand le système est clair', async ({ page }) => {
  // Défaut réel corrigé au passage : la paire était default (sombre) /
  // filmnoir (#050505, sombre AUSSI). La branche « clair » n'a jamais rendu
  // un thème clair.
  await bloquerPolices(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_settings', JSON.stringify({ appName: 'LUD<em>e</em>X', theme: 'system' }));
  });
  await page.goto('/');
  await page.waitForTimeout(600);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ludex-light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(400);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ludex-dark');
});
