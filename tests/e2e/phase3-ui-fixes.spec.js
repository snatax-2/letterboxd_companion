const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('les puces de theme restent cliquables et fonctionnelles avec les nouvelles icones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?themeId=10051**', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(700);
  await expect(page.locator('.theme-chip')).toHaveCount(8);
  await expect(page.locator('.theme-chip svg')).toHaveCount(8);
  await expect(page.locator('.theme-chip').first()).toContainText('Braquage');
  await page.click('.theme-chip >> nth=0');
  await page.waitForTimeout(500);
  await expect(page.locator('#curated-list-sheet')).toHaveClass(/open/);
  await expect(page.locator('#curated-list-sheet')).toContainText('Braquage');
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y puces de theme - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme}: ${bad.length} violation(s)`);
    for (const v of bad) console.log('  ', v.id);
  });
}

test('etats vides compacts (Profil) toujours corrects apres migration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);

  const dirText = await page.locator('#top-directors-list').textContent();
  expect(dirText).toContain('Enregistrez plus de films');
  const distText = await page.locator('#histogram').textContent();
  expect(distText).toContain('Note quelques films');

  await expect(page.locator('#top-directors-list .empty-state-compact')).toBeVisible();
  await expect(page.locator('#histogram .empty-state-compact')).toBeVisible();
});

test('les etats vides riches (deja fonctionnels) restent inchanges', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await expect(page.locator('#empty-state-history-cta')).toBeVisible();
  await expect(page.locator('.empty-state-icon').first()).toBeVisible();
  await page.click('#empty-state-history-cta');
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toBeFocused();
});
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y phase3 complete - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    let results = await new AxeBuilder({ page }).analyze();
    let bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} decouvrir: ${bad.length}`);
    await page.click('#nav-profile');
    await page.waitForTimeout(700);
    results = await new AxeBuilder({ page }).analyze();
    bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} profil: ${bad.length}`);
  });
}
