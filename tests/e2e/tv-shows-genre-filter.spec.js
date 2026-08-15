const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Historique — parite films/series, 2e vague : filtre par genre. TMDb
// renvoie deja les genres dans la fiche d'une serie, capture au moment de
// la selection. Pour les series deja suivies avant ce correctif (sans
// genre stocke), une recuperation silencieuse en arriere-plan les
// complete des la premiere visite sur l'onglet Series de l'Historique.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('genre capture directement a la selection, retrofit en arriere-plan pour une serie deja suivie, filtre fonctionnel', async ({ page }) => {
  await page.addInitScript(() => {
    // Serie deja suivie AVANT ce correctif : pas de genre stocke.
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 66732, title: 'Stranger Things', poster_path: '/p2.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search?tvId=66732', route => route.fulfill({ json: {
    id: 66732, name: 'Stranger Things',
    genres: [{ id: 1, name: 'Drame' }, { id: 2, name: 'Fantastique' }],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/p2.jpg' }],
  } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective',
    genres: [{ id: 3, name: 'Policier' }, { id: 1, name: 'Drame' }],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/p1.jpg' }],
  } }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55 }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire

  // Selection d'une nouvelle serie : genre capture directement
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);

  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored.find(s => String(s.tmdbTvId) === '4607').genre).toBe('Policier, Drame');

  // Historique Series : la serie sans genre prealable doit s'enrichir en arriere-plan
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(1000);

  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored.find(s => String(s.tmdbTvId) === '66732').genre).toBe('Drame, Fantastique');

  await expect(page.locator('#genre-fold')).toBeVisible();
  await page.click('.genre-fold-summary');
  await page.waitForTimeout(200);
  const chipTexts = await page.locator('.genre-chip').allTextContents();
  expect(chipTexts).toEqual(expect.arrayContaining(['Tous', 'Drame', 'Fantastique', 'Policier']));

  await page.click('.genre-chip:has-text("Policier")');
  await page.waitForTimeout(300);
  const titles = await page.locator('.tv-show-card-title').allTextContents();
  expect(titles).toEqual(['True Detective']);
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite filtre genre series - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', genre: 'Policier, Drame', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        } },
      ]));
    }, theme);
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(500);
    await page.click('.genre-fold-summary');
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page }).include('#genre-fold').analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
