const { test, expect } = require('@playwright/test');

// Suppression depuis l'historique des séries.
//
// ── CE QUE CE FICHIER TESTAIT AVANT ─────────────────────────────────────
// Le glissement latéral sur la carte de série (`.tv-show-card-header-wrap`)
// et sur chaque ligne de saison (`.tv-season-row`), avec armement
// (`hist-swipe-armed-left`) puis confirmation via un indice glissé
// (`.hist-swipe-hint-left`).
//
// Ce balisage a disparu avec Ludex 2.0 (commit b219362) : l'historique des
// séries est passé d'une carte dépliable à une mosaïque d'affiches, la même
// que celle des films. Le geste a été retiré volontairement au profit
// d'actions en surimpression permanente — le raisonnement est écrit dans
// styles.css (section HISTORY) : « Actions toujours visibles en overlay
// plutôt qu'au tap : plus sûr sur tactile qu'un survol qui n'existe pas
// vraiment sur mobile ». Le contrôleur de glissement des saisons
// (initTvSeasonSwipeGestures, 178 lignes) était orphelin depuis, et a été
// supprimé.
//
// Aucun de ces cinq tests ne décrivait donc plus le produit. Ce qui compte
// pour l'utilisateur — pouvoir retirer une série entière, ou une seule de
// ses saisons — est conservé ici, sur les affordances actuelles.

const SHOW_DETAIL = {
  id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
  vote_average: 8.9, status: 'Returning Series', overview: 'Synopsis.', genres: [], created_by: [],
  seasons: [
    { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
    { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
  ],
  credits: { cast: [] }, videos: { results: [] }, external_ids: {},
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: SHOW_DETAIL }));
});

async function goToTvHistory(page) {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);
}

test('le bouton retirer de la carte supprime la serie entiere, apres confirmation', async ({ page }) => {
  await goToTvHistory(page);

  await expect(page.locator('.hist-item[data-show-id="4607"]')).toHaveCount(1);
  await page.click('.tv-show-delete-btn');

  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('True Detective');
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('.hist-item[data-show-id="4607"]')).toHaveCount(0);
});

test('annuler la confirmation ne supprime rien', async ({ page }) => {
  await goToTvHistory(page);
  await page.click('.tv-show-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-cancel');
  await page.waitForTimeout(300);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(1);
  expect(Object.keys(stored[0].seasons).sort()).toEqual(['1', '2']);
  await expect(page.locator('.hist-item[data-show-id="4607"]')).toHaveCount(1);
});

test('retirer UNE saison depuis la fiche laisse la serie et ses autres saisons', async ({ page }) => {
  // Le pendant de l'ancien « glisser une SAISON individuelle » : la
  // granularité par saison n'est plus dans l'historique mais dans la fiche
  // série, où chaque saison a son propre bouton de retrait.
  await goToTvHistory(page);
  await page.click('.tv-show-card-open-btn');
  await page.waitForTimeout(800);

  await page.click('.tds-season-delete-btn[data-season-key="2"]');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('Saison 2');
  await page.click('#modal-confirm');
  await page.waitForTimeout(600);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(1);                       // la serie reste
  expect(Object.keys(stored[0].seasons)).toEqual(['1']); // seule la saison 2 est partie
  expect(stored[0].seasons['1'].watchedEpisodes).toEqual([1]);
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['dark', 'light']) {
  test(`accessibilite de l'historique des series - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await goToTvHistory(page);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
