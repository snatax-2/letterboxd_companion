const { test, expect } = require('@playwright/test');

const DETAIL = {
  id: 42, title: 'Film Test', poster_path: '/p.jpg', release_date: '2015-06-01',
  overview: 'Un synopsis.', credits: { crew: [], cast: [] }, vote_average: 7.0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('desactiver la bascule Devine revele directement le Film du Jour', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#setting-feature-guess-game', { state: 'attached' });
  await page.locator('label:has(#setting-feature-guess-game) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(200);

  await page.click('#nav-discover');
  await page.waitForSelector('.fdj-film-title');
  await expect(page.locator('.guess-poster')).toHaveCount(0);
  await expect(page.locator('.fdj-film-title')).toContainText('Film Test');
});

test('desactiver la bascule pendant une devinette en cours revele immediatement', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-guess-game) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(300);

  await expect(page.locator('.guess-poster')).toHaveCount(0);
  await expect(page.locator('.fdj-film-title')).toBeVisible();
});

test('reactiver la bascule restaure la devinette (partie du jour non jouee)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_features', JSON.stringify({ guessGame: false })));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.fdj-film-title');
  await expect(page.locator('.guess-poster')).toHaveCount(0);

  await page.click('#settings-btn');
  await page.waitForSelector('#setting-feature-guess-game', { state: 'attached' });
  await page.locator('label:has(#setting-feature-guess-game) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(300);

  await expect(page.locator('.guess-poster')).toBeVisible();
});
