const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-rating');
});

test('titres à gauche et focus visuellement distinct', async ({ page }) => {
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const title = await page.locator('#film-card-title').boundingBox();
    const column = await page.locator('#col-rating').boundingBox();
    expect(Math.abs(title.x - column.x)).toBeLessThan(3);
  }
  const focus = page.locator('#focus-mode-toggle');
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
  const active = await focus.evaluate(el => getComputedStyle(el).backgroundColor);
  await focus.click();
  await expect(focus).toHaveAttribute('aria-pressed', 'false');
  expect(await focus.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(active);
  await focus.click();
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
});

test('confirmation commune, rejouable et sans mouvement si demandé', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const type of ['movie', 'tv']) {
    await page.evaluate(type => { setMediaType(type); playSaveConfirmation(); }, type);
    await expect(page.locator('.save-confirm-mark')).toContainText(type === 'tv' ? 'Saison enregistrée' : 'Film enregistré');
    await expect(page.locator('.save-confirm-overlay')).toHaveCount(1);
    expect(await page.locator('.save-confirm-mark').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  }
  await expect(page.locator('.save-confirm-overlay')).toHaveCount(0, { timeout: 2500 });
});
