// Swipe sur les cartes de la watchlist : retrait par glissement, et
// isolation vis-à-vis du swipe global de changement d'onglet.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.saveWatchlist([
      { title: 'Film Watchlist Un', tmdbId: '1', addedAt: new Date().toISOString(), poster: '' },
      { title: 'Film Watchlist Deux', tmdbId: '2', addedAt: new Date().toISOString(), poster: '' },
    ]);
    window.renderWatchlist();
  });
  await page.click('#nav-watchlist');
});

test('swiper une carte de la watchlist vers la gauche la retire (avec annulation possible)', async ({ page }) => {
  const card = page.locator('.wl-card').first();
  const box = await card.boundingBox();
  await card.evaluate((el, box) => {
    const ev1 = new Event('touchstart', { bubbles: true });
    ev1.touches = [{ clientX: box.x + box.width - 20, clientY: box.y + box.height / 2 }];
    el.dispatchEvent(ev1);
  }, box);
  await page.waitForTimeout(50);
  await card.evaluate((el, box) => {
    const ev2 = new Event('touchmove', { bubbles: true });
    ev2.touches = [{ clientX: box.x + 20, clientY: box.y + box.height / 2 }];
    el.dispatchEvent(ev2);
  }, box);
  await page.waitForTimeout(50);
  await card.evaluate((el, box) => {
    const ev3 = new Event('touchend', { bubbles: true });
    ev3.changedTouches = [{ clientX: box.x + 20, clientY: box.y + box.height / 2 }];
    el.dispatchEvent(ev3);
  }, box);

  await page.waitForTimeout(400); // laisse l'animation de sortie se terminer

  const titles = await page.locator('.wl-title').allTextContents();
  expect(titles.length).toBe(1);

  // Le toast d'annulation doit être visible et fonctionnel.
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/show/);
  await page.click('.toast-undo-btn');
  await page.waitForTimeout(200);
  const titlesAfterUndo = await page.locator('.wl-title').allTextContents();
  expect(titlesAfterUndo.length).toBe(2);
});

test('glisser sur une carte watchlist ne change pas d\'onglet', async ({ page }) => {
  const card = page.locator('.wl-card').first();
  const box = await card.boundingBox();
  await card.evaluate((el, box) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      ev.changedTouches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const y = box.y + box.height / 2;
    el.dispatchEvent(touchEvent('touchstart', box.x + box.width - 20, y));
    el.dispatchEvent(touchEvent('touchend', box.x + 20, y));
  }, box);
  await expect(page.locator('#nav-watchlist')).toHaveClass(/active/);
});
