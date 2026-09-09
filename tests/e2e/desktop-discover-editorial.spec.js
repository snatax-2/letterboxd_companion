const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
  });
  await page.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('dailyPick')) {
      return route.fulfill({ json: { result: {
        id: 999, title: 'In the Mood for Love', release_date: '2000-09-29', poster_path: '/hero.jpg',
      } } });
    }
    if (url.searchParams.has('trending')) {
      return route.fulfill({ json: { results: [
        { id: 101, title: 'Heat', release_date: '1995-12-15', poster_path: '/heat.jpg', media_type: 'movie' },
        { id: 102, title: 'Perfect Days', release_date: '2023-05-25', poster_path: '/days.jpg', media_type: 'movie' },
      ] } });
    }
    if (url.searchParams.get('id') === '999') {
      return route.fulfill({ json: {
        id: 999, title: 'In the Mood for Love', release_date: '2000-09-29',
        poster_path: '/hero.jpg', credits: { crew: [{ job: 'Director', name: 'Wong Kar-wai' }], cast: [] },
      } });
    }
    return route.fulfill({ json: { results: [] } });
  });
  await page.goto('/');
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
});

test('Découvrir compose une vraie page éditoriale sur desktop', async ({ page }) => {
  const heading = page.locator('.discover-editorial-title');
  await expect(heading).toBeVisible();
  const headingSize = parseFloat(await heading.evaluate(element => getComputedStyle(element).fontSize));
  expect(headingSize).toBeGreaterThanOrEqual(80);

  const navTop = await page.locator('#mobile-nav').boundingBox();
  const headingBox = await heading.boundingBox();
  expect(navTop.y).toBeLessThan(headingBox.y);

  await expect(page.locator('.discover-seg-btn')).toHaveCount(2);
  await expect(page.locator('.discover-seg-tabs .toggle-slider')).toHaveCount(1);

  const heroPoster = await page.locator('.choix-du-jour-poster-wrap').boundingBox();
  expect(heroPoster.height / heroPoster.width).toBeCloseTo(3 / 2, 1);
  expect(heroPoster.width).toBeGreaterThanOrEqual(250);

  const search = page.locator('#discover-search');
  const compactSearch = await search.boundingBox();
  await page.click('#discover-search-toggle');
  expect(compactSearch.width).toBeCloseTo(44, 0);
  // La largeur est précisément ce qui est animé pendant 360 ms : attendre
  // sa valeur finale plutôt que mesurer une frame intermédiaire au hasard.
  await expect.poll(async () => (await search.boundingBox()).width).toBeGreaterThanOrEqual(400);

  const firstPoster = page.locator('#carousel-nouveautes .poster-min').first();
  await expect(firstPoster).toBeVisible();
  await firstPoster.hover();
  await page.waitForTimeout(300);
  const hoverTransform = await firstPoster.evaluate(element => getComputedStyle(element).transform);
  expect(hoverTransform).not.toBe('none');

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
