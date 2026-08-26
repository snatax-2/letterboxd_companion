const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Series — Phase 1 (recherche + selection de saison uniquement, pas encore
// le suivi d'episodes ni la notation — Phases 2/3 a venir). Le fichier
// source src/18-tv-shows.js et les elements HTML correspondants existaient
// deja au moment de cette session sans origine claire dans l'historique de
// la conversation — verifie ici de maniere independante plutot que pris
// pour acquis.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  // Route generique EN PREMIER, specifiques APRES (Playwright priorise la
  // plus recemment enregistree — piege documente ailleurs dans ce projet).
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective',
    seasons: [
      { season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' },
      { season_number: 2, name: 'Saison 2', episode_count: 8, poster_path: '/s2.jpg' },
    ],
  } }));
});

test('bascule Film/Serie : recherche ouvre directement la fiche detaillee, retour vers Film', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(400);

  await expect(page.locator('#tv-only-fields')).toBeHidden();
  await page.click('#tab-media-tv');
  await expect(page.locator('#tv-only-fields')).toBeVisible();
  await expect(page.locator('#movie-only-fields')).toBeHidden();
  await expect(page.locator('#notation-card')).toBeHidden(); // pas de saison selectionnee

  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await expect(page.locator('.suggestion-item')).toHaveCount(1);

  await page.click('.suggestion-item');
  await page.waitForTimeout(600);

  // La fiche detaillee s'ouvre directement, plus de puces de saison dans Noter
  await expect(page.locator('#tv-detail-sheet')).toHaveClass(/open/);
  await expect(page.locator('#tds-title')).toContainText('True Detective');
  await expect(page.locator('#tv-season-picker')).toBeHidden();
  // 97ae807 a remplacé les lignes dépliables par saison (.tds-season-progress-row)
  // par des onglets (.tds-season-tab) + une seule ligne d'état pour la saison
  // active (.tds-season-status). Le commit n'a touché aucun fichier de test.
  await expect(page.locator('.tds-season-tab')).toHaveCount(2);

  await page.click('#tds-close-btn');
  await page.waitForTimeout(300);

  await page.click('#tab-media-movie');
  await expect(page.locator('#tv-only-fields')).toBeHidden();
  await expect(page.locator('#movie-only-fields')).toBeVisible();
  await expect(page.locator('#notation-card')).toBeVisible();
});

test('accessibilite : zero violation sur le flux complet de selection', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-rating');
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toHaveLength(0);
});

// Barre de navigation — largeurs des 4 onglets normaux vraiment egales
// (min-width:0 manquant faisait deborder "Historique"/"Decouvrir" et
// ecrasait "A voir" sur 2 lignes, cassant la symetrie autour du bouton
// Noter — signale par l'utilisateur, confirme visuellement avant fix).

test('nav bar : les 4 onglets normaux ont une largeur strictement egale, sur 6 themes', async ({ page }) => {
  // Six chargements de page complets dans un seul test : le budget de 30s par
  // défaut de Playwright n'y suffit pas (l'écran de démarrage a une durée
  // minimale volontaire). Le test expirait sur un page.goto, sans rapport avec
  // ce qu'il vérifie — échec identique sur origin/main. L'assertion, elle,
  // reste valable et utile : on lui donne le temps de s'exécuter.
  test.setTimeout(90_000);
  for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await page.goto('/');
    await page.waitForTimeout(300);
    const widths = await page.evaluate(() => Array.from(document.querySelectorAll('.nav-btn:not(.nav-btn-primary)')).map(el => Math.round(el.getBoundingClientRect().width)));
    expect(Math.max(...widths) - Math.min(...widths), `theme ${theme}: ${JSON.stringify(widths)}`).toBeLessThan(3);
  }
});
