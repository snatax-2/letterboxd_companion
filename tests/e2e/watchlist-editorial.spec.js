const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const MOVIES = Array.from({ length: 8 }, (_, index) => ({
  title: `Film archive ${index + 1}`,
  tmdbId: index + 1,
  year: String(2024 - index),
  genre: index % 2 ? 'Drame' : 'Thriller',
  rating: 8 - index / 10,
  runtime: 100 + index,
  poster: `https://image.tmdb.org/t/p/w342/movie-${index + 1}.jpg`,
  addedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
}));

const SHOWS = Array.from({ length: 5 }, (_, index) => ({
  title: `Série archive ${index + 1}`,
  tmdbId: 100 + index,
  year: String(2025 - index),
  genre: index % 2 ? 'Drame' : 'Science-fiction',
  rating: 8.5 - index / 10,
  poster: `https://image.tmdb.org/t/p/w342/show-${index + 1}.jpg`,
  addedAt: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
}));

function movieDetails(id, title = 'Heat') {
  return {
    id: Number(id), title, release_date: '1995-12-15', runtime: 170,
    overview: '', poster_path: null, backdrop_path: null, vote_average: 8.1,
    genres: [{ id: 18, name: 'Drame' }],
    credits: { crew: [], cast: [] }, videos: { results: [] }, external_ids: {},
  };
}

function tvDetails(id, name = 'Severance') {
  return {
    id: Number(id), name, first_air_date: '2022-02-18', overview: '',
    poster_path: null, backdrop_path: null, vote_average: 8.4,
    genres: [{ id: 18, name: 'Drame' }], created_by: [],
    credits: { cast: [] }, seasons: [], external_ids: {}, number_of_seasons: 0,
  };
}

async function mockWatchlistApis(page) {
  // Une image minuscule suffit à déclencher le reveal blur → net sans
  // dépendre du réseau TMDb dans la CI.
  await page.route('https://image.tmdb.org/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#343438"/></svg>',
  }));

  await page.route('**/api/search*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('personSearch')) {
      const query = url.searchParams.get('personSearch');
      return route.fulfill({ json: query.toLowerCase().includes('michael')
        ? { results: [{ id: 303, name: 'Michael Mann', profile_path: null }] }
        : { results: [] } });
    }
    if (url.searchParams.has('personId')) {
      return route.fulfill({ json: {
        id: 303, name: 'Michael Mann', biography: '', birthday: '1943-02-05',
        place_of_birth: 'Chicago', profile_path: null,
        movie_credits: { cast: [], crew: [] },
      } });
    }
    if (url.searchParams.has('tvQuery')) {
      return route.fulfill({ json: { results: [{
        id: 999, name: 'Severance', first_air_date: '2022-02-18', poster_path: null,
      }] } });
    }
    if (url.searchParams.has('query')) {
      return route.fulfill({ json: { results: [{
        id: 888, title: 'Heat', release_date: '1995-12-15', poster_path: null,
      }] } });
    }
    if (url.searchParams.has('tvId')) {
      return route.fulfill({ json: tvDetails(url.searchParams.get('tvId')) });
    }
    if (url.searchParams.has('providers')) {
      return route.fulfill({ json: { 'watch/providers': { results: { BE: null } } } });
    }
    if (url.searchParams.has('id')) {
      return route.fulfill({ json: movieDetails(url.searchParams.get('id')) });
    }
    return route.fulfill({ json: { results: [] } });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ movies, shows }) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_watchlists_meta', JSON.stringify([
      { id: 'default', name: 'À voir' },
      { id: 'weekend', name: 'Week-end' },
    ]));
    localStorage.setItem('lbx_active_watchlist_id', 'default');
    localStorage.setItem('lbx_watchlist_default', JSON.stringify(movies));
    localStorage.setItem('lbx_watchlist_weekend', JSON.stringify([]));
    localStorage.setItem('lbx_tv_watchlists_meta', JSON.stringify([{ id: 'default', name: 'À voir' }]));
    localStorage.setItem('lbx_active_tv_watchlist_id', 'default');
    localStorage.setItem('lbx_tv_watchlist_default', JSON.stringify(shows));
  }, { movies: MOVIES, shows: SHOWS });
  await mockWatchlistApis(page);
  await page.goto('/');
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 3000 }).catch(() => {});
  await page.click('#nav-watchlist');
  await expect(page.locator('#view-watchlist')).toHaveClass(/active/);
});

test('la loupe Films s’ouvre, garde l’ajout réel et se referme avec Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const search = page.locator('#watchlist-movie-search');
  const toggle = page.locator('#watchlist-search-toggle');
  const input = page.locator('#watchlist-input');

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeDisabled();
  const compactBox = await search.boundingBox();
  expect(compactBox.width).toBeCloseTo(44, 0);
  expect(compactBox.height).toBeGreaterThanOrEqual(44);

  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toBeEnabled();
  await expect(input).toBeFocused();
  await expect.poll(async () => (await search.boundingBox()).width).toBeGreaterThan(300);

  await input.fill('Heat');
  const result = page.getByRole('button', { name: 'Ajouter Heat à une liste' });
  await expect(result).toBeVisible();
  await result.tap();
  await expect(page.locator('#wl-picker-modal')).toHaveClass(/open/);
  await page.locator('.wl-picker-item', { hasText: 'À voir' }).tap();
  await expect.poll(async () => page.evaluate(() => window.loadWatchlist().some(item => item.title === 'Heat'))).toBe(true);

  // Rouvre après le choix de liste : le parcours d'ajout ne doit pas casser
  // la commande compacte ni sa restitution de focus au clavier.
  if (!await search.evaluate(element => element.classList.contains('is-open'))) await toggle.tap();
  await input.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(input).toBeDisabled();
});

