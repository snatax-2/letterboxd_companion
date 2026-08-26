// 97ae807 a remplacé les <details> dépliables par saison (.tds-season-details
// + <summary>) par des onglets (.tds-season-tab) et une seule ligne d'état
// pour la saison active. Le commit n'a touché aucun fichier de test.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Historique scindé Films/Séries. Bascule façon Détaillé/Rapide
// (pas un filtre dans une liste mélangée), comptage par SÉRIE pas par
// saison, note globale affichée par carte, suppression d'une série avec
// confirmation.
//
// Ludex 2.0 : passage en grille de posters — la liste de saisons dépliable
// et la réouverture d'une saison ont migré vers la fiche détail (voir
// buildSeasonProgressionSection, 19-tv-detail.js), donc ces tests ouvrent
// désormais la fiche (clic sur la carte) plutôt que ".tv-show-seasons-fold".

const TV_FIXTURE = [
  {
    tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
    seasons: {
      '1': { seasonName: 'Saison 1', watchedEpisodes: [1, 2, 3], totalEpisodes: 8, rating: {
        mode: 'detail',
        values: { scenario: '9', realisation: '9', photo: '9', acteurs: '9', ambiance: '9', rythme: '9', affect: '9' },
        score: '9.0', stars: '★★★★½', review: '', date: '2026-01-01T00:00:00.000Z',
      } },
      '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
    },
  },
];

const TV_DETAIL_FIXTURE = {
  id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
  genres: [], credits: { crew: [], cast: [] }, external_ids: {},
  seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1600 });
  await page.addInitScript((fixture) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify(fixture));
  }, TV_FIXTURE);
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: TV_DETAIL_FIXTURE }));
});

async function goToTvHistory(page) {
  await page.goto('/');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
}

test('badge affiche les deux comptes, films par defaut, bascule vers series', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);

  const badgeText = await page.locator('#hist-count-badge').textContent();
  expect(badgeText).toContain('1 film');
  expect(badgeText).toContain('1 série');
  await expect(page.locator('#history-list')).toBeVisible();
  await expect(page.locator('#tv-history-list')).toBeHidden();

  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await expect(page.locator('#history-list')).toBeHidden();
  await expect(page.locator('#tv-history-list')).toBeVisible();
  await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(1);
});

test('carte de serie : note globale correcte, fiche détail montre les 2 saisons', async ({ page }) => {
  await goToTvHistory(page);
  // Ludex 2.0 : la note vit dans le badge superposé sur l'affiche.
  const cardScore = await page.locator('#tv-history-list .hist-grid-badge').textContent();
  expect(cardScore.trim()).toBe('9.0'); // 1 seule saison notee -> moyenne = sa propre note

  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);
  await expect(page.locator('.tds-season-tab')).toHaveCount(2);
  // Une seule ligne d'état est affichée à la fois : il faut sélectionner
  // l'onglet de la saison 2 pour lire sa progression.
  await page.click('.tds-season-tab[data-season-number="2"]');
  await page.waitForTimeout(300);
  await expect(page.locator('.tds-season-status').first()).toContainText('1/8 ép');
});

test('reouvrir une saison depuis la fiche détail repeuple le formulaire avec la vraie note', async ({ page }) => {
  await goToTvHistory(page);
  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);
  await page.click('.tds-season-tab[data-season-number="1"]'); // saison 1, notee
  await page.waitForTimeout(300);
  await page.click('.tds-season-reopen-btn');
  await page.waitForTimeout(400);

  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
  await expect(page.locator('#scenario')).toHaveValue('9'); // pas la valeur neutre 5
});

test('supprimer une serie retire la carte et met a jour le badge', async ({ page }) => {
  await goToTvHistory(page);
  await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(1);

  await page.click('.tv-show-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);

  await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('#hist-count-badge')).toContainText('0 série');
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite historique series - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await goToTvHistory(page);
    await page.click('.tv-show-card-open-btn');
    await page.waitForSelector('#tv-detail-sheet.open');
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
