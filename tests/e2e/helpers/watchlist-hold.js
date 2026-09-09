const { expect } = require('@playwright/test');

// Vrais événements tactiles Chromium : couvre Pointer Events et clic de relâchement.
async function holdWatchlistPoster(page, poster = page.locator('.wl-card-open').first()) {
  await poster.scrollIntoViewIfNeeded();
  const box = await poster.boundingBox();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await expect(page.locator('#action-sheet')).toHaveClass(/open/);
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
  await expect(page.locator('#action-sheet')).toHaveClass(/open/);
}

module.exports = { holdWatchlistPoster };
