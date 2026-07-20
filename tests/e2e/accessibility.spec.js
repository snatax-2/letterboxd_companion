const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Seeds un état riche (historique, watchlist, duels, badges) pour que chaque
// vue scannée ait du VRAI contenu — un écran vide masque des problèmes
// d'accessibilité qui n'apparaissent qu'avec des éléments réels (cartes,
// listes, graphiques).
async function seedRichState(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    const hist = [];
    for (let i = 0; i < 6; i++) {
      hist.push({
        title: 'Film ' + String.fromCharCode(65 + i), year: '202' + i, runtime: (90 + i * 5) + ' min',
        genre: 'Drame, Action', director: 'Réalisateur ' + i, actors: 'Acteur A, Acteur B',
        score: (6 + i * 0.5).toFixed(1), mode: 'quick', values: { quick: 3 + i * 0.2 },
        date: '2026-0' + ((i % 6) + 1) + '-10', savedAt: '2026-0' + ((i % 6) + 1) + '-10T10:00:00.000Z',
        stars: '★★★', review: i === 0 ? 'Une critique de test pour vérifier le rendu.' : '',
      });
    }
    localStorage.setItem('lbx_v2', JSON.stringify(hist));
    localStorage.setItem('lbx_duels', JSON.stringify({
      ratings: { 'film a|202a': { elo: 1250, duels: 3 }, 'film b|202b': { elo: 1150, duels: 3 } },
      totalDuels: 3, pairs: {},
    }));
    localStorage.setItem('lbx_watchlist_default', JSON.stringify([
      { title: 'Film Watchlist', tmdbId: '99', addedAt: new Date().toISOString(), poster: '' },
    ]));
  });
}

// Ne remonte que les violations sérieuses/critiques : les "mineures" incluent
// souvent des faux positifs sur des composants tiers ou des cas limites sans
// impact réel, et noieraient les vrais problèmes sous le bruit.
function seriousOrCritical(results) {
  return results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
}

function formatViolations(violations) {
  return violations.map(v => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} élément(s))`).join('\n');
}

for (const theme of ['default', 'technicolor']) {
  test.describe(`Accessibilité — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await seedRichState(page);
      if (theme !== 'default') {
        await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
      }
    });

    test(`Noter un film (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Historique avec films (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-history');
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Watchlist (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-watchlist');
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Profil avec duels et badges (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-profile');
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Réglages ouverts (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#settings-btn');
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });
  });
}

// Vues supplémentaires scannées uniquement sur le thème par défaut (éviter de
// dupliquer 10 thèmes × N vues — le principe des couleurs/contrastes est déjà
// couvert par la boucle ci-dessus avec Technicolor, le thème le plus stylisé).
test('Fiche film ouverte', async ({ page }) => {
  await seedRichState(page);
  await page.route('**/api/search*', route => route.fulfill({
    json: { id: 500, title: 'Film Détail', release_date: '2024-01-31', poster_path: null, genres: [{ name: 'Drame' }], credits: { crew: [{ job: 'Director', name: 'X' }], cast: [{ name: 'Y', character: 'Z' }] }, videos: { results: [] }, overview: 'Un synopsis de test.' },
  }));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  const results = await new AxeBuilder({ page }).analyze();
  const bad = seriousOrCritical(results);
  expect(bad, formatViolations(bad)).toHaveLength(0);
});

test('Modale de confirmation ouverte', async ({ page }) => {
  await seedRichState(page);
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#reset-duels-btn');
  await page.click('#reset-duels-btn');
  await page.waitForSelector('#modal.open');
  const results = await new AxeBuilder({ page }).analyze();
  const bad = seriousOrCritical(results);
  expect(bad, formatViolations(bad)).toHaveLength(0);
});
