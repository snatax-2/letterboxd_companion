const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Historique — parité films/séries : filtre par note (branche sur
// l'infrastructure déjà existante), suppression d'une seule saison (avec
// cas particulier si c'est la dernière -> retire toute la série).
//
// Ludex 2.0 : la gestion par saison (rouvrir/supprimer) a migré de l'ancien
// panneau extensible de la carte Historique vers la fiche détail de la
// série (voir buildSeasonProgressionSection, 19-tv-detail.js) — ces tests
// naviguent donc désormais via un clic sur la carte (ouvre la fiche) plutôt
// que via ".tv-show-seasons-fold summary", qui n'existe plus.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 2200 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('filtre par note (clic sur l\'histogramme) s\'applique aux series, badge reflete le filtrage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      {
        tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
        seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
          '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '4.0', stars: '', review: '', date: '2026-01-02T00:00:00.000Z' } },
        },
      },
      {
        tmdbTvId: 66732, title: 'Stranger Things', poster_path: '/p2.jpg',
        seasons: { '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.5', stars: '', review: '', date: '2026-01-03T00:00:00.000Z' } } },
      },
    ]));
  });

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await page.click('#stats-tab-tv');
  await page.waitForTimeout(900);
  await page.click('.histo-row:has-text("★★★★★")'); // tranche 9-10
  await page.waitForTimeout(400);

  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);

  // True Detective : moyenne (9.0+4.0)/2 = 6.5, hors de la tranche 9-10.
  // Ludex 2.0 : plus de texte visible sur la carte (grille de posters) —
  // le titre vit dans aria-label de .tv-show-card-open-btn.
  const labels = await page.locator('#tv-history-list .tv-show-card-open-btn').evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
  expect(labels.some(l => l.includes('Stranger Things'))).toBe(true);
  expect(labels.some(l => l.includes('True Detective'))).toBe(false);
  await expect(page.locator('#hist-count-badge')).toContainText('1 / 2 série');
});

test('supprimer une seule saison depuis la fiche détail ne touche pas aux autres', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  // Route spécifique à la fiche détail (id=4607) : le mock générique du
  // beforeEach ({results:[]}) ferait échouer openTvDetailSheet (elle exige
  // data.name) et afficherait son état d'erreur plutôt que la vraie fiche.
  await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    genres: [], credits: { crew: [], cast: [] }, external_ids: {},
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);

  await page.locator('.tds-season-details', { hasText: 'Saison 2' }).locator('.tds-season-delete-btn').click();
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(Object.keys(stored[0].seasons)).toEqual(['1']);
  expect(stored).toHaveLength(1); // la serie reste, il lui restait une saison
});

test('supprimer la derniere saison retire toute la serie, avec message adapte', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    genres: [], credits: { crew: [], cast: [] }, external_ids: {},
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }],
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);

  await page.click('.tds-season-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('retire toute la série');
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(0);
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite suppression de saison - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
          '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
        } },
      ]));
    }, theme);
    await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
      id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
      genres: [], credits: { crew: [], cast: [] }, external_ids: {},
      seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
    } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    await page.click('.tv-show-card-open-btn');
    await page.waitForSelector('#tv-detail-sheet.open');
    await page.waitForTimeout(400);
    await page.click('.tds-season-delete-btn >> nth=0');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    const results = await new AxeBuilder({ page }).include('#modal').analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
