const { test, expect } = require('@playwright/test');

const series = { id: 42, name: 'Série de vérification', seasons: [
  { season_number: 1, name: 'Saison 1', episode_count: 2 },
  { season_number: 2, name: 'Saison 2', episode_count: 2 },
] };
const episodes = { episodes: [
  { episode_number: 1, name: 'Le début', air_date: '2020-01-01', runtime: 30 },
  { episode_number: 2, name: 'La suite', air_date: '2020-01-08', runtime: 30 },
] };

async function setup(page) {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => {
    const url = route.request().url();
    const json = url.includes('tvId=42') ? series : url.includes('tvSeasonShowId=42') ? episodes : { results: [] };
    return route.fulfill({ json });
  });
  await page.goto('/');
}

test('mobile : premier suivi, notation puis retour à la fiche sans erreur navigateur', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await expect(page.locator('#nav-rating')).toBeVisible();
  await page.evaluate(() => openTvDetailSheet(42));
  await page.locator('.tds-season-tab[data-season-number="1"]').click();
  const first = page.locator('.tv-episode-check[data-episode="1"]');
  const second = page.locator('.tv-episode-check[data-episode="2"]');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.tds-rate-now-btn').click();
  await page.locator('#tab-quick').click();
  await page.locator('#quick-stars-container').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.locator('label[for="s8"]').click();
  await expect(page.locator('#s8')).toBeChecked();
  await page.locator('#review-text').fill('Note de test');
  await page.locator('#save-btn').click();
  await expect.poll(() => page.evaluate(() => loadTvShows()[0]?.seasons[1]?.rating?.score)).toBe('8.0');
  await page.evaluate(() => openTvDetailSheet(42));
  await expect(page.locator('.tds-season-tab[data-season-number="1"] .tds-season-tab-count')).toHaveText('2/2');
  await expect(page.locator('.tds-season-tab[data-season-number="2"] .tds-season-tab-count')).toHaveText('0/2');
  await page.screenshot({ path: testInfo.outputPath('series-integrity.png') });
  expect(errors).toEqual([]);
});

test('mobile : quota refusé, aucune coche fantôme et aucune exception non traitée', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await page.evaluate(() => openTvDetailSheet(42));
  await page.locator('.tds-season-tab[data-season-number="1"]').click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'lbx_tv_state_v2') throw new DOMException('QuotaExceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const first = page.locator('.tv-episode-check[data-episode="1"]');
  await first.click();
  await expect(first).toBeEnabled();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => loadTvShows())).toEqual([]);
  expect(errors).toEqual([]);
});

test('deux onglets : le verrou conserve deux écritures concurrentes et le rechargement', async ({ page, context }) => {
  await setup(page);
  await page.evaluate(() => mutateTvShows(shows => {
    shows.push({ tmdbTvId: 42, title: 'Série de vérification', seasons: { 1: { watchedEpisodes: [], totalEpisodes: 10 } } });
  }));
  const other = await context.newPage();
  await setup(other);
  expect(await page.evaluate(() => !!navigator.locks)).toBe(true);
  await Promise.all([
    page.evaluate(() => mutateTvShows(async shows => {
      await new Promise(resolve => setTimeout(resolve, 100));
      shows[0].seasons[1].watchedEpisodes.push(1);
    })),
    other.evaluate(() => mutateTvShows(shows => { shows[0].seasons[1].watchedEpisodes.push(2); })),
  ]);
  await page.reload();
  expect(await page.evaluate(() => loadTvShows()[0].seasons[1].watchedEpisodes)).toEqual([1, 2]);
  expect(await other.evaluate(() => loadTvShows()[0].seasons[1].watchedEpisodes)).toEqual([1, 2]);
});
