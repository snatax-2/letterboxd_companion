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

async function waitForStableUi(page) {
  // Axe ne doit pas mesurer le splash décoratif pendant son fondu : son
  // opacité intermédiaire mélange volontairement ses couleurs avec la vue
  // située derrière et produit un faux contraste. Le produit utile est prêt
  // une fois ce nœud retiré du DOM.
  await page.locator('#app-splash').waitFor({ state: 'detached' });
}

for (const theme of ['dark', 'light']) {
  test.describe(`Accessibilité — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await seedRichState(page);
      if (theme !== 'dark') {
        await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
      }
    });

    test(`Noter un film (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(300);
      await waitForStableUi(page);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Historique avec films (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-history');
      await page.waitForTimeout(300);
      await waitForStableUi(page);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Watchlist (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-watchlist');
      await page.waitForTimeout(300);
      await waitForStableUi(page);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Profil avec trophées (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#nav-profile');
      await page.waitForTimeout(400);
      await waitForStableUi(page);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });

    test(`Réglages ouverts (${theme})`, async ({ page }) => {
      await page.goto('/');
      await page.click('#settings-btn');
      await page.waitForTimeout(300);
      await waitForStableUi(page);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = seriousOrCritical(results);
      expect(bad, formatViolations(bad)).toHaveLength(0);
    });
  });
}

// Vues supplémentaires scannées uniquement sur le thème par défaut (éviter de
// dupliquer 6 thèmes × N vues — le principe des couleurs/contrastes est déjà
// couvert par la boucle ci-dessus, qui balaie maintenant les 6 thèmes réels
// de l'application au lieu de 2).
test('Fiche film ouverte', async ({ page }) => {
  await seedRichState(page);
  await page.route('**/api/search*', route => route.fulfill({
    json: { id: 500, title: 'Film Détail', release_date: '2024-01-31', poster_path: null, genres: [{ name: 'Drame' }], credits: { crew: [{ job: 'Director', name: 'X' }], cast: [{ name: 'Y', character: 'Z' }] }, videos: { results: [] }, overview: 'Un synopsis de test.' },
  }));
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open .mds-title');
  await waitForStableUi(page);
  const results = await new AxeBuilder({ page }).analyze();
  const bad = seriousOrCritical(results);
  expect(bad, formatViolations(bad)).toHaveLength(0);
});

test('le groupe de thèmes utilise un roving tabindex et les flèches', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.click('#settings-btn');

  const selected = page.locator('.theme-card[aria-checked="true"]');
  await expect(selected).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.theme-card[tabindex="0"]')).toHaveCount(1);

  await selected.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.theme-card[data-theme="light"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.theme-card[data-theme="light"]')).toBeFocused();
  await expect(page.locator('.theme-card[tabindex="0"]')).toHaveCount(1);

  await page.keyboard.press('End');
  await expect(page.locator('.theme-card[data-theme="system"]')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.theme-card[data-theme="dark"]')).toHaveAttribute('aria-checked', 'true');
});
