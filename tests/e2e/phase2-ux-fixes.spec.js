const { test, expect } = require('@playwright/test');

// ── LA PILE DE SUGGESTIONS DE DÉCOUVRIR N'EXISTE PLUS ──────────────────
// Deux tests portaient ici sur #discover-stack : son état vide compact
// ("Note au moins un film"), et le retour à une hauteur normale une fois la
// file peuplée. fa0caea a vidé l'écran Découvrir (-1470 lignes dans
// src/11-discover.js, -230 dans index.html) : plus de pile à balayer, plus
// de file, et donc plus d'état vide — l'écran ne dépend plus de ce qu'on a
// déjà noté, il propose un choix du jour et des rangées par catégorie.
//
// La garantie sous-jacente — "Découvrir est utilisable dès l'installation,
// sans avoir rien noté" — reste vraie et vérifiable, sur le contenu actuel.
test('Decouvrir est utilisable des l\'installation, sans aucune note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);

  // L'écran se rend, avec sa bascule Films/Séries et le choix du jour.
  const wrap = page.locator('#discover-card-wrap');
  await expect(wrap).toBeVisible();
  await expect(wrap.locator('.discover-seg-btn')).toHaveCount(2);
  await expect(page.locator('.choix-du-jour-wrap')).toBeVisible();

  // Et rien n'y invite à noter d'abord : c'était tout l'objet du changement.
  const texte = await wrap.textContent();
  expect(texte).not.toContain('Note au moins un film');
});

test('Historique : bascule Films/Series avec fondu, contenu final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);

  await expect(page.locator('#history-list')).toBeVisible();
  await page.click('#hist-tab-tv');
  // Attend la fin complete de la sequence de fondu (140+150ms) avant de verifier
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-history-list')).toBeVisible();
  await expect(page.locator('#history-list')).toBeHidden();
  const opacity = await page.locator('#tv-history-list').evaluate(el => getComputedStyle(el).opacity);
  console.log('opacity finale apres transition:', opacity);
  expect(opacity).toBe('1');
  // Ludex 2.0 : l'historique des séries est passé à la mosaïque d'affiches des
  // films — .tv-show-card a laissé place à .hist-item.hist-grid-card.
  await expect(page.locator('#tv-history-list .hist-item').first()).toBeVisible();
});

test('Noter : bascule Film/Serie avec fondu, formulaire final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await expect(page.locator('#movie-only-fields')).toBeVisible();
  await page.click('#tab-media-tv');
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-only-fields')).toBeVisible();
  await expect(page.locator('#movie-only-fields')).toBeHidden();
  await expect(page.locator('#tv-search')).toBeVisible();
});

test('Profil : bascule stats Films/Series avec fondu, KPI final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(500);
  await page.click('#stats-tab-tv');
  await page.waitForTimeout(400);
  const label = await page.locator('#kpi-total-label').textContent();
  expect(label).toBe('Séries suivies');
  const opacity = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-grid')).opacity);
  console.log('opacity finale dashboard:', opacity);
  expect(opacity).toBe('1');
});
const { default: AxeBuilder } = require("@axe-core/playwright");
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`a11y phase2 - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    let results = await new AxeBuilder({ page }).analyze();
    let bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} decouvrir: ${bad.length} violation(s)`);
    await page.click('#nav-rating');
    await page.waitForTimeout(400);
    await page.click('#tab-media-tv');
    await page.waitForTimeout(400);
    results = await new AxeBuilder({ page }).analyze();
    bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} apres transition: ${bad.length} violation(s)`);
  });
}
