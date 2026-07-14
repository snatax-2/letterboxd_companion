const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 999, title: 'Nouveau Film', genres: [] } });
  });
});

test('choisir une liste existante ajoute le film dedans (pas forcement la liste active)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.saveWatchlistsMeta([{ id: 'list-a', name: 'Films du weekend' }, { id: 'list-b', name: 'A revoir' }]);
    localStorage.setItem('lbx_active_watchlist_id', 'list-a');
  });
  await page.evaluate(() => {
    window.addToWatchlistFromTMDb({ id: 999, title: 'Nouveau Film', poster_path: null }, 2024);
  });
  await page.waitForSelector('#wl-picker-modal.open');

  const items = await page.locator('.wl-picker-item').allTextContents();
  expect(items.some(t => t.includes('Films du weekend'))).toBe(true);
  expect(items.some(t => t.includes('A revoir'))).toBe(true);

  // Choisit la liste INACTIVE (list-b) pour verifier que ca marche meme si ce n'est pas la liste active
  await page.locator('.wl-picker-item', { hasText: 'A revoir' }).click();
  await expect(page.locator('#wl-picker-modal')).not.toHaveClass(/open/);

  const listB = await page.evaluate(() => window.loadWatchlist('list-b'));
  expect(listB.some(f => f.title === 'Nouveau Film')).toBe(true);
  const listA = await page.evaluate(() => window.loadWatchlist('list-a'));
  expect(listA.some(f => f.title === 'Nouveau Film')).toBe(false);
});

test('creer une nouvelle liste a la volee ajoute le film dedans', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.saveWatchlistsMeta([{ id: 'list-a', name: 'Films du weekend' }]);
  });
  await page.evaluate(() => {
    window.addToWatchlistFromTMDb({ id: 999, title: 'Nouveau Film', poster_path: null }, 2024);
  });
  await page.waitForSelector('#wl-picker-modal.open');

  await page.click('#wl-picker-new-btn');
  await page.fill('#wl-picker-new-input', 'Films de Noel');
  await page.click('#wl-picker-new-confirm');

  await expect(page.locator('#wl-picker-modal')).not.toHaveClass(/open/);

  const meta = await page.evaluate(() => window.loadWatchlistsMeta());
  const newList = meta.find(l => l.name === 'Films de Noel');
  expect(newList).toBeTruthy();

  const items = await page.evaluate((id) => window.loadWatchlist(id), newList.id);
  expect(items.some(f => f.title === 'Nouveau Film')).toBe(true);
});
