const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Phase 2 : suivi episode par episode (case a cocher avec
// animation, barre de progression, proposition de rattrapage si on coche
// en avance, bandeau de fin de saison). Stockage : lbx_tv_shows, une
// entree par serie avec ses saisons imbriquees.

const SEARCH_RESULT = { results: [{ id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' }] };
const SHOW_DETAIL = { id: 4607, name: 'True Detective', seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 3, poster_path: '/s1.jpg' }] };
const SEASON_EPISODES = { episodes: [
  { episode_number: 1, name: 'The Long Bright Dark', air_date: '2014-01-12', runtime: 58 },
  { episode_number: 2, name: 'Seeing Things', air_date: '2014-01-19', runtime: 52 },
  { episode_number: 3, name: 'The Locked Room', air_date: '2014-01-26', runtime: 51 },
] };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: SEARCH_RESULT }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_DETAIL }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: SEASON_EPISODES }));
});

async function goToEpisodeList(page) {
  await page.goto('/');
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);
}

test('cocher, decocher, progression, rattrapage, bandeau de fin, persistance', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await goToEpisodeList(page);

  await expect(page.locator('.tv-episode-row')).toHaveCount(3);
  await expect(page.locator('#tv-progress-label')).toHaveText('0/3 épisodes vu');

  await page.click('.tv-episode-check[data-episode="1"]');
  await page.waitForTimeout(200);
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveClass(/watched/);
  await expect(page.locator('#tv-progress-label')).toHaveText('1/3 épisodes vu');

  // Coche l'episode 3 directement : doit proposer (et, ici, accepter) de
  // rattraper le 2 au passage.
  await page.click('.tv-episode-check[data-episode="3"]');
  await page.waitForTimeout(300);
  await expect(page.locator('.tv-episode-check[data-episode="2"]')).toHaveClass(/watched/);
  await expect(page.locator('.tv-episode-check[data-episode="3"]')).toHaveClass(/watched/);
  await expect(page.locator('#tv-progress-label')).toHaveText('3/3 épisodes vus');
  await expect(page.locator('#tv-season-complete-banner')).toBeVisible();

  // Decocher fait disparaitre le bandeau de fin
  await page.click('.tv-episode-check[data-episode="3"]');
  await page.waitForTimeout(200);
  await expect(page.locator('.tv-episode-check[data-episode="3"]')).not.toHaveClass(/watched/);
  await expect(page.locator('#tv-season-complete-banner')).toBeHidden();
  await expect(page.locator('#tv-progress-label')).toHaveText('2/3 épisodes vus');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(String(stored[0].tmdbTvId)).toBe('4607');
  expect(stored[0].title).toBe('True Detective');
  expect(stored[0].seasons['1'].seasonName).toBe('Saison 1'); // pas le titre combine "Serie — Saison"
  expect(stored[0].seasons['1'].watchedEpisodes.sort()).toEqual([1, 2]);
});

test('refuser le rattrapage ne coche que l\'episode cible', async ({ page }) => {
  page.on('dialog', dialog => dialog.dismiss());
  await goToEpisodeList(page);
  await page.click('.tv-episode-check[data-episode="3"]');
  await page.waitForTimeout(300);
  await expect(page.locator('.tv-episode-check[data-episode="2"]')).not.toHaveClass(/watched/);
  await expect(page.locator('.tv-episode-check[data-episode="3"]')).toHaveClass(/watched/);
  await expect(page.locator('#tv-progress-label')).toHaveText('1/3 épisodes vu');
});

test('accessibilite : zero violation avec le bandeau de fin de saison affiche', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await goToEpisodeList(page);
  await page.click('.tv-episode-check[data-episode="1"]');
  await page.click('.tv-episode-check[data-episode="2"]');
  await page.click('.tv-episode-check[data-episode="3"]');
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);
});
