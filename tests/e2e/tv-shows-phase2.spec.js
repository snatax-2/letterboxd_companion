const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Bandeau de fin de saison + décochage d'un épisode.
//
// ── POURQUOI CE FICHIER A CHANGÉ D'ENDROIT ──────────────────────────────
// Il testait la grille à cocher épisode par épisode telle qu'elle vivait
// dans l'onglet Noter : choisir une saison y affichait la liste des
// épisodes avec un compteur #tv-progress-label.
//
// La refonte d91cd26 ("Refonte suivi episodes : grille dans la fiche serie,
// Noter allege") a démonté ce parcours. Dans Noter, choisir une saison ne
// montre plus de grille du tout — trois états seulement : menu "Commencer",
// message "en cours", ou formulaire de notation. Le pointage épisode par
// épisode se fait désormais dans le widget "En cours" et dans la grille de
// la fiche série. #tv-progress-label n'existe plus nulle part.
//
// Son CHANGELOG annonce d'ailleurs la suppression de ce fichier, au motif
// que sa couverture passait dans tv-shows-noter-flow.spec.js et
// tv-shows-detail-parity.spec.js. La suppression n'a jamais été faite — et
// c'est heureux, parce que le transfert de couverture était incomplet :
// après vérification, deux choses ne sont testées NULLE PART ailleurs.
//   1. Le bandeau de fin de saison (#tv-season-complete-banner) : plus
//      aucune spec ne le mentionnait. Il apparaît quand on coche le dernier
//      épisode depuis le widget "En cours" (maybeShowSeasonCompleteBanner,
//      appelé au seul endroit qu'est le handler du widget).
//   2. Le décochage d'un épisode (detail-parity ne fait que cocher).
// C'est ce que ce fichier couvre maintenant, sur les parcours actuels.

const SHOW_DETAIL = {
  id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
  vote_average: 8.9, status: 'Ended', overview: 'Synopsis.', genres: [], created_by: [],
  seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 3, poster_path: '/s1.jpg' }],
  credits: { cast: [] }, videos: { results: [] }, external_ids: {},
};
const SEASON_EPISODES = { episodes: [
  { episode_number: 1, name: 'The Long Bright Dark', air_date: '2014-01-12', runtime: 58 },
  { episode_number: 2, name: 'Seeing Things', air_date: '2014-01-19', runtime: 52 },
  { episode_number: 3, name: 'The Locked Room', air_date: '2014-01-26', runtime: 51 },
] };

// Deux épisodes sur trois déjà vus : cocher le dernier termine la saison.
function seedAlmostDone() {
  localStorage.setItem('lbx_onboarding_seen', '1');
  localStorage.setItem('lbx_tv_shows', JSON.stringify([
    { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
      '1': { seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 3 },
    } },
  ]));
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_DETAIL }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: SEASON_EPISODES }));
});

test('terminer une saison depuis le widget En cours affiche le bandeau de fin', async ({ page }) => {
  await page.addInitScript(seedAlmostDone);
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000); // resolution asynchrone de la carte

  await expect(page.locator('#tv-season-complete-banner')).toBeHidden();
  await expect(page.locator('.tv-continue-card')).toHaveCount(1);

  // Valide le dernier episode de la saison
  await page.click('.tv-continue-check-btn');
  await page.waitForTimeout(900);

  await expect(page.locator('#tv-season-complete-banner')).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].watchedEpisodes.sort()).toEqual([1, 2, 3]);
  // Le nom stocke reste celui de la saison seule, pas le titre combine.
  expect(stored[0].seasons['1'].seasonName).toBe('Saison 1');
});

test('le bandeau se referme et ne revient pas tout seul', async ({ page }) => {
  await page.addInitScript(seedAlmostDone);
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  await page.click('.tv-continue-check-btn');
  await page.waitForTimeout(900);
  await expect(page.locator('#tv-season-complete-banner')).toBeVisible();

  await page.click('#tv-season-complete-dismiss');
  await page.waitForTimeout(300);
  await expect(page.locator('#tv-season-complete-banner')).toBeHidden();
});

test('decocher un episode depuis la fiche serie retire bien la progression', async ({ page }) => {
  await page.addInitScript(seedAlmostDone);
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await page.waitForTimeout(900);

  // La saison active charge ses episodes toute seule (voir wireSeasonTabs).
  await expect(page.locator('.tv-episode-row')).toHaveCount(3);
  await expect(page.locator('.tv-episode-check[data-episode="2"]')).toHaveClass(/watched/);

  await page.click('.tv-episode-check[data-episode="2"]');
  await page.waitForTimeout(400);

  await expect(page.locator('.tv-episode-check[data-episode="2"]')).not.toHaveClass(/watched/);
  await expect(page.locator('.tv-episode-check[data-episode="1"]')).toHaveClass(/watched/);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].watchedEpisodes.sort()).toEqual([1]);
});

test('accessibilite : zero violation avec le bandeau de fin de saison affiche', async ({ page }) => {
  await page.addInitScript(seedAlmostDone);
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  await page.click('.tv-continue-check-btn');
  await page.waitForTimeout(900);
  await expect(page.locator('#tv-season-complete-banner')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
});
