const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

for (const theme of ['dark', 'light']) {
  test(`navigation Archives monochrome — ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: value }));
    }, theme);
    await page.goto('/');
    await page.locator('#app-splash').waitFor({ state: 'detached' });

    const styles = await page.locator('#mobile-nav').evaluate((nav) => {
      const active = nav.querySelector('.nav-btn.active');
      const inactive = nav.querySelector('.nav-btn:not(.active):not(#nav-rating)');
      const primary = nav.querySelector('#nav-rating .nav-btn-icon');
      const css = (el) => getComputedStyle(el);
      return {
        navBackground: css(nav).backgroundColor,
        activeColor: css(active).color,
        inactiveColor: css(inactive).color,
        primaryBackground: css(primary).backgroundColor,
        primaryColor: css(primary.querySelector('.icon')).color,
      };
    });

    expect(styles.navBackground).toBe('rgba(10, 10, 12, 0.78)');
    expect(styles.activeColor).toBe('rgb(250, 250, 250)');
    expect(styles.inactiveColor).toBe('rgb(154, 154, 159)');
    expect(styles.primaryBackground).toBe('rgb(250, 250, 250)');
    expect(styles.primaryColor).toBe('rgb(10, 10, 12)');
  });
}

test('Noter reste central, tactile et animé', async ({ page }) => {
  await page.goto('/');
  await page.locator('#app-splash').waitFor({ state: 'detached' });

  const primary = page.locator('#nav-rating .nav-btn-icon');
  const box = await primary.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(68);
  expect(box.height).toBeGreaterThanOrEqual(68);

  await page.click('#nav-rating');
  await expect(primary).toHaveClass(/tap-pop/);
  await expect(page.locator('#nav-rating')).toHaveAttribute('aria-current', 'page');
});

test('le switch conserve ses icônes, sa pastille et sa translation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#app-splash').waitFor({ state: 'detached' });
  await page.click('#nav-rating');

  const tabs = page.locator('.media-type-tabs');
  const slider = tabs.locator('.toggle-slider');
  const before = await slider.boundingBox();
  await expect(tabs.locator('.icon-clap')).toHaveCount(1);
  await expect(tabs.locator('.icon-tv')).toHaveCount(1);

  await page.click('#tab-media-tv');
  await expect(tabs).toHaveClass(/series-active/);
  await expect(page.locator('#tab-media-tv')).toHaveClass(/animate/);
  await page.waitForTimeout(300);
  const after = await slider.boundingBox();
  expect(after.x - before.x).toBeGreaterThan(before.width * 0.9);
});
