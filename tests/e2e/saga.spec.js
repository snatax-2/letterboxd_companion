const { test, expect } = require('@playwright/test');

const FILM1 = {
  id: 100, title: 'Saga Film 1', poster_path: '/f1.jpg', release_date: '2010-01-01',
  overview: 'Synopsis', credits: { crew: [], cast: [] }, vote_average: 7.0, genres: [],
  belongs_to_collection: { id: 999, name: 'La Saga Test', poster_path: '/s.jpg' },
};
const COLLECTION = {
  id: 999, name: 'La Saga Test', parts: [
    { id: 100, title: 'Saga Film 1', poster_path: '/f1.jpg', release_date: '2010-01-01' },
    { id: 101, title: 'Saga Film 2', poster_path: '/f2.jpg', release_date: '2013-01-01' },
  ],
};

test('bande saga en bas de fiche + ouverture de la fiche saga complete', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Saga Film 1', tmdbId: '100', year: '2010', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search?id=100', route => route.fulfill({ json: FILM1 }));
  await page.route('**/api/search?collectionId=999', route => route.fulfill({ json: COLLECTION }));
  await page.route('**/api/search?id=101', route => route.fulfill({ json: { id: 101, title: 'Saga Film 2', genres: [], credits: { crew: [], cast: [] } } }));

  await page.goto('/');
  await page.evaluate(() => openMovieDetailSheet(100));
  await page.waitForSelector('#mds-saga-strip');
  await page.waitForTimeout(500);

  const stripItems = await page.locator('.mds-saga-item').count();
  console.log('films dans la bande saga:', stripItems);
  await expect(page.locator('.mds-saga-item.current')).toBeVisible();

  await page.click('#mds-saga-link');
  await page.waitForSelector('#curated-list-sheet.open');
  const title = await page.locator('#cls-title').textContent();
  console.log('titre de la fiche saga:', title);
  const gridCount = await page.locator('#curated-list-sheet .pds-film-item').count();
  const seenCount = await page.locator('#curated-list-sheet .pds-film-item.seen').count();
  console.log('films dans la grille:', gridCount, '| deja vus:', seenCount);
});
