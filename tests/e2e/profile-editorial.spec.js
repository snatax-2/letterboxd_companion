const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { tmdbId: 1, title: 'Premier film', year: '2026', runtime: '120 min', score: '8.2', date: '2026-08-20', savedAt: '2026-08-20T12:00:00.000Z', poster: '' },
      { tmdbId: 2, title: 'Second film', year: '2026', runtime: '100 min', score: '7.4', date: '2026-08-21', savedAt: '2026-08-21T12:00:00.000Z', poster: '' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify([{ tmdbTvId: 9, title: 'Une série', poster_path: '', seasons: {
      '1': { seasonName: 'Saison 1', totalEpisodes: 2, watchedEpisodes: [1], rating: { score: 9.1, date: '2026-08-22', savedAt: '2026-08-22T12:00:00.000Z' } },
    } }]));
  });
  await page.route('**/api/search?tvSeasonShowId=9&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, runtime: 50 }, { episode_number: 2, runtime: 50 }],
  } }));
});

test('Profil présente les dernières notes par média et compte les épisodes vus', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await expect(page.locator('.profile-editorial-heading h2')).toHaveText('Profil');
  await expect(page.locator('.profile-recent-item')).toHaveCount(2);
  await expect(page.locator('#profile-hero-watch-time')).toHaveText('3 h');
  await page.click('#stats-tab-tv');
  await expect(page.locator('.profile-recent-item')).toHaveCount(1);
  await expect(page.locator('.profile-recent-item')).toContainText('Une série');
  await expect(page.locator('#duels-card')).toHaveCount(0);
  await expect(page.locator('#setting-feature-duels')).toHaveCount(0);
});
