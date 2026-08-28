const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('chaque theme se selectionne et applique son fond', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');

  const themeNames = await page.locator('.theme-card').evaluateAll(cards => cards.map(c => c.dataset.theme));
  console.log('THEMES:', themeNames.join(', '));

  for (const name of themeNames) {
    if (name === 'system') continue; // dependent du systeme, teste a part
    const card = page.locator(`.theme-card[data-theme="${name}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(120);
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(applied, `theme ${name}`).toBe(name);
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bg, `theme ${name} doit definir --bg`).not.toBe('');
  }
});
