const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Historique — parite films/series (1ere vague) : filtre par note (branche
// sur l'infrastructure deja existante), suppression d'une seule saison
// (avec cas particulier si c'est la derniere -> retire toute la serie).

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

  // True Detective : moyenne (9.0+4.0)/2 = 6.5, hors de la tranche 9-10
  const titles = await page.locator('.tv-show-card-title').allTextContents();
  expect(titles).toEqual(['Stranger Things']);
  await expect(page.locator('#hist-count-badge')).toContainText('1 / 2 série');
});

test('supprimer une seule saison ne touche pas aux autres', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);
  await page.locator('.tv-season-row', { hasText: 'Saison 2' }).locator('.tv-season-delete-btn').click();
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
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(300);
  await page.click('.tv-season-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('retire toute la série');
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('.tv-show-card')).toHaveCount(0);
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
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    await page.click('.tv-show-seasons-fold summary');
    await page.waitForTimeout(300);
    await page.click('.tv-season-delete-btn >> nth=0');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    const results = await new AxeBuilder({ page }).include('#modal').analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
