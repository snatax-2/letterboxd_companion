const { test, expect } = require('@playwright/test');

test('accordeon studios : rendu, pourcentage, et annee correctement extraite (regression)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Toy Story', tmdbId: '862', year: '1995', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  // Donnees brutes TMDb discover (release_date seulement, PAS de champ year
  // pre-extrait) -- exactement la forme reelle qui a revele le bug.
  await page.route('**/api/search?studioId=3*', route => route.fulfill({ json: { results: [
    { id: 862, title: 'Toy Story', poster_path: '/p1.jpg', release_date: '1995-11-22' },
    { id: 863, title: 'Toy Story 2', poster_path: '/p2.jpg', release_date: '1999-11-24' },
  ] } }));
  await page.route('**/api/search?decadeTop=*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?query=*', route => route.fulfill({ json: { results: [] } }));

  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('#curated-lists-card');

  const accordions = await page.locator('.curated-decades-accordion').count();
  expect(accordions).toBe(3); // decennies + studios + pays

  await page.click('.curated-decades-accordion:nth-of-type(2) summary'); // deplie l'accordeon studios
  await page.waitForTimeout(800);
  const pctText = await page.locator('#curated-pct-studio-3').textContent();
  console.log('pourcentage Pixar (1 vu sur 2):', pctText);
  expect(pctText).toBe('50%');

  await page.click('.curated-list-row[data-list-id="studio-3"]');
  await page.waitForSelector('#curated-list-sheet.open');
  const years = await page.locator('#curated-list-sheet .pds-film-year').allTextContents();
  console.log('annees affichees dans la grille:', years);
  expect(years).toEqual(['1995', '1999']); // pas vides -- verrouille le correctif
});
