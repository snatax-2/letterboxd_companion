const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Fiche série détaillée — même structure/mécanique que la fiche film
// (squelette, sections en cascade, notes externes chargées en asynchrone),
// avec la vraie différence : pas de "Ta note" unique, mais la progression
// par saison (TOUTES les saisons TMDb, pas seulement celles suivies
// localement) + une note globale calculée à la volée.

const SHOW_DETAIL = {
  id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
  vote_average: 8.9, status: 'Returning Series', overview: 'Une anthologie policière sombre.',
  genres: [{ id: 1, name: 'Policier' }, { id: 2, name: 'Drame' }],
  created_by: [{ id: 100, name: 'Nic Pizzolatto' }],
  seasons: [
    { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
    { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
    { season_number: 3, name: 'Saison 3', episode_count: 8, poster_path: '/s3.jpg' },
  ],
  credits: { cast: [{ id: 1, name: 'Matthew McConaughey', character: 'Rust Cohle', profile_path: null }] },
  videos: { results: [] },
  external_ids: { imdb_id: 'tt2356777' },
};
const EXTERNAL_RATINGS = { ratings: [{ Source: 'Internet Movie Database', Value: '8.9/10' }, { Source: 'Rotten Tomatoes', Value: '94%' }] };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_DETAIL }));
  await page.route('**/api/search?imdbId=tt2356777', route => route.fulfill({ json: EXTERNAL_RATINGS }));
});

test('en-tete, progression par saison (toutes les saisons TMDb, statuts corrects), note globale, notes externes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      {
        tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
        seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1,2,3,4,5,6,7,8], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
          '2': { seasonName: 'Saison 2', watchedEpisodes: [1,2], totalEpisodes: 8 },
        },
      },
    ]));
  });
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=3', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2019-01-13', runtime: 55 }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);
  await page.click('.tv-show-card-open-btn');
  await page.waitForTimeout(600);

  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#tds-title')).toHaveText('True Detective');
  await expect(page.locator('.mds-meta')).toContainText('3 saisons'); // TMDb, pas les 2 suivies localement
  await expect(page.locator('.mds-header-director')).toContainText('Nic Pizzolatto');
  await expect(page.locator('.mds-personal-score')).toContainText('9.0/10'); // moyenne de la seule saison notee

  // 97ae807 a remplacé les lignes dépliables par saison
  // (.tds-season-progress-row) par des onglets (.tds-season-tab) et UNE
  // ligne d'état pour la seule saison active — on ne peut donc plus lire les
  // trois d'un coup, il faut passer d'un onglet à l'autre. Le commit n'a
  // touché aucun fichier de test.
  await expect(page.locator('.tds-season-tab')).toHaveCount(3);
  const statusForSeason = async (n) => {
    await page.click(`.tds-season-tab[data-season-number="${n}"]`);
    await page.waitForTimeout(300);
    return page.locator('.tds-season-status').first().textContent();
  };
  expect(await statusForSeason(1)).toContain('9.0/10');
  expect(await statusForSeason(2)).toContain('2/8 ép');
  expect(await statusForSeason(3)).toContain('Non suivie');

  await page.waitForTimeout(500);
  await expect(page.locator('#tds-external-ratings')).toContainText('IMDb');
  await expect(page.locator('#tds-external-ratings')).toContainText('RT');

  // Cliquer une saison n'ouvre plus Noter : l'onglet charge sa liste
  // d'épisodes dans la fiche elle-même (même refonte). Le passage vers Noter
  // se fait maintenant par le bouton "Rouvrir pour noter"
  // (.tds-season-reopen-btn), qui n'apparaît que sur une saison notable —
  // c'est-à-dire déjà notée, ou complète. Une saison jamais suivie n'en a
  // donc pas, et c'est délibéré : le bouton promettait auparavant une
  // notation que selectSeason() refusait ensuite d'afficher (voir le
  // commentaire de buildSeasonStatusRow, 19-tv-detail.js).
  await page.click('.tds-season-tab[data-season-number="3"]');
  await page.waitForTimeout(400);
  await expect(page.locator('.tds-season-reopen-btn')).toHaveCount(0);

  // Sur la saison 1, notée, le bouton existe et ouvre bien Noter.
  await page.click('.tds-season-tab[data-season-number="1"]');
  await page.waitForTimeout(400);
  await page.click('.tds-season-reopen-btn');
  await page.waitForTimeout(500);
  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
  await expect(page.locator('#tv-strip-title')).toContainText('Saison 1');
});

test('serie jamais suivie : pas de note globale, bouton Noter/Suivre pre-remplit la recherche', async ({ page }) => {
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55 }],
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(600);

  await expect(page.locator('#tds-content')).toContainText('Pas encore notée');

  // #tds-rate-btn n'existe plus. Sur une série jamais suivie, la fiche
  // propose #tds-start-btn ("Commencer la série"), qui ne renvoie plus vers
  // Noter : il crée le suivi de la première saison sur place, l'ajoute au
  // widget "En cours" et recharge la fiche (voir le handler #tds-start-btn,
  // 19-tv-detail.js). C'est ce parcours-là qu'on vérifie maintenant.
  await page.click('#tds-start-btn');
  await page.waitForTimeout(800);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  const show = stored.find(s => String(s.tmdbTvId) === '4607');
  expect(show).toBeTruthy();
  expect(show.seasons['1'].watchedEpisodes).toEqual([]);

  // La fiche s'est rechargée : le bouton a laissé place à la progression.
  await expect(page.locator('#tds-start-btn')).toHaveCount(0);
  await expect(page.locator('.tds-season-tab').first()).toBeVisible();
});

for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
  test(`accessibilite fiche detaillee serie - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
        } },
      ]));
    }, theme);
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(400);
    await page.click('.tv-show-card-open-btn');
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
