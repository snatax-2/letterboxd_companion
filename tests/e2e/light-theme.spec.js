const { test, expect } = require('@playwright/test');

test('le theme Light se selectionne, applique sa palette et persiste', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');
  const card = page.locator('.theme-card[data-theme="light"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.click('#settings-save');

  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  const text = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-hi').trim());
  expect(bg.toLowerCase()).toBe('#f5f4f0');
  expect(text.toLowerCase()).toBe('#111111');

  const savedTheme = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme);
  expect(savedTheme).toBe('light');
});
