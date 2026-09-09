const { test, expect } = require('@playwright/test');
const detail = { id: 42, name: 'Contrôle du suivi', status: 'Returning Series', seasons: [
  { season_number: 1, name: 'Saison 1', episode_count: 2 },
  { season_number: 3, name: 'Saison 3', episode_count: 2 },
] };
async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    if (!localStorage.getItem('lbx_tv_state_v2')) localStorage.setItem('lbx_tv_shows', JSON.stringify([{ tmdbTvId: 42, title: 'Contrôle du suivi', seasons: {
      1: { seasonName: 'Saison 1', totalEpisodes: 2, watchedEpisodes: [1], rating: { score: '8.0', date: '2026-08-20' } },
    } }]));
  });
  await page.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    const season = url.searchParams.get('tvSeasonNumber');
    const json = url.searchParams.has('tvId') ? detail : season ? { episodes: [
      { episode_number: 1, name: 'Premier épisode', air_date: '2020-01-01', runtime: 30 },
      { episode_number: 2, name: season === '3' ? 'Titre secret futur' : 'Final de saison', air_date: season === '3' ? '2099-01-01' : '2020-01-08', runtime: 30 },
    ] } : { results: [] };
    return route.fulfill({ json });
  });
  await page.goto('/');
  await expect(page.locator('#nav-rating')).toBeVisible();
  await page.locator('#nav-rating').click();
  await page.locator('#tab-media-tv').click();
  await expect(page.locator('.tv-continue-check-btn')).toBeVisible();
}

test('mobile : widget, fiche et affiche partagent la progression sans altérer la note', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await expect(page.locator('#tv-continue-count')).toHaveText('(1)');
  await page.locator('.tv-continue-check-btn').click();
  await expect(page.locator('.tv-continue-check-btn')).toHaveAttribute('data-season-key', '3');
  // Résoudre la suite ne la crée pas dans le suivi personnel.
  expect(await page.evaluate(() => !!loadTvShows()[0].seasons[3])).toBe(false);
  await page.evaluate(() => openTvDetailSheet(42));
  await page.locator('.tds-season-tab[data-season-number="3"]').click();
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.tv-episode-check[data-episode="2"]')).toBeDisabled();
  await expect(page.locator('#tds-season-episodes')).not.toContainText('Titre secret futur');
  await page.locator('.tds-upnext-check').click();
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tds-series-progress')).toHaveAttribute('data-progress-state', 'up_to_date');
  await expect(page.locator('.tds-series-progress')).toContainText('3/4');
  await expect(page.locator('.tds-season-tab[data-season-number="3"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.tds-upnext-label')).toHaveText('À venir');
  await page.screenshot({ path: testInfo.outputPath('series-lot2.png') });
  expect(await page.evaluate(() => loadTvShows()[0].seasons[1].rating.score)).toBe('8.0');
  await page.evaluate(() => closeTvDetailSheet());
  await page.locator('#nav-history').click();
  await page.locator('#hist-tab-tv').click();
  await expect(page.locator('.hist-grid-progress')).toHaveAttribute('data-progress-state', 'up_to_date');
  await expect(page.locator('.hist-grid-progress')).toHaveAttribute('title', /3\/4/);
  expect(errors).toEqual([]);
});

test('mobile : pause et retrait survivent au rendu, reprise depuis la fiche', async ({ page }) => {
  await setup(page);
  await page.locator('.tv-continue-pause-btn').click();
  await expect(page.locator('#tv-continue-count')).toHaveText('(0)');
  await page.evaluate(() => renderTvContinueList());
  await expect(page.locator('.tv-continue-card')).toHaveCount(0);
  await page.evaluate(() => openTvDetailSheet(42));
  await expect(page.locator('#tds-start-btn')).toContainText('Reprendre');
  await page.locator('#tds-start-btn').click();
  await expect(page.locator('#tds-start-btn')).toHaveCount(0);
  await page.evaluate(() => closeTvDetailSheet());
  await expect(page.locator('.tv-continue-remove-btn')).toBeVisible();
  await page.locator('.tv-continue-remove-btn').click();
  await page.evaluate(() => renderTvContinueList());
  await expect(page.locator('.tv-continue-card')).toHaveCount(0);
  await page.evaluate(() => openTvDetailSheet(42));
  await expect(page.locator('#tds-start-btn')).toContainText('Réafficher');
  expect(await page.evaluate(() => loadTvShows()[0].seasons[1].rating.score)).toBe('8.0');
});

test('mobile : consultation et décoche avec le catalogue déjà chargé hors ligne', async ({ page, context }) => {
  await setup(page);
  await page.evaluate(() => openTvDetailSheet(42));
  await page.locator('.tds-season-tab[data-season-number="1"]').click();
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveAttribute('aria-pressed', 'true');
  await context.setOffline(true);
  await page.locator('.tv-episode-check[data-episode="1"]').click();
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.tds-upnext-title')).toContainText('S01E01');
  expect(await page.evaluate(() => loadTvShows()[0].seasons[1].rating.score)).toBe('8.0');
  await context.setOffline(false);
});
