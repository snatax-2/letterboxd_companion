const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const theme of ['dark', 'light']) {
  test(`Récents : coche, décoche, note et rechargement dans le même flux — ${theme}`, async ({ page, context }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(theme => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      if (!localStorage.getItem('lbx_tv_state_v2')) {
        localStorage.setItem('lbx_tv_shows', JSON.stringify([
          { tmdbTvId: 1, title: 'Série notée', seasons: { 1: { seasonName: 'Saison 1', totalEpisodes: 3, watchedEpisodes: [], rating: { score: '8.0', date: '2026-08-10' } } } },
          { tmdbTvId: 2, title: 'Série suivie', seasons: { 1: { seasonName: 'Saison 1', totalEpisodes: 3, watchedEpisodes: [] } } },
        ]));
      }
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme; });
    }, theme);
    await context.route('**/api/search*', route => {
      const url = new URL(route.request().url());
      const id = Number(url.searchParams.get('tvId') || url.searchParams.get('tvSeasonShowId'));
      return route.fulfill({ json: url.searchParams.has('tvId') ? {
        id, name: id === 1 ? 'Série notée' : 'Série suivie', status: 'Ended', seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 3 }],
      } : url.searchParams.has('tvSeasonNumber') ? { episodes: [1, 2, 3].map(n => ({ episode_number: n, name: `Épisode ${n}`, air_date: '2020-01-01' })) } : { results: [] } });
    });
    await page.clock.install({ time: new Date('2026-08-20T12:00:00.000Z') });
    await page.goto('/');
    await page.locator('#nav-history').click();
    await page.locator('#hist-tab-tv').click();
    const cards = page.locator('#tv-history-list .hist-grid-card');
    await expect(cards.first()).toHaveAttribute('data-show-id', '1');
    await page.locator('.tv-show-card-open-btn[data-show-id="2"]').click();
    await page.locator('.tds-season-tab').click();
    await page.locator('.tv-episode-check[data-episode="1"]').click();
    await expect(cards.first()).toHaveAttribute('data-show-id', '2');
    await expect(page.locator('#tv-history-list .hist-grid')).toHaveCount(1);
    await expect(page.locator('#tv-history-list .hist-month-recap')).toContainText('2 séries · moy. 8.0');
    const stamp = await page.evaluate(() => loadTvShows().find(s => s.tmdbTvId === 2).seasons[1]._sync.episodes[1].watchedAt);
    expect(stamp).toMatch(/^2026-08-20T/);
    await page.locator('#tds-close-btn').click();
    await page.screenshot({ path: testInfo.outputPath(`series-activity-${theme}.png`), fullPage: true });
    const axe = await new AxeBuilder({ page }).include('#tv-history-list').analyze();
    expect(axe.violations).toEqual([]);
    await page.reload();
    await page.locator('#nav-history').click();
    await page.locator('#hist-tab-tv').click();
    await expect(cards.first()).toHaveAttribute('data-show-id', '2');
    expect(await page.evaluate(() => loadTvShows().find(s => s.tmdbTvId === 2).seasons[1]._sync.episodes[1].watchedAt)).toBe(stamp);
    // Nouvelle note reçue : elle doit reprendre la tête sans navigation.
    await page.evaluate(async () => {
      const before = normalizeTvShows(loadTvShows());
      const after = structuredClone(before);
      after.find(s => s.tmdbTvId === 1).seasons[1].rating.date = '2026-08-25';
      await mergeWithRemote({ tvShows: stampTvChanges(before, after, '2026-08-25T12:00:00.000Z') });
    });
    await expect(cards.first()).toHaveAttribute('data-show-id', '1');
    await page.locator('.tv-show-card-open-btn[data-show-id="2"]').click();
    await page.locator('.tds-season-tab').click();
    await page.locator('.tv-episode-check[data-episode="1"]').click();
    await expect(page.locator('#tv-history-list .hist-grid')).toHaveCount(2);
    await page.locator('#tds-close-btn').click();
    await page.locator('[data-sort="title"]').first().click();
    await expect(page.locator('#tv-history-list .hist-grid')).toHaveCount(1);
    await expect(cards).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}
