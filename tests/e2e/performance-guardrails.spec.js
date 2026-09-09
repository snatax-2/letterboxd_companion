const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('le DOM initial reste sous son budget et les rendus sont mesures localement', async ({ page }) => {
  await page.goto('/');
  await page.locator('#app-splash').waitFor({ state: 'detached' });
  await page.waitForFunction(() => typeof window.getLudexPerformanceSummary === 'function');

  const result = await page.evaluate(() => {
    window.renderAll();
    window.renderAll();
    return {
      nodes: document.querySelectorAll('*').length,
      summary: window.getLudexPerformanceSummary(),
    };
  });

  expect(result.nodes).toBeLessThanOrEqual(1_200);
  expect(result.summary.renderAll.count).toBeGreaterThanOrEqual(2);
  expect(result.summary.renderAll.averageMs).toBeGreaterThanOrEqual(0);
  expect(result.summary.renderAll.p95Ms).toBeGreaterThanOrEqual(0);
});
