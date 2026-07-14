const { test, expect } = require('@playwright/test');

test('le theme Technicolor se selectionne et applique les bonnes couleurs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');
  const card = page.locator('.theme-card[data-theme="technicolor"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.click('#settings-save');

  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  const red = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--red').trim());
  expect(bg.toLowerCase()).toBe('#101425');
  expect(red.toLowerCase()).toBe('#df2935');

  const savedTheme = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme);
  expect(savedTheme).toBe('technicolor');
});
