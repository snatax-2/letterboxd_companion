const { test, expect } = require('@playwright/test');
async function setup(page, context) {
  await context.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    if (!localStorage.getItem('lbx_tv_state_v2') && !localStorage.getItem('lbx_tv_shows')) localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 42, title: 'Série synchronisée', genre: 'Drame', seasons: {
        1: { seasonName: 'Saison 1', totalEpisodes: 3, watchedEpisodes: [1], rating: { score: '8.0', date: '2026-08-01' } },
      } },
    ]));
  });
  await context.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.searchParams.has('tvId') ? {
      id: 42, name: 'Série synchronisée', status: 'Ended', seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 3 }],
    } : url.searchParams.has('tvSeasonNumber') ? { episodes: [1, 2, 3].map(n => ({
      episode_number: n, name: `Épisode ${n}`, air_date: '2020-01-01', runtime: 30, overview: 'Un synopsis à conserver.',
    })) } : { results: [] } });
  });
  await page.goto('/');
  await page.locator('#nav-history').click();
  await page.locator('#hist-tab-tv').click();
  await page.locator('.tv-show-card-open-btn').click();
  await page.locator('.tds-season-tab').click();
  await expect(page.locator('.tv-episode-check')).toHaveCount(3);
}

test('deux onglets réels : une coche depuis le widget actualise la fiche déjà ouverte et son historique', async ({ page, context }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page, context);
  const target = page.locator('.tv-episode-check[data-episode="2"]');
  await target.focus();
  const scroll = await page.locator('#tv-detail-sheet .mds-box').evaluate(el => el.scrollTop);
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('#nav-rating').click();
  await other.locator('#tab-media-tv').click();
  await other.locator('.tv-continue-check-btn').click();
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tds-season-tab')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.hist-grid-progress')).toHaveAttribute('title', /2\/3/);
  await expect(page.locator('.tds-upnext-title')).toContainText('E03');
  expect(await page.locator('#tv-detail-sheet .mds-box').evaluate(el => el.scrollTop)).toBe(scroll);
  await other.locator('.tv-continue-pause-btn').click();
  await expect(page.locator('#tds-start-btn')).toContainText('Reprendre');
  await page.screenshot({ path: testInfo.outputPath('series-lot3-sync.png') });
  expect(errors).toEqual([]);
});

test('cloud simulé : notes actualisées et brouillon préservé ; suppression visible sans fermer la fiche', async ({ page, context }) => {
  await setup(page, context);
  await page.evaluate(async () => {
    document.getElementById('review-text').value = 'Brouillon à garder';
    const before = normalizeTvShows(loadTvShows());
    const after = JSON.parse(JSON.stringify(before));
    after[0].seasons[1].rating.score = '6.5';
    await mergeWithRemote({ tvShows: stampTvChanges(before, after, '2026-08-31T15:00:00.000Z') });
  });
  await expect(page.locator('.mds-personal-score')).toContainText('6.5');
  await expect(page.locator('.hist-grid-badge')).toHaveText('6.5');
  expect(await page.locator('#review-text').inputValue()).toBe('Brouillon à garder');
  await page.evaluate(() => mutateTvShows(() => []));
  await expect(page.locator('#tds-start-btn')).toContainText('Commencer');
  await expect(page.locator('.mds-personal-score')).toHaveCount(0);
  await expect(page.locator('.tds-season-tab')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.tv-episode-check.watched')).toHaveCount(0);
});

test('rafraîchir le widget garde son repli, son synopsis et le focus sur le même épisode', async ({ page, context }) => {
  await setup(page, context);
  await page.locator('#tds-close-btn').click();
  await page.locator('#nav-rating').click();
  await page.locator('#tab-media-tv').click();
  await page.locator('.tv-continue-synopsis summary').click();
  await page.locator('.tv-continue-check-btn').focus();
  await page.evaluate(async () => { await mutateTvShows(shows => { shows[0].liked = true; }); });
  await expect(page.locator('.tv-continue-synopsis')).toHaveAttribute('open', '');
  await expect(page.locator('.tv-continue-check-btn')).toBeFocused();
  await page.locator('#tv-continue-toggle').click();
  await page.evaluate(() => mutateTvShows(shows => { shows[0].liked = false; }));
  await expect(page.locator('#tv-continue-list')).toBeHidden();
  await expect(page.locator('#tv-continue-toggle')).toHaveAttribute('aria-expanded', 'false');
});
