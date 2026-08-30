const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_watchlists_meta', JSON.stringify([{ id: 'default', name: 'À voir' }]));
    localStorage.setItem('lbx_tv_watchlists_meta', JSON.stringify([{ id: 'default', name: 'À voir' }]));
    localStorage.setItem('lbx_watchlist_default', JSON.stringify([{ title: 'Heat', tmdbId: 949, poster: '' }]));
    localStorage.setItem('lbx_tv_watchlist_default', JSON.stringify([{ title: 'Severance', tmdbId: 95396, poster: '' }]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/#watchlist');
  await expect(page.locator('#view-watchlist')).toHaveClass(/active/);
});

test('menu discret au survol, clic droit et focus restauré au clavier', async ({ page }) => {
  const poster = page.locator('.wl-card-open').first();
  const menu = page.locator('.wl-menu-btn').first();
  await page.mouse.move(0, 0);
  await expect(menu).toHaveCSS('opacity', '0');
  await poster.hover();
  await expect(menu).toHaveCSS('opacity', '1');
  const desktopSurface = await menu.evaluate(element => ({
    content: getComputedStyle(element, '::before').content,
    blur: getComputedStyle(element, '::before').backdropFilter,
  }));
  expect(desktopSurface.content).not.toBe('none');
  expect(desktopSurface.blur).toBe('blur(8px)');
  await poster.click({ button: 'right' });
  await expect(page.locator('#action-sheet')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(poster).toBeFocused();
  await poster.press('Shift+F10');
  await expect(page.locator('#action-sheet')).toHaveClass(/open/);
  await page.locator('#action-sheet-cancel').press('Tab');
  await expect(page.locator('#action-sheet .action-sheet-item').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await poster.press('Tab');
  await expect(menu).toBeFocused();
  await menu.press('Enter');
  await expect(page.locator('#action-sheet')).toHaveClass(/open/);
});

for (const media of ['movie', 'tv']) {
  test(`Noter affiche le bon formulaire sur desktop : ${media}`, async ({ page }) => {
    // Le mode précédent ne doit pas masquer le formulaire du film choisi.
    await page.evaluate(() => setMediaType('tv'));
    if (media === 'tv') await page.click('#wl-tab-tv');
    const poster = page.locator(media === 'tv' ? '#wl-tv-list .wl-card-open' : '#watchlist-list .wl-card-open').first();
    await poster.press('Shift+F10');
    await page.locator('#action-sheet').getByRole('button', { name: 'Noter', exact: true }).click();
    await expect(page.locator('#nav-rating')).toHaveClass(/active/);
    const input = page.locator(media === 'tv' ? '#tv-search' : '#movie-search');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(media === 'tv' ? 'Severance' : 'Heat');
    await expect(page.locator('#action-sheet')).not.toHaveClass(/open/);
  });
}
