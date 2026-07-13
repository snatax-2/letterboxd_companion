// "Surprends-moi" — un film totalement au hasard dans toute la base TMDb,
// pas une recommandation personnalisée ni limitée à la watchlist.
const { test, expect } = require('@playwright/test');

test('cliquer sur "Surprends-moi" ouvre la fiche du film pioché', async ({ page }) => {
  await page.route('**/api/search?random=true', async (route) => {
    return route.fulfill({ json: { result: { id: 777, title: 'Film Surprise' } } });
  });
  await page.route('**/api/search?id=777', async (route) => {
    return route.fulfill({ json: { id: 777, title: 'Film Surprise', release_date: '2015-01-01', poster_path: null, genres: [], credits: { crew: [], cast: [] } } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.click('#surprise-me-btn');

  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/, { timeout: 5000 });
  await expect(page.locator('#mds-title')).toHaveText('Film Surprise');
});

test('si aucun film n\'est trouvé, affiche un message plutôt que de planter', async ({ page }) => {
  await page.route('**/api/search?random=true', async (route) => {
    return route.fulfill({ json: { result: null } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.click('#surprise-me-btn');

  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#movie-detail-sheet')).not.toHaveClass(/open/);
});
