const { test, expect } = require('@playwright/test');

// 3 films notes tres haut, tous du meme realisateur (id 999) -- doit faire
// remonter ce realisateur en tete du classement des createurs preferes.
test('angle mort cible : resolution, agregation, et carte affichee', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2015', score: '9.5', mode: 'quick', values: { quick: 4.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
      { title: 'Film B', tmdbId: '2', year: '2017', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z', poster: '' },
      { title: 'Film C', tmdbId: '3', year: '2019', score: '8.5', mode: 'quick', values: { quick: 4.25 }, date: '2026-01-03', savedAt: '2026-01-03T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  const director = { id: 999, name: 'Realisateur Prefere' };
  await page.route('**/api/search?id=1', route => route.fulfill({ json: { id: 1, title: 'Film A', credits: { crew: [{ job: 'Director', ...director }], cast: [] } } }));
  await page.route('**/api/search?id=2', route => route.fulfill({ json: { id: 2, title: 'Film B', credits: { crew: [{ job: 'Director', ...director }], cast: [] } } }));
  await page.route('**/api/search?id=3', route => route.fulfill({ json: { id: 3, title: 'Film C', credits: { crew: [{ job: 'Director', ...director }], cast: [] } } }));
  await page.route('**/api/search?personId=999', route => route.fulfill({ json: {
    id: 999, name: 'Realisateur Prefere', known_for_department: 'Directing',
    movie_credits: { crew: [
      { id: 1, job: 'Director', title: 'Film A', release_date: '2015-01-01' },
      { id: 2, job: 'Director', title: 'Film B', release_date: '2017-01-01' },
      { id: 3, job: 'Director', title: 'Film C', release_date: '2019-01-01' },
      { id: 4, job: 'Director', title: 'Film D (pas vu)', release_date: '2021-01-01', poster_path: '/x.jpg' },
      { id: 5, job: 'Director', title: 'Film E (pas vu)', release_date: '2023-01-01', poster_path: '/y.jpg' },
    ], cast: [] },
  } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#blind-spots-wrap[style*="display: block"]', { timeout: 8000 });

  const cardCount = await page.locator('.blind-spot-card').count();
  console.log('nombre de cartes angle mort:', cardCount);
  expect(cardCount).toBe(1);

  const text = await page.locator('.blind-spot-highlight').textContent();
  console.log('texte carte:', text);
  expect(text).toContain('Realisateur Prefere');

  const detail = await page.locator('.blind-spot-detail').textContent();
  console.log('detail carte:', detail);
  expect(detail).toContain('9.0/10'); // moyenne de 9.5+9.0+8.5 / 3
  expect(detail).toContain('3 films');
  expect(detail).toContain('2 films'); // 2 non vus (D et E) sur 5 total

  await page.click('.blind-spot-card');
  await page.waitForSelector('#person-detail-sheet.open');
});

test('angle mort cible : section masquee si historique vide', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);
  await expect(page.locator('#blind-spots-wrap')).toBeHidden();
});

test('angle mort cible : masquee si moins de 2 films du meme realisateur', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Unique', tmdbId: '1', year: '2015', score: '9.5', mode: 'quick', values: { quick: 4.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?id=1', route => route.fulfill({ json: { id: 1, title: 'Film Unique', credits: { crew: [{ job: 'Director', id: 999, name: 'X' }], cast: [] } } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(1500);
  await expect(page.locator('#blind-spots-wrap')).toBeHidden();
});
