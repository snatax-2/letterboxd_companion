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
    if (name === 'system' || name === 'meridien') continue; // dependent du systeme/heure, testes a part
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

test('touches signatures: noir grise les affiches, scuderia raye les cartes, anderson encadre', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Film', year: '1994', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-10', savedAt: '2026-07-10T10:00:00.000Z', poster: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' },
  ])));
  await page.goto('/');

  async function applyTheme(name) {
    await page.evaluate((n) => {
      document.documentElement.setAttribute('data-theme', n);
    }, name);
    await page.waitForTimeout(100);
  }

  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  await applyTheme('filmnoir');
  const filter = await page.locator('.hist-item img').first().evaluate(el => getComputedStyle(el).filter);
  expect(filter).toContain('grayscale(1)');
  const vignette = await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
  expect(vignette).toContain('radial-gradient');

  await applyTheme('scuderia');
  const borderLeft = await page.locator('.card').first().evaluate(el => getComputedStyle(el).borderLeftWidth);
  expect(borderLeft).toBe('3px');

  await applyTheme('anderson');
  const outline = await page.locator('.card').first().evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
});
