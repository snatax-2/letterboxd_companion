const { test, expect } = require('@playwright/test');

async function realSwipeLeft(page, locator) {
  await locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, {
        touches: type === 'touchend' ? [] : [t],
        changedTouches: [t],
        bubbles: true, cancelable: true,
      }));
    }
    touch('touchstart', startX);
    for (let i = 1; i <= 6; i++) touch('touchmove', startX - i * 20);
    touch('touchend', startX - 120);
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('glisser a gauche sur la carte de serie (sans deplier) puis confirmer supprime toute la serie', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);

  // Pas besoin de deplier les saisons pour ce geste
  const headerWrap = page.locator('.tv-show-card-header-wrap');
  await realSwipeLeft(page, headerWrap);
  await page.waitForTimeout(300);

  await expect(headerWrap).toHaveClass(/hist-swipe-armed-left/);
  const hint = headerWrap.locator('.hist-swipe-hint-left');
  await expect(hint).toBeVisible();
  await hint.click();

  // Reutilise la meme confirmation que le bouton visible
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('True Detective');
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('.tv-show-card')).toHaveCount(0);
});

test('un glissement court sur la carte ne declenche rien', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);

  const headerWrap = page.locator('.tv-show-card-header-wrap');
  await headerWrap.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }
    touch('touchstart', startX);
    touch('touchmove', startX - 20);
    touch('touchend', startX - 20);
  });
  await page.waitForTimeout(300);
  await expect(headerWrap).not.toHaveClass(/hist-swipe-armed-left/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(1);
});

test('glisser une SAISON individuelle fonctionne toujours independamment (pas de conflit)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);

  const seasonRow = page.locator('.tv-season-row').first();
  await realSwipeLeft(page, seasonRow);
  await page.waitForTimeout(300);
  await expect(seasonRow).toHaveClass(/hist-swipe-armed-left/);

  // La carte elle-meme ne doit pas etre armee
  const headerWrap = page.locator('.tv-show-card-header-wrap');
  await expect(headerWrap).not.toHaveClass(/hist-swipe-armed-left/);
});

test('le bouton supprimer visible fonctionne toujours en plus du glissement', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite glissement carte serie - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    const headerWrap = page.locator('.tv-show-card-header-wrap');
    await realSwipeLeft(page, headerWrap);
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
