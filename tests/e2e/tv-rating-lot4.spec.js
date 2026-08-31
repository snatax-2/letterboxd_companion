const { test, expect } = require('@playwright/test');

async function setup(page, context) {
  await context.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    if (!localStorage.getItem('lbx_tv_state_v2') && !localStorage.getItem('lbx_tv_shows')) {
      localStorage.setItem('lbx_tv_shows', JSON.stringify([1, 2].map(id => ({ tmdbTvId: id, title: `Série ${id}`, genre: 'Drame', poster_path: '/original.jpg', seasons: {
        1: { seasonName: 'Saison 1', totalEpisodes: 2, watchedEpisodes: [1, 2], rating: { mode: 'quick', values: { quick: 4 }, score: '8.0', date: '2026-08-01', review: 'Note originale' } },
        2: { seasonName: 'Saison 2', totalEpisodes: 2, watchedEpisodes: [1, 2] },
      } }))));
    }
  });
  await context.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#555"/></svg>' }));
  await context.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    const id = Number(url.searchParams.get('tvId') || url.searchParams.get('tvSeasonShowId'));
    return route.fulfill({ json: url.searchParams.has('tvId') ? {
      id, name: `Série ${id}`, poster_path: '/original.jpg', status: 'Ended', seasons: [1, 2].map(n => ({ season_number: n, name: `Saison ${n}`, episode_count: 2 })),
    } : url.searchParams.has('tvSeasonNumber') ? { episodes: [1, 2].map(n => ({ episode_number: n, name: `Épisode ${n}`, air_date: '2020-01-01', runtime: 40 })) }
      : { results: [], posters: [{ file_path: '/chosen.jpg' }] } });
  });
  await page.goto('/');
}
async function openRating(page, id, season) {
  await page.locator('#nav-history').click();
  await page.locator('#hist-tab-tv').click();
  await page.locator(`.tv-show-card-open-btn[data-show-id="${id}"]`).click();
  await page.locator(`.tds-season-tab[data-season-number="${season}"]`).click();
  await page.locator('.tds-season-reopen-btn').click();
  await expect(page.locator('#tv-detail-sheet')).not.toHaveClass(/open/);
}

test('brouillons : film, S1, S2 et rechargement restent indépendants', async ({ page, context }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await setup(page, context);
  await page.locator('#nav-rating').click();
  await page.locator('#review-text').fill('Critique du film');
  await openRating(page, 1, 1);
  await page.locator('#review-text').fill('Brouillon saison 1');
  await page.locator('#tv-view-date').fill('2026-08-15');
  await openRating(page, 1, 2);
  await page.locator('#review-text').fill('Brouillon saison 2');
  await page.reload();
  await page.locator('#nav-rating').click();
  await expect(page.locator('#review-text')).toHaveValue('Critique du film');
  await page.locator('#tab-media-tv').click();
  await expect(page.locator('#review-text')).toHaveValue('Brouillon saison 2');
  await openRating(page, 1, 1);
  await expect(page.locator('#review-text')).toHaveValue('Brouillon saison 1');
  await expect(page.locator('#tv-view-date')).toHaveValue('2026-08-15');
  await page.locator('#save-btn').click();
  await expect.poll(() => page.evaluate(() => loadTvShows()[0].seasons[1].rating.review)).toBe('Brouillon saison 1');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_rating_draft_1:1')).cleared)).toBe(true);
  await expect(page.locator('#tv-strip-title')).toContainText('Saison 1');
  await page.screenshot({ path: testInfo.outputPath('lot4-rating.png') });
  expect(errors).toEqual([]);
});

test('À voir : consulter, abandonner puis démarrer ne retire pas automatiquement la série', async ({ page, context }) => {
  await setup(page, context);
  await page.evaluate(() => { saveTvWatchlist([{ tmdbId: 3, title: 'Série 3' }]); tvWatchlistToForm(0); });
  await expect(page.locator('#tds-start-btn')).toBeVisible();
  await page.locator('#tds-close-btn').click();
  expect(await page.evaluate(() => loadTvWatchlist().length)).toBe(1);
  expect(await page.evaluate(() => loadTvShows().some(s => s.tmdbTvId === 3))).toBe(false);
  await page.evaluate(() => tvWatchlistToForm(0));
  await page.locator('#tds-start-btn').click();
  await expect.poll(() => page.evaluate(() => loadTvShows().some(s => s.tmdbTvId === 3))).toBe(true);
  expect(await page.evaluate(() => loadTvWatchlist().length)).toBe(1);
});

test('affiche : le choix est persisté avant le succès et reste à la réouverture', async ({ page, context }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await setup(page, context);
  await page.locator('#nav-history').click();
  await page.locator('#hist-tab-tv').click();
  await page.locator('.tv-show-card-open-btn[data-show-id="1"]').click();
  await page.locator('.mds-poster-change-btn').click();
  await page.locator('.poster-picker-cell[data-poster-path="/chosen.jpg"]').click();
  await expect.poll(() => page.evaluate(() => loadTvShows()[0].posterOverride)).toBe('/chosen.jpg');
  await expect(page.locator('#tv-detail-sheet .mds-poster')).toHaveAttribute('src', /chosen.jpg/);
  await page.locator('#tds-close-btn').click();
  await page.locator('.tv-show-card-open-btn[data-show-id="1"]').click();
  await expect(page.locator('#tv-detail-sheet .mds-poster')).toHaveAttribute('src', /chosen.jpg/);
  expect(errors).toEqual([]);
});

test('durées hors ligne : conserve le connu et signale le total incomplet', async ({ page, context }) => {
  await setup(page, context);
  await page.evaluate(() => {
    localStorage.setItem('lbx_profile_episode_runtime_v1', JSON.stringify({ '1:1': { at: 1, episodes: [{ number: 1, runtime: 60 }] } }));
    tvCatalogueMemory.clear();
    Object.keys(localStorage).filter(k => k.startsWith('lbx_tv_catalogue_v1_')).forEach(k => localStorage.removeItem(k));
  });
  await context.route('**/api/search*', route => route.abort());
  await page.locator('#nav-profile').click();
  await page.locator('#stats-tab-tv').click();
  await expect(page.locator('#profile-hero-watch-time')).toContainText('≥ 1 h');
  await expect(page.locator('#profile-watch-time')).toContainText('sans durée');
});
