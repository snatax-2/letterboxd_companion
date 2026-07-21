const { test, expect } = require('@playwright/test');

// Régression visuelle : compare des captures d'écran contre des références
// commitées (tests/e2e/visual-regression.spec.js-snapshots/), pour attraper
// les régressions de PIXEL qu'aucun test comportemental ne voit (une couleur
// qui change accidentellement, un espacement qui casse, une icône qui
// disparaît). Complémentaire aux tests fonctionnels, pas un remplacement.
//
// LIMITES HONNÊTES : Chromium headless ≠ Mobile Safari (le rendu réel sur
// iPhone peut légèrement différer — polices, anti-aliasing). Ces captures
// attrapent les régressions RELATIVES (« ça a changé depuis hier ») pas la
// fidélité absolue au rendu final sur l'appareil de l'utilisateur.
//
// Vues choisies pour leur STABILITÉ : aucune image réseau (posters vides →
// icônes de substitution), aucune date relative à "aujourd'hui" affichée
// (évite les diffs qui apparaîtraient tout seuls d'un jour à l'autre).
// `animations: 'disabled'` fige transitions/animations CSS pour un rendu
// déterministe.

async function seedStableHistory(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      {
        title: 'Film Un', year: '2020', runtime: '120 min', genre: 'Drame, Action',
        director: 'Réalisateur A', actors: 'Acteur A, Acteur B', score: '8.0',
        mode: 'quick', values: { quick: 4 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z',
        stars: '★★★★', poster: '',
      },
      {
        title: 'Film Deux', year: '2021', runtime: '95 min', genre: 'Comédie',
        director: 'Réalisateur B', actors: 'Acteur C', score: '6.5',
        mode: 'quick', values: { quick: 3.25 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z',
        stars: '★★★', poster: '',
      },
    ]));
  });
}

for (const theme of ['default', 'meridien', 'filmnoir', 'technicolor']) {
  test.describe(`Régression visuelle — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await seedStableHistory(page);
      if (theme !== 'default') {
        await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
      }
    });

    test(`Noter un film (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#app-splash', { state: 'detached', timeout: 3000 }).catch(() => {}); await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`rating-${theme}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    });

    test(`Historique (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-history');
      await page.waitForSelector('#app-splash', { state: 'detached', timeout: 3000 }).catch(() => {}); await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`history-${theme}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    });
  });
}