test('la recherche personne Films ouvre toujours la vraie filmographie', async ({ page }) => {
  await page.tap('#watchlist-search-toggle');
  await page.fill('#watchlist-input', 'Michael');
  await page.getByRole('button', { name: 'Voir la filmographie de Michael Mann' }).tap();
  await expect(page.locator('#person-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#pds-title')).toContainText('Michael Mann');
});

test('le switch conserve sa pastille et révèle la recherche Séries fonctionnelle', async ({ page }) => {
  const switchEl = page.locator('#wl-media-tabs');
  const slider = switchEl.locator('.toggle-slider');
  const initialTransform = await slider.evaluate(element => getComputedStyle(element).transform);

  await page.tap('#wl-tab-tv');
  await expect(switchEl).toHaveClass(/series-active/);
  await expect(page.locator('#watchlist-movie-search')).toBeHidden();
  await expect(page.locator('#watchlist-tv-search')).toBeVisible();
  const seriesTransform = await slider.evaluate(element => getComputedStyle(element).transform);
  expect(seriesTransform).not.toBe(initialTransform);

  await page.tap('#wl-tv-search-toggle');
  await expect(page.locator('#wl-tv-input')).toBeFocused();
  await page.fill('#wl-tv-input', 'Severance');
  await page.getByRole('button', { name: 'Ajouter Severance à la liste Séries' }).tap();
  await expect.poll(async () => page.evaluate(() => window.loadWatchlist(null, 'tv').some(item => item.title === 'Severance'))).toBe(true);
});

test('la bibliothèque aligne switch et filets, garde trois colonnes mobiles et des actions tactiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const wrapBox = await page.locator('.watchlist-segmented-wrap').boundingBox();
  const switchBox = await page.locator('.watchlist-seg-tabs').boundingBox();
  expect(Math.abs(switchBox.x - wrapBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs((switchBox.x + switchBox.width) - (wrapBox.x + wrapBox.width))).toBeLessThanOrEqual(1);

  const layout = await page.locator('#watchlist-list').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
    };
  });
  expect(layout.columns).toBe(3);
  expect(layout.maxHeight).toBe('none');
  expect(layout.overflowY).toBe('visible');

  const poster = await page.locator('.wl-poster').first().boundingBox();
  expect(poster.height / poster.width).toBeCloseTo(1.5, 1);
  for (const action of await page.locator('.wl-card').first().locator('.wl-btn').all()) {
    const box = await action.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const actions = await page.locator('.wl-card').first().locator('.wl-actions').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      direction: style.flexDirection,
      background: style.backgroundColor,
      width: element.getBoundingClientRect().width,
    };
  });
  expect(actions.direction).toBe('column');
  expect(actions.background).toBe('rgba(0, 0, 0, 0)');
  expect(actions.width).toBeLessThanOrEqual(44);
});

test('la loupe À voir reste centrée dans sa cible tactile', async ({ page }) => {
  const alignment = await page.locator('#watchlist-search-toggle').evaluate(toggle => {
    const button = toggle.getBoundingClientRect();
    const icon = toggle.querySelector('.watchlist-search-icon-open').getBoundingClientRect();
    return {
      horizontal: Math.abs((button.left + button.width / 2) - (icon.left + icon.width / 2)),
      vertical: Math.abs((button.top + button.height / 2) - (icon.top + icon.height / 2)),
    };
  });
  expect(alignment.horizontal).toBeLessThanOrEqual(1);
  expect(alignment.vertical).toBeLessThanOrEqual(1);
});

test('À voir ne déborde pas sur 360, 390, 430 ni desktop', async ({ page }) => {
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const activeSearch = page.locator('[data-watchlist-search]:not([hidden])');
    if (!await activeSearch.evaluate(element => element.classList.contains('is-open'))) {
      await activeSearch.locator('.watchlist-search-toggle').click();
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      searchRight: document.querySelector('[data-watchlist-search]:not([hidden])').getBoundingClientRect().right,
    }));
    expect(dimensions.page, `${width}px : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.searchRight, `${width}px : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
  }
});

for (const theme of ['dark', 'light']) {
  test(`la bibliothèque reste accessible en thème ${theme}`, async ({ page }) => {
    if (theme === 'light') {
      await page.evaluate(() => {
        const settings = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
        settings.theme = 'light';
        localStorage.setItem('lbx_settings', JSON.stringify(settings));
        document.documentElement.dataset.theme = 'light';
      });
    }
    await page.tap('#watchlist-search-toggle');
    const scan = await new AxeBuilder({ page }).include('#view-watchlist').analyze();
    const serious = scan.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
    expect(serious, JSON.stringify(serious.map(violation => violation.id))).toHaveLength(0);
  });
}
