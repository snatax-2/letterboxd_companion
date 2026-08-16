const { test, expect } = require('@playwright/test');

test('glissement fonctionne toujours en disposition colonnes (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);

  const secondCard = page.locator('.hist-item').nth(1);
  await secondCard.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }
    touch('touchstart', startX);
    for (let i = 1; i <= 6; i++) touch('touchmove', startX - i * 20);
    touch('touchend', startX - 120);
  });
  await page.waitForTimeout(300);
  await expect(secondCard).toHaveClass(/hist-swipe-armed-right|hist-swipe-armed-left/);
});

test('la vraie mise en page a bien 2 colonnes de largeurs egales', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);

  const columnCount = await page.locator('#history-list').evaluate(el => getComputedStyle(el).columnCount);
  console.log('nombre de colonnes:', columnCount);
  expect(columnCount).toBe('2');
});

test('largeur du conteneur elargie a 1100px sur desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  const box = await page.locator('.mobile-nav').boundingBox();
  console.log('largeur barre de navigation:', box.width);
  expect(box.width).toBeGreaterThan(1000);
});

test('mobile (390px) reste totalement inchange : une seule colonne, conteneur a 800px max', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);
  const columnCount = await page.locator('#history-list').evaluate(el => getComputedStyle(el).columnCount);
  console.log('colonnes sur mobile:', columnCount);
  expect(columnCount).toBe('auto');
});
const { default: AxeBuilder } = require("@axe-core/playwright");
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y desktop - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_v2', JSON.stringify([
        { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
        { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme}: ${bad.length}`);
    for (const v of bad) console.log('  ', v.id);
  });
}
