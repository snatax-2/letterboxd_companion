const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Phase 5 : statistiques. Bascule sur le tableau de bord
// analytique (KPI, radar, distribution des notes) — comptage par SÉRIE
// pas par saison. La heatmap ET le graphique "Activité (6 derniers mois)"
// restent uniques dans les deux modes (décidé ensemble pour la heatmap,
// étendu au graphique d'activité par cohérence). "Top Réalisateurs" caché
// en mode Séries (aucune donnée de showrunner disponible).

const TV_FIXTURE = [
  {
    tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
    seasons: { '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: {
      mode: 'detail',
      values: { scenario: '9', realisation: '8', photo: '10', acteurs: '9', ambiance: '8', rythme: '7', affect: '9' },
      score: '8.6', stars: '★★★★', review: '', date: '2026-08-01T00:00:00.000Z',
    } } },
  },
  {
    tmdbTvId: 66732, title: 'Stranger Things', poster_path: '/p2.jpg',
    seasons: { '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: {
      mode: 'detail',
      values: { scenario: '6', realisation: '6', photo: '5', acteurs: '7', ambiance: '6', rythme: '6', affect: '6' },
      score: '6.0', stars: '★★★', review: '', date: '2025-01-01T00:00:00.000Z',
    } } },
  },
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 2200 });
  await page.addInitScript((fixture) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '', director: 'Un Réalisateur' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify(fixture));
  }, TV_FIXTURE);
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

async function goToTvStats(page) {
  await page.goto('/');
  await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await page.click('#stats-tab-tv');
  await page.waitForTimeout(900); // animateCountUp dure 700ms par defaut
}

test('films par defaut, bascule vers series change les libelles et cache Top Realisateurs', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('#kpi-total-label')).toHaveText('Films notés');
  await expect(page.locator('#top-directors-box')).toBeVisible();

  await page.click('#stats-tab-tv');
  await page.waitForTimeout(900);
  await expect(page.locator('#kpi-total-label')).toHaveText('Séries suivies');
  await expect(page.locator('#top-directors-box')).toBeHidden();
});

test('KPI comptes par serie et moyenne correcte (pas par saison)', async ({ page }) => {
  await goToTvStats(page);
  await expect(page.locator('#kpi-total')).toHaveText('2'); // 2 series, pas de saisons en double
  await expect(page.locator('#kpi-avg')).toHaveText('7.3'); // (8.6+6.0)/2
});

test('radar avec libelles adaptes (Final, Cohérence — pas Photo/Rythme)', async ({ page }) => {
  await goToTvStats(page);
  await expect(page.locator('#radar-chart-container svg')).toHaveCount(1);
  await expect(page.locator('#radar-empty')).toBeHidden();
  const radarText = await page.locator('#radar-chart-container').textContent();
  expect(radarText).toContain('Final');
  expect(radarText).toContain('Cohér');
  expect(radarText).not.toContain('Photo');
});

test('distribution des notes rendue pour les series', async ({ page }) => {
  await goToTvStats(page);
  await expect(page.locator('#histogram .histo-row')).toHaveCount(10);
});

test('retour vers Films restaure les vrais KPI films', async ({ page }) => {
  await goToTvStats(page);
  await page.click('#stats-tab-movie');
  await page.waitForTimeout(900);
  await expect(page.locator('#kpi-total-label')).toHaveText('Films notés');
  await expect(page.locator('#kpi-total')).toHaveText('1');
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite stats series - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await goToTvStats(page);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
