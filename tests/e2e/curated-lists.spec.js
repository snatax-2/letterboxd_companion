const { test, expect } = require('@playwright/test');

test('carte Classiques a explorer : rendu et pourcentages', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Citizen Kane', tmdbId: '15', year: '1941', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  // Mock d'une decennie avec un film DEJA dans l'historique (id 15 = Citizen Kane)
  await page.route('**/api/search?decadeTop=*', route => route.fulfill({ json: { results: [
    { id: 15, title: 'Citizen Kane', poster_path: '/p1.jpg', release_date: '1941-05-01', vote_average: 8.3 },
    { id: 999, title: 'Autre Film', poster_path: '/p2.jpg', release_date: '1945-01-01', vote_average: 8.0 },
  ] } }));
  // Mock de la resolution "tous les temps" : renvoie une correspondance pour chaque requete
  await page.route('**/api/search?query=*', route => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('query');
    return route.fulfill({ json: { results: [{ id: 1000, title: q, poster_path: '/x.jpg', release_date: '1975-01-01' }] } });
  });

  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('#curated-lists-card');

  const rowCount = await page.locator('.curated-list-row').count();
  console.log('nombre de listes au total (dont repliees):', rowCount);
  expect(rowCount).toBe(25); // 1 tous-les-temps + 11 decennies + 5 studios + 8 pays

  const accordionOpen = await page.locator('.curated-decades-accordion').first().evaluate(el => el.open);
  console.log('accordeon decennies ouvert par defaut:', accordionOpen);
  expect(accordionOpen).toBe(false);
  const visibleRows = await page.locator('.curated-list-row:visible').count();
  console.log('lignes visibles avant depli (attendu: 1, juste Tous les temps):', visibleRows);
  expect(visibleRows).toBe(1);

  await page.waitForTimeout(1000);
  const decadePct = await page.locator('#curated-pct-decade-1940').textContent();
  console.log('pourcentage decennie 1940 (1 film vu sur 2 attendu -> 50%):', decadePct);

  // Ouvre la liste 1940 et verifie la grille
  await page.locator('.curated-decades-accordion summary').first().click(); // deplie l'accordeon des decennies (le premier des deux) avant de cliquer dedans
  await page.click('.curated-list-row[data-list-id="decade-1940"]');
  await page.waitForSelector('#curated-list-sheet.open');
  const filmCount = await page.locator('#curated-list-sheet .pds-film-item').count();
  const seenCount = await page.locator('#curated-list-sheet .pds-film-item.seen').count();
  console.log('films dans la liste:', filmCount, '| dont vus:', seenCount);
  await expect(page.locator('#cls-add-missing-btn')).toBeVisible();
  // Verrouille le correctif : les annees viennent de release_date (donnees
  // TMDb discover brutes dans le mock), pas d'un champ year pre-existant --
  // ne doivent jamais s'afficher vides.
  const years = await page.locator('#curated-list-sheet .pds-film-year').allTextContents();
  console.log('annees affichees (decennie 1940):', years);
  expect(years).toEqual(['1941', '1945']);
});

test('raccourci Decouvrir -> Profil, et ajout des manquants a la watchlist', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?decadeTop=*', route => route.fulfill({ json: { results: [
    { id: 15, title: 'Citizen Kane', poster_path: '/p1.jpg', release_date: '1941-05-01', vote_average: 8.3 },
    { id: 999, title: 'Autre Film', poster_path: '/p2.jpg', release_date: '1945-01-01', vote_average: 8.0 },
  ] } }));
  await page.route('**/api/search?query=*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?id=15', route => route.fulfill({ json: { id: 15, title: 'Citizen Kane', genres: [] } }));
  await page.route('**/api/search?id=999', route => route.fulfill({ json: { id: 999, title: 'Autre Film', genres: [] } }));

  // 1. Le raccourci depuis Decouvrir bascule bien vers Profil
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#curated-lists-shortcut-btn');
  await page.click('#curated-lists-shortcut-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#col-right-views')).toBeVisible();
  await expect(page.locator('.nav-btn.active')).toHaveAttribute('id', 'nav-profile');
  await expect(page.locator('#curated-lists-card')).toBeInViewport();

  // 2. Ajout des manquants a la watchlist (aucun film vu -> 2 manquants)
  await page.locator('.curated-decades-accordion summary').first().click(); // deplie l'accordeon des decennies (le premier des deux) avant de cliquer dedans
  await page.click('.curated-list-row[data-list-id="decade-1940"]');
  await page.waitForSelector('#curated-list-sheet.open');
  await page.click('#cls-add-missing-btn');
  await page.waitForTimeout(500);
  await expect(page.locator('#toast')).toContainText('2 films ajoutés');

  const watchlist = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_watchlist_default') || '[]'));
  console.log('watchlist apres ajout:', watchlist.length, 'film(s)');
  expect(watchlist.length).toBe(2);
});
