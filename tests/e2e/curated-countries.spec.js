const { test, expect } = require('@playwright/test');

test('carte du monde : pastilles, pourcentage, ouverture fiche pays', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Parasite', tmdbId: '496243', year: '2019', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search?countryCode=*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?countryCode=KR*', route => route.fulfill({ json: { results: [
    { id: 496243, title: 'Parasite', poster_path: '/p1.jpg', release_date: '2019-05-30' },
    { id: 111, title: 'Autre Film Coreen', poster_path: '/p2.jpg', release_date: '2016-06-08' },
  ] } }));
  await page.route('**/api/search?decadeTop=*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?studioId=*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?query=*', route => route.fulfill({ json: { results: [] } }));

  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('#curated-lists-card');

  const accordions = await page.locator('.curated-decades-accordion').count();
  console.log('nombre d\'accordeons (decennies+studios+pays):', accordions);
  expect(accordions).toBe(3);

  await page.locator('.curated-decades-accordion summary').nth(2).click(); // pays
  await page.waitForTimeout(800);
  const pinCount = await page.locator('.curated-map-pin').count();
  console.log('nombre de pastilles pays:', pinCount);
  expect(pinCount).toBe(8);

  const krPct = await page.locator('#curated-pct-country-KR').textContent();
  console.log('pourcentage Coree du Sud (1 vu sur 2):', krPct);
  expect(krPct).toBe('50%');

  await page.click('.curated-map-pin[data-list-id="country-KR"]');
  await page.waitForSelector('#curated-list-sheet.open');
  const title = await page.locator('#cls-title').textContent();
  console.log('titre de la fiche pays:', title);
  const years = await page.locator('#curated-list-sheet .pds-film-year').allTextContents();
  console.log('annees affichees:', years);
  expect(years.sort()).toEqual(['2016', '2019']);
});
