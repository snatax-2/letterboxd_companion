const { test, expect } = require('@playwright/test');

async function realSwipe(page, locator, direction) {
  await locator.evaluate((el, dir) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    const sign = dir === 'left' ? -1 : 1;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, {
        touches: type === 'touchend' ? [] : [t],
        changedTouches: [t],
        bubbles: true, cancelable: true,
      }));
    }
    touch('touchstart', startX);
    for (let i = 1; i <= 6; i++) touch('touchmove', startX + sign * i * 20);
    touch('touchend', startX + sign * 120);
  }, direction);
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

test('glisser a gauche puis taper l\'indice SUPPRIME la saison', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);

  const firstRow = page.locator('.tv-season-row').first();
  await realSwipe(page, firstRow, 'left');
  await page.waitForTimeout(300);

  await expect(firstRow).toHaveClass(/hist-swipe-armed-left/);
  const hint = firstRow.locator('.hist-swipe-hint-left');
  await expect(hint).toBeVisible();
  await hint.click();
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(Object.keys(stored[0].seasons)).toEqual(['2']); // saison 1 (premiere ligne) retiree
});

test('glisser a droite puis taper l\'indice ROUVRE la saison pour la noter', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);

  const firstRow = page.locator('.tv-season-row').first();
  await realSwipe(page, firstRow, 'right');
  await page.waitForTimeout(300);

  await expect(firstRow).toHaveClass(/hist-swipe-armed-right/);
  const hint = firstRow.locator('.hist-swipe-hint-right');
  await hint.click();
  await page.waitForTimeout(500);

  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
  await expect(page.locator('#notation-card')).toBeVisible();
});

test('un glissement court (sous le seuil) revient a sa place sans rien declencher', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);

  const firstRow = page.locator('.tv-season-row').first();
  await firstRow.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }
    touch('touchstart', startX);
    touch('touchmove', startX - 20); // sous le seuil de 80px
    touch('touchend', startX - 20);
  });
  await page.waitForTimeout(300);

  await expect(firstRow).not.toHaveClass(/hist-swipe-armed-left/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(Object.keys(stored[0].seasons)).toEqual(['1', '2']); // rien retire
});

test('le bouton supprimer visible fonctionne toujours en plus du glissement', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);
  await page.click('.tv-season-delete-btn >> nth=0');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(Object.keys(stored[0].seasons)).toEqual(['2']);
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite glissement saison - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        } },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    await page.click('.tv-show-seasons-fold summary');
    await page.waitForTimeout(300);
    const firstRow = page.locator('.tv-season-row').first();
    await realSwipe(page, firstRow, 'left');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
