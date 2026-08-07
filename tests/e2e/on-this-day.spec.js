const { test, expect } = require('@playwright/test');

test('Ce jour-la : affiche les anniversaires trouves, avec badge et lien fiche', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?onThisDay=1', route => route.fulfill({ json: { anniversaries: [
    { yearsAgo: 20, year: 2006, films: [{ id: 42, title: 'Vieux Film', poster_path: '/p1.jpg' }] },
    { yearsAgo: 40, year: 1986, films: [{ id: 43, title: 'Tres Vieux Film', poster_path: '/p2.jpg' }] },
  ] } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#on-this-day-wrap[style*="display: block"]', { timeout: 5000 });

  const itemCount = await page.locator('.on-this-day-item').count();
  console.log('nombre d\'anniversaires affiches:', itemCount);
  expect(itemCount).toBe(2);

  const badges = await page.locator('.on-this-day-badge').allTextContents();
  console.log('badges:', badges);
  expect(badges).toEqual(['Il y a 20 ans', 'Il y a 40 ans']);

  await page.route('**/api/search?id=42', route => route.fulfill({ json: { id: 42, title: 'Vieux Film', genres: [], credits: { crew: [], cast: [] } } }));
  await page.click('.on-this-day-item[data-movie-id="42"]');
  await page.waitForSelector('#movie-detail-sheet.open');
});

test('Ce jour-la : section masquee si aucun anniversaire trouve', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?onThisDay=1', route => route.fulfill({ json: { anniversaries: [] } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);
  await expect(page.locator('#on-this-day-wrap')).toBeHidden();
});
