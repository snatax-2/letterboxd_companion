const { test, expect } = require('@playwright/test');
test('les badges sont plies par defaut avec compteur, et se deplient', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film', year: '2024', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-10', savedAt: '2026-07-10T10:00:00.000Z' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForTimeout(400);

  const fold = page.locator('#badges-fold');
  expect(await fold.evaluate(el => el.open)).toBe(false);
  await expect(page.locator('#badges-count')).toContainText('/');
  const gridVisible = await page.locator('#badges-grid').isVisible();
  expect(gridVisible).toBe(false);

  await page.locator('.badges-summary').click();
  await expect(page.locator('#badges-grid')).toBeVisible();
  const badgeCount = await page.locator('.badge-item').count();
  expect(badgeCount).toBeGreaterThan(3);
});
