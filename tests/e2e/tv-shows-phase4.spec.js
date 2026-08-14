const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Phase 4 : Historique scindé Films/Séries. Bascule façon
// Détaillé/Rapide (pas un filtre dans une liste mélangée), comptage par
// SÉRIE pas par saison, note globale affichée par carte, liste de
// saisons dépliable, réouverture d'une saison pour la re-noter,
// suppression d'une série avec confirmation.

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
  await expect(page.locator('.tv-show-card')).toHaveCount(1);
});

test('carte de serie : note globale correcte, saisons depliables', async ({ page }) => {
  await goToTvHistory(page);
  const cardScore = await page.locator('.tv-show-card-score').textContent();
  expect(cardScore).toContain('9.0/10'); // 1 seule saison notee -> moyenne = sa propre note
  expect(cardScore).toContain('1/2 saison');

  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(200);
  await expect(page.locator('.tv-season-row')).toHaveCount(2);
  await expect(page.locator('.tv-season-row').nth(1)).toContainText('1/8 ép');
});

test('reouvrir une saison depuis l\'historique repeuple le formulaire avec la vraie note', async ({ page }) => {
  await goToTvHistory(page);
  await page.click('.tv-show-seasons-fold summary');
  await page.waitForTimeout(200);
  await page.click('.tv-season-row >> nth=0'); // saison 1, notee
  await page.waitForTimeout(400);

  await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
  await expect(page.locator('#scenario')).toHaveValue('9'); // pas la valeur neutre 5
});

test('supprimer une serie retire la carte et met a jour le badge', async ({ page }) => {
  await goToTvHistory(page);
  await expect(page.locator('.tv-show-card')).toHaveCount(1);

  await page.click('.tv-show-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);

  await expect(page.locator('.tv-show-card')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('#hist-count-badge')).toContainText('0 série');
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'meridien', 'technicolor']) {
  test(`accessibilite historique series - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await goToTvHistory(page);
    await page.click('.tv-show-seasons-fold summary');
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
