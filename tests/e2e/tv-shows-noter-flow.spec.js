const { test, expect } = require('@playwright/test');

// Onglet Noter — arrivée sur le formulaire de notation d'une saison.
//
// ── DEUX DES TROIS ÉTATS TESTÉS ICI SONT DEVENUS INATTEIGNABLES ─────────
// Ce fichier a été écrit par la refonte d91cd26 pour couvrir les trois états
// que selectSeason() peut produire dans Noter, atteints en choisissant une
// série dans la recherche puis une saison dans #tv-season-picker :
//   1. saison jamais touchée  -> menu "Commencer [Série] — [Saison] ?"
//   2. saison déjà en cours   -> message renvoyant au widget "En cours"
//   3. saison terminée        -> formulaire de notation, pré-rempli si notée
//
// Ludex 2.0 (b219362) a ensuite changé ce qu'un clic sur une suggestion
// fait : selectShow() appelle maintenant openTvDetailSheet() et masque
// #tv-season-picker. Vérifié : ce picker est mis à display:none en quatre
// endroits du code et n'est JAMAIS réaffiché nulle part. Le parcours
// "choisir une saison dans Noter" n'existe donc plus.
//
// Conséquence, selectSeason() n'est plus appelée que depuis la fiche série,
// par .tds-rate-now-btn et .tds-season-reopen-btn — deux boutons qui
// n'apparaissent que sur une saison complète ou déjà notée. Sa branche
// `isComplete` est donc la seule encore atteignable : les états 1 et 2, le
// bouton #tv-start-season-btn et startTrackingSeason() sont du code mort de
// fait. L'action équivalente vit maintenant dans la fiche
// (#tds-start-btn, "Commencer la série"), couverte par
// tv-shows-detail-sheet.spec.js.
//
// Ces trois tests échouaient donc à l'identique sur origin/main (vérifié).
// Ils sont réécrits sur le parcours réel ; la perte des deux autres états
// est signalée comme trouvaille, pas comblée ici — rétablir un point
// d'entrée est une décision produit.

const SHOW_DETAIL = {
  id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
  vote_average: 8.9, status: 'Ended', overview: 'Synopsis.', genres: [], created_by: [],
  seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 2, poster_path: '/s1.jpg' }],
  credits: { cast: [] }, videos: { results: [] }, external_ids: {},
};
const SEASON_EPISODES = { episodes: [
  { episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55, overview: 'Un synopsis.' },
  { episode_number: 2, name: 'Ep 2', air_date: '2014-01-19', runtime: 52, overview: 'Un autre.' },
] };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_DETAIL }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: SEASON_EPISODES }));
});

// addInitScript sérialise la fonction pour l'exécuter dans le navigateur : une
// fermeture n'y survit pas. Les données doivent passer par le second argument.
async function seed(page, seasons) {
  await page.addInitScript((s) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: s },
    ]));
  }, seasons);
}

test('chercher une serie dans Noter ouvre sa fiche, plus le selecteur de saisons', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(700);

  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#tv-season-picker')).toBeHidden();
  await expect(page.locator('#notation-card')).toBeHidden();
});

test('saison complete mais pas encore notee : le bouton Noter ouvre un formulaire vierge', async ({ page }) => {
  await seed(page, {
    '1': { seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 2 },
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  // Le bouton "Noter cette saison" n'est révélé qu'une fois la liste
  // d'épisodes construite (updateTdsRateButtonVisibility, appelée en fin de
  // renderTdsEpisodeChecklist) : attendre les lignes, pas une durée fixe.
  await expect(page.locator('.tv-episode-row')).toHaveCount(2);
  await expect(page.locator('.tds-rate-now-btn')).toBeVisible();

  await page.click('.tds-rate-now-btn');
  await page.waitForTimeout(700);

  await expect(page.locator('#notation-card')).toBeVisible();
  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
  // Le bandeau rappelle de quelle saison il s'agit.
  await expect(page.locator('#tv-strip-title')).toContainText('True Detective');
  await expect(page.locator('#tv-strip-title')).toContainText('Saison 1');
  await expect(page.locator('#tv-strip-genre')).toContainText('2 épisodes');
  // Jamais notee : les curseurs restent a leur valeur neutre.
  await expect(page.locator('#scenario')).toHaveValue('5');
});

test('saison deja notee : le formulaire rouvre pre-rempli', async ({ page }) => {
  await seed(page, {
    '1': {
      seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 2,
      rating: {
        mode: 'detail', score: '9.0', stars: '', review: 'Excellente saison.',
        date: '2026-01-01', values: { scenario: '9', realisation: '9', photo: '9', acteurs: '9', ambiance: '9', rythme: '9', affect: '9' },
      },
    },
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate((id) => openTvDetailSheet(id), '4607');
  await expect(page.locator('.tv-episode-row')).toHaveCount(2);

  // Sur une saison notee, c'est .tds-season-reopen-btn qui mene au formulaire.
  await expect(page.locator('.tds-season-reopen-btn')).toBeVisible();
  await page.click('.tds-season-reopen-btn');
  await page.waitForTimeout(700);

  await expect(page.locator('#notation-card')).toBeVisible();
  await expect(page.locator('#scenario')).toHaveValue('9');
  await expect(page.locator('#review-text')).toHaveValue('Excellente saison.');
});
