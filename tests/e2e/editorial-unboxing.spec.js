const { test, expect } = require('@playwright/test');

const HISTORY = [{
  title: 'In the Mood for Love',
  year: '2000',
  runtime: '98 min',
  genre: 'Drame',
  director: 'Wong Kar-wai',
  actors: 'Tony Leung, Maggie Cheung',
  score: '9.0',
  mode: 'quick',
  values: { quick: 4.5 },
  date: '2026-08-20',
  savedAt: '2026-08-20T20:00:00.000Z',
  review: '',
  poster: '',
}];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((history) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify(history));
  }, HISTORY);
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

for (const theme of ['dark', 'light']) {
  test(`les ecrans sont unboxes sans aplatir les surfaces fonctionnelles — ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: value }));
    }, theme);
    await page.goto('/');
    await page.waitForTimeout(500);

    const discover = await page.locator('#discover-card-wrap').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderTop: style.borderTopWidth,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        padding: style.padding,
      };
    });
    expect(discover).toEqual({
      background: 'rgba(0, 0, 0, 0)',
      borderTop: '0px',
      radius: '0px',
      shadow: 'none',
      padding: '0px',
    });

    await page.click('#nav-history');
    const historyCard = page.locator('.hist-grid-card').first();
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toHaveCSS('border-radius', '2px');

    await page.click('#nav-profile');
    await expect(page.locator('#stats-card')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.dash-box').first()).toHaveCSS('border-top-width', '0px');

    await page.click('#settings-btn');
    const modal = page.locator('#settings-modal .modal-box');
    await expect(modal).toBeVisible();
    const modalSurface = await modal.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderTop: style.borderTopWidth,
        shadow: style.boxShadow,
      };
    });
    expect(modalSurface.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(modalSurface.borderTop).toBe('1px');
    expect(modalSurface.shadow).not.toBe('none');
  });
}

test('les deux sections de Noter restent separees sans redevenir des cartes', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-rating');

  await expect(page.locator('#col-rating > .card').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('#notation-card')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('#notation-card')).toHaveCSS('box-shadow', 'none');
});
