const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Phase 3 : notation de saison. Reutilise les 7 curseurs deja
// existants pour les films (memes IDs), seuls "photo" (-> Qualite du
// final) et "rythme" (-> Rythme & Coherence de la saison) changent de
// libelle et de descriptions en mode serie. La note globale de serie
// n'est jamais stockee — toujours recalculee comme la moyenne des
// saisons notees.

const SEARCH_RESULT = { results: [{ id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' }] };
const SHOW_3_SEASONS = { id: 4607, name: 'True Detective', seasons: [
  { season_number: 1, name: 'Saison 1', episode_count: 1, poster_path: '/s1.jpg' },
  { season_number: 2, name: 'Saison 2', episode_count: 1, poster_path: '/s2.jpg' },
  { season_number: 3, name: 'Saison 3', episode_count: 1, poster_path: '/s3.jpg' },
] };
const ONE_EPISODE = { episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55 }] };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    // Les 3 saisons sont pré-suivies et COMPLÈTES : depuis ce changement de
    // session, sélectionner une saison jamais commencée montre le menu
    // "Commencer" (pas le formulaire) — ces tests portent sur la notation
    // elle-même, donc les saisons doivent déjà être terminées pour y
    // accéder directement, comme le prévoit la nouvelle logique.
    localStorage.setItem('lbx_tv_shows', JSON.stringify([{
      tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
      seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 1 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 1 },
        '3': { seasonName: 'Saison 3', watchedEpisodes: [1], totalEpisodes: 1 },
      },
    }]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: SEARCH_RESULT }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_3_SEASONS }));
  for (const n of [1, 2, 3]) {
    await page.route(`**/api/search?tvSeasonShowId=4607&tvSeasonNumber=${n}`, route => route.fulfill({ json: ONE_EPISODE }));
  }
});

async function selectShowAndSeason(page, seasonNumber = 1) {
  await page.goto('/');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click(`[data-season-number="${seasonNumber}"]`);
  await page.waitForTimeout(400);
}

test('libelles et descriptions adaptes a la saison pour les 2 criteres reformules', async ({ page }) => {
  await selectShowAndSeason(page);
  await expect(page.locator('#notation-card')).toBeVisible();
  await expect(page.locator('#crit-label-photo')).toContainText('Qualité du final');
  await expect(page.locator('#crit-label-rythme')).toContainText('Rythme & Cohérence');
  // Les autres criteres restent inchanges
  await expect(page.locator('#crit-label-realisation')).toContainText('Réalisation & Mise en scène');
});

test('sauvegarde une note de saison et la repropose au retour, saison vierge reste a 5', async ({ page }) => {
  await selectShowAndSeason(page, 1);
  await page.fill('#scenario', '9');
  await page.fill('#photo', '8');
  await page.fill('#review-text', 'Excellente première saison.');
  await page.click('#save-btn');
  await page.waitForTimeout(300);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].rating.values.scenario).toBe('9');
  expect(stored[0].seasons['1'].rating.review).toBe('Excellente première saison.');

  await page.click('[data-season-number="2"]');
  await page.waitForTimeout(400);
  await expect(page.locator('#scenario')).toHaveValue('5'); // pas de note existante

  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);
  await expect(page.locator('#scenario')).toHaveValue('9'); // repeuplee
});

test('note globale de série : moyenne des saisons notées, exclut les non notées', async ({ page }) => {
  await selectShowAndSeason(page, 1);
  await expect(page.locator('#tv-show-average')).toBeHidden();

  for (const c of ['scenario', 'realisation', 'photo', 'acteurs', 'ambiance', 'rythme', 'affect']) {
    await page.fill(`#${c}`, '10');
  }
  await page.click('#save-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#tv-show-average')).toContainText('10.0/10');
  await expect(page.locator('#tv-show-average')).toContainText('1 saison notée');

  await page.click('[data-season-number="2"]');
  await page.waitForTimeout(400);
  for (const c of ['scenario', 'realisation', 'photo', 'acteurs', 'ambiance', 'rythme', 'affect']) {
    await page.fill(`#${c}`, '6');
  }
  await page.click('#save-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#tv-show-average')).toContainText('8.0/10'); // (10+6)/2
  await expect(page.locator('#tv-show-average')).toContainText('2 saisons notées');

  // Saison 3 jamais notee : la selectionner ne doit pas changer la moyenne
  await page.click('[data-season-number="3"]');
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-show-average')).toContainText('8.0/10');
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite : zero violation apres notation - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await selectShowAndSeason(page, 1);
    await page.fill('#scenario', '8');
    await page.click('#save-btn');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
