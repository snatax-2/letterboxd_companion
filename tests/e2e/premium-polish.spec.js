const { test, expect } = require('@playwright/test');
test('le meta theme-color suit le theme actif', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.waitForTimeout(300);
  const initial = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(initial).toBe('#14181c'); // --bg du theme par defaut

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'technicolor'));
  await page.waitForTimeout(200);
  const tech = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(tech).toBe('#101425'); // --bg technicolor
});
test('les polices sont chargees depuis le head avec preconnect', async ({ page }) => {
  await page.goto('/');
  const preconnects = await page.locator('link[rel="preconnect"]').count();
  expect(preconnects).toBe(2);
  const fontLink = await page.locator('link[rel="stylesheet"][href*="fonts.googleapis"]').count();
  expect(fontLink).toBe(1);
});
