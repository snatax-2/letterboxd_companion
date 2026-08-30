const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const SEARCH_RESULTS = [
  { id: 101, media_type: 'movie', title: 'Heat', release_date: '1995-12-15', poster_path: null, known_for: [] },
  { id: 202, media_type: 'tv', title: 'The Bear', release_date: '2022-06-23', poster_path: null, known_for: [] },
  {
    id: 303, media_type: 'person', title: 'Michael Mann', release_date: '', poster_path: null,
    known_for_department: 'Directing', known_for: ['Heat', 'Collateral'],
  },
];

function movieDetails(id, title = 'Heat') {
  return {
    id: Number(id), title, release_date: '1995-12-15', runtime: 170, overview: '',
    poster_path: null, backdrop_path: null, vote_average: 8.1, genres: [],
    credits: { crew: [], cast: [] }, videos: { results: [] }, external_ids: {},
  };
}

function tvDetails(id) {
  return {
    id: Number(id), name: 'The Bear', first_air_date: '2022-06-23', overview: '',
    poster_path: null, backdrop_path: null, vote_average: 8.2, genres: [],
    created_by: [], credits: { cast: [] }, seasons: [], external_ids: {},
    number_of_seasons: 0,
  };
}

async function mockCatalogue(page) {
  await page.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('multiQuery')) return route.fulfill({ json: { results: SEARCH_RESULTS } });
    if (url.searchParams.has('dailyPick')) {
      return route.fulfill({ json: { result: {
        id: 999, title: 'In the Mood for Love', release_date: '2000-09-29',
        poster_path: null, backdrop_path: null,
      } } });
    }
    if (url.searchParams.has('personId')) {
      return route.fulfill({ json: {
        id: 303, name: 'Michael Mann', biography: '', birthday: '1943-02-05',
        place_of_birth: 'Chicago', profile_path: null,
        movie_credits: { cast: [], crew: [] },
      } });
    }
    if (url.searchParams.has('tvId')) return route.fulfill({ json: tvDetails(url.searchParams.get('tvId')) });
    if (url.searchParams.has('providers')) {
      return route.fulfill({ json: { 'watch/providers': { results: { BE: null } } } });
    }
    if (url.searchParams.has('id')) {
      const id = url.searchParams.get('id');
      return route.fulfill({ json: movieDetails(id, id === '999' ? 'In the Mood for Love' : 'Heat') });
    }
    return route.fulfill({ json: { results: [] } });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
  });
  await mockCatalogue(page);
  await page.goto('/');
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 3000 }).catch(() => {});
});

async function openAndSearch(page) {
  await page.click('#discover-search-toggle');
  await expect(page.locator('#discover-search-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#discover-search-input')).toBeEnabled();
  await page.locator('#discover-search-input').fill('Michael Mann');
  await expect(page.locator('.discover-search-result')).toHaveCount(3);
}

test('la loupe devient un champ, reste tactile et se referme proprement au clavier', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const toggle = page.locator('#discover-search-toggle');
  const input = page.locator('#discover-search-input');
  const search = page.locator('#discover-search');

  const switchWrapBox = await page.locator('.discover-segmented-wrap').boundingBox();
  const switchBox = await page.locator('.discover-seg-tabs').boundingBox();
  expect(Math.abs(switchBox.x - switchWrapBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(
    (switchBox.x + switchBox.width) - (switchWrapBox.x + switchWrapBox.width),
  )).toBeLessThanOrEqual(1);

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeDisabled();
  const compactBox = await search.boundingBox();
  expect(compactBox.width).toBeGreaterThanOrEqual(44);
  expect(compactBox.height).toBeGreaterThanOrEqual(44);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toBeFocused();
  await expect(input).toBeEnabled();
  // La largeur est animée sur 360 ms. Attendre sa valeur finale évite de
  // valider une frame intermédiaire plus ou moins avancée selon la charge CI.
  await expect.poll(async () => {
    const openBox = await search.boundingBox();
    return openBox?.width || 0;
  }).toBeGreaterThan(compactBox.width * 4);

  await input.fill('Michael Mann');
  await expect(page.locator('.discover-search-result')).toHaveCount(3);
  await input.press('ArrowDown');
  await expect(page.locator('.discover-search-result').first()).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(input).toBeDisabled();
  await expect(page.locator('#discover-search-results')).toBeHidden();
});

for (const result of [
  { title: 'Heat', sheet: '#movie-detail-sheet', heading: '#mds-title' },
  { title: 'The Bear', sheet: '#tv-detail-sheet', heading: '#tds-title' },
  { title: 'Michael Mann', sheet: '#person-detail-sheet', heading: '#pds-title' },
]) {
  test(`un résultat ${result.title} ouvre sa vraie fiche`, async ({ page }) => {
    await openAndSearch(page);
    await page.getByRole('button', { name: `Ouvrir la fiche de ${result.title}`, exact: true }).click();
    await expect(page.locator(result.sheet)).toHaveClass(/open/);
    await expect(page.locator(`${result.sheet} ${result.heading}`)).toContainText(result.title);
  });
}

for (const theme of ['dark', 'light']) {
  test(`la recherche éditoriale reste accessible en thème ${theme}`, async ({ page }) => {
    if (theme === 'light') {
      await page.evaluate(() => {
        const settings = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
        settings.theme = 'light';
        localStorage.setItem('lbx_settings', JSON.stringify(settings));
        document.documentElement.dataset.theme = 'light';
      });
    }
    await openAndSearch(page);
    const scan = await new AxeBuilder({ page }).include('#view-discover').analyze();
    const serious = scan.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
    expect(serious, JSON.stringify(serious.map(violation => violation.id))).toHaveLength(0);
  });
}

test('Découvrir ne déborde pas aux largeurs mobile et desktop', async ({ page }) => {
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: width >= 1024 ? 900 : 900 });
    if (!await page.locator('#discover-search').evaluate(element => element.classList.contains('is-open'))) {
      await page.click('#discover-search-toggle');
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      searchRight: document.getElementById('discover-search').getBoundingClientRect().right,
    }));
    expect(dimensions.page, `${width}px : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.searchRight, `${width}px : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
  }
});
