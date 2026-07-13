// Fiche personne : filmographie limitée au rôle principal, films déjà vus
// grisés, et navigation vers la fiche film au clic.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('personId=')) {
      return route.fulfill({
        json: {
          id: 138, name: 'Réalisateur Test', known_for_department: 'Directing', biography: 'Un réalisateur.',
          movie_credits: {
            cast: [],
            crew: [
              { id: 10, title: 'Film Réalisé', release_date: '2018-01-01', poster_path: '/a.jpg', job: 'Director' },
              { id: 11, title: 'Film Produit Seulement', release_date: '2019-01-01', poster_path: '/b.jpg', job: 'Producer' },
            ],
          },
        },
      });
    }
    if (url.includes('id=10')) {
      return route.fulfill({ json: { id: 10, title: 'Film Réalisé', release_date: '2018-01-01', poster_path: '/a.jpg', genres: [], credits: { crew: [], cast: [] } } });
    }
    return route.fulfill({ json: { results: [] } });
  });

  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Réalisé', tmdbId: '10', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.evaluate(() => window.openPersonDetailSheet('138', 'Réalisateur Test'));
  await page.waitForSelector('#person-detail-sheet.open');
});

test('la filmographie se limite au rôle principal (réalisé, pas produit)', async ({ page }) => {
  const content = page.locator('#pds-content');
  await expect(content).toContainText('Film Réalisé');
  await expect(content).not.toContainText('Film Produit Seulement');
});

test('un film déjà vu est marqué (grisé)', async ({ page }) => {
  const filmItem = page.locator('.pds-film-item', { hasText: 'Film Réalisé' });
  await expect(filmItem).toHaveClass(/seen/);
});

test('taper sur un film de la filmographie ouvre sa fiche', async ({ page }) => {
  await page.locator('.pds-film-item', { hasText: 'Film Réalisé' }).click();
  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#mds-title')).toHaveText('Film Réalisé');
});
