const { test, expect } = require('@playwright/test');

// Correctifs issus de l'audit design (safe areas, epuration, barre d'onglets,
// ergonomie tactile) — verifie que chaque point corrige reellement quelque
// chose de tangible plutot que de simplement exister dans le code.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('epuration : Export/Import retires de l\'en-tete, deplaces dans Profil et fonctionnels', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.goto('/');
  await expect(page.locator('.app-header #export-btn')).toHaveCount(0);
  await expect(page.locator('.app-header #import-trigger')).toHaveCount(0);

  await page.click('#nav-profile');
  await expect(page.locator('#export-btn')).toBeVisible();
  await expect(page.locator('#import-trigger')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 3000 }),
    page.click('#export-btn'),
  ]);
  expect(download.suggestedFilename()).toContain('ludex-backup');
});

test('epuration : badge "Mode detaille" en double retire, sans casser le changement de mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#mode-badge')).toHaveCount(0);
  // Le changement de mode doit toujours fonctionner (verifie l'absence de
  // regression suite au retrait de la ligne JS qui ciblait ce badge)
  await page.click('#tab-quick');
  await expect(page.locator('#tab-quick')).toHaveClass(/active/);
  await page.click('#tab-detail');
  await expect(page.locator('#tab-detail')).toHaveClass(/active/);
});

test('epuration : sous-titre "Contexte de visionnage" present au-dessus des etiquettes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.context-row-label')).toHaveText('Contexte de visionnage');
});

test('ergonomie : chevron sur "Personnaliser les ponderations" pivote a l\'ouverture', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-rating');
  const before = await page.locator('#weights-toggle-chevron').evaluate(el => getComputedStyle(el).transform);
  await page.click('#weights-toggle');
  await page.waitForTimeout(300);
  const after = await page.locator('#weights-toggle-chevron').evaluate(el => getComputedStyle(el).transform);
  expect(after).not.toBe(before);
});

test('bouton Noter : texte integre au cercle (pas de libelle externe separe)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.nav-btn-primary .nav-btn-primary-label')).toHaveText('Noter');
  // Le bouton n'a plus de texte flottant en dehors du cercle
  const outerText = await page.locator('#nav-rating').evaluate(el => {
    const clone = el.cloneNode(true);
    clone.querySelector('.nav-btn-icon')?.remove();
    return clone.textContent.trim();
  });
  expect(outerText).toBe('');
});

test('accessibilite : zero violation serieuse sur Notation et Profil apres les correctifs', async ({ page }) => {
  const AxeBuilder = require('@axe-core/playwright').default;
  await page.goto('/');
  await page.waitForTimeout(1400);
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);

  await page.click('#nav-profile');
  await page.waitForTimeout(300);
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);
});
