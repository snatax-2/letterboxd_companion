const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Parité fiche film / fiche série — corrections suite à l'audit demandé
// par l'utilisateur : casting en carrousel horizontal (mauvais nom de
// classe corrigé), en-tête qui rétrécit au défilement, glissement vers le
// bas pour fermer, créateurs cliquables vers la fiche personne,
// "Changer l'affiche" (nouveau point serveur tvImages), couleur d'accent
// de l'affiche (fiche + cartes Historique).


test('casting en carrousel horizontal, cliquable vers la fiche personne', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.',
    genres: [{ id: 1, name: 'Policier' }],
    created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [
      { id: 1, name: 'Matthew McConaughey', character: 'Rust Cohle', profile_path: null },
      { id: 2, name: 'Woody Harrelson', character: 'Marty Hart', profile_path: null },
    ] },
    videos: { results: [] },
    external_ids: {},
  } }));
  await page.route('**/api/search?personId=100', route => route.fulfill({ json: {
    id: 100, name: 'Nic Pizzolatto', biography: 'Scenariste et producteur.', profile_path: null, movie_credits: { cast: [] },
  } }));
  await page.route('**/api/search?personId=1', route => route.fulfill({ json: {
    id: 1, name: 'Matthew McConaughey', biography: 'Acteur.', profile_path: null, movie_credits: { cast: [] },
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);
  await page.click('.tv-show-card-open-btn');
  await page.waitForTimeout(700);

  // Le carrousel utilise bien .mds-cast-item (le bon nom de classe, style)
  await expect(page.locator('.mds-cast-item')).toHaveCount(4); // 2 acteurs x2 (liste dupliquee pour le defilement en boucle)
  const carouselDisplay = await page.locator('.mds-cast-track').evaluate(el => getComputedStyle(el).display);
  console.log('affichage de la piste du carrousel (doit etre flex, pas block):', carouselDisplay);
  expect(carouselDisplay).toBe('flex');

  // Clique un acteur -> ouvre sa fiche personne
  await page.click('.mds-cast-item >> nth=0');
  await page.waitForTimeout(500);
  await expect(page.locator('#person-detail-sheet')).toHaveClass(/open/);
  console.log('fiche personne ouverte depuis le casting serie : OK');
});

test('createur cliquable ouvre sa fiche personne', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.',
    genres: [], created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.route('**/api/search?personId=100', route => route.fulfill({ json: {
    id: 100, name: 'Nic Pizzolatto', biography: 'Scenariste.', profile_path: null, movie_credits: { cast: [] },
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);
  await page.click('.mds-person-link');
  await page.waitForTimeout(500);
  await expect(page.locator('#person-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#pds-content')).toContainText('Nic Pizzolatto');
});

test('en-tete se retrecit au defilement dans la fiche serie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Une anthologie policière sombre.',
    genres: [{ id: 1, name: 'Policier' }, { id: 2, name: 'Drame' }],
    created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
    seasons: [
      { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
      { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
      { season_number: 3, name: 'Saison 3', episode_count: 8, poster_path: '/s3.jpg' },
    ],
    credits: { cast: [
      { id: 1, name: 'Matthew McConaughey', character: 'Rust Cohle', profile_path: null },
      { id: 2, name: 'Woody Harrelson', character: 'Marty Hart', profile_path: null },
    ] },
    videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(700);
  await page.locator('#tv-detail-sheet .mds-box').evaluate(el => {
    el.scrollTop = 300;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);
  const isCompact = await page.locator('#tv-detail-sheet .mds-header').evaluate(el => el.classList.contains('compact'));
  console.log('en-tete compact apres defilement:', isCompact);
  expect(isCompact).toBe(true);
});

test('changer l\'affiche : bouton visible si suivie, sauvegarde le choix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/original.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/original.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.route('**/api/search?tvImages=4607', route => route.fulfill({ json: {
    posters: [{ file_path: '/alt1.jpg', iso_639_1: 'en' }, { file_path: '/alt2.jpg', iso_639_1: null }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);

  await expect(page.locator('.mds-poster-change-btn')).toBeVisible();
  await page.click('.mds-poster-change-btn');
  await page.waitForTimeout(500);
  await expect(page.locator('#poster-picker-modal')).toHaveClass(/open/);
  await expect(page.locator('.poster-picker-cell')).toHaveCount(2);

  await page.click('.poster-picker-cell >> nth=0');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  console.log('poster sauvegarde:', stored[0].poster_path);
  expect(stored[0].poster_path).toBe('/alt1.jpg');
});

test('serie jamais suivie : pas de bouton changer l\'affiche', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);
  await expect(page.locator('.mds-poster-change-btn')).toHaveCount(0);
});

test('glissement vers le bas ferme la fiche serie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);
  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);

  await page.locator('#tv-detail-sheet .mds-box').evaluate((el) => {
    function touch(type, y) {
      const t = new Touch({ identifier: 1, target: el, clientX: 195, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }
    touch('touchstart', 100);
    touch('touchmove', 250);
    touch('touchend', 250);
  });
  await page.waitForTimeout(500);
  await expect(page.locator('#tv-detail-sheet')).not.toHaveClass(/open/);
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite parite fiche serie - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1600 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        } },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
      id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
      vote_average: 8.9, status: 'Returning Series', overview: 'Une anthologie policière sombre.',
      genres: [{ id: 1, name: 'Policier' }], created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
      seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
      credits: { cast: [{ id: 1, name: 'Matthew McConaughey', character: 'Rust Cohle', profile_path: null }] },
      videos: { results: [] }, external_ids: {},
    } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.evaluate((id) => openTvDetailSheet(id), '4607');
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
test('grille d\'episodes dans la fiche serie : deplier, cocher, rattrapage, noter une fois complete', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [], totalEpisodes: 3 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 3, poster_path: '/s1.jpg' }],
    credits: { cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [
      { episode_number: 1, name: 'The Long Bright Dark', air_date: '2014-01-12', runtime: 58 },
      { episode_number: 2, name: 'Seeing Things', air_date: '2014-01-19', runtime: 52 },
      { episode_number: 3, name: 'The Locked Room', air_date: '2014-01-26', runtime: 51 },
    ],
  } }));

  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);

  // Pas de grille avant de deplier
  await expect(page.locator('.tv-episode-row')).toHaveCount(0);
  await expect(page.locator('.tds-rate-now-btn')).toBeHidden();

  // Deplie la saison
  await page.click('.tds-season-progress-row');
  await page.waitForTimeout(500);
  await expect(page.locator('.tv-episode-row')).toHaveCount(3);

  // Coche l'episode 3 directement -> rattrapage propose et accepte
  await page.click('.tv-episode-check[data-episode="3"]');
  await page.waitForTimeout(300);
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveClass(/watched/);
  await expect(page.locator('.tv-episode-check[data-episode="2"]')).toHaveClass(/watched/);
  await expect(page.locator('.tv-episode-check[data-episode="3"]')).toHaveClass(/watched/);

  // Le statut dans le <summary> doit se mettre a jour en direct
  const statusText = await page.locator('.tds-season-status').textContent();
  console.log('statut apres rattrapage complet:', statusText);
  expect(statusText).toContain('3/3');

  // Le bouton Noter doit apparaitre, la saison etant complete
  await expect(page.locator('.tds-rate-now-btn')).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].watchedEpisodes.sort()).toEqual([1, 2, 3]);

  // Clique Noter -> doit fermer la fiche et ouvrir directement le formulaire de notation
  await page.click('.tds-rate-now-btn');
  await page.waitForTimeout(600);
  await expect(page.locator('#tv-detail-sheet')).not.toHaveClass(/open/);
  await expect(page.locator('#notation-card')).toBeVisible();
  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
});
