const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({ json: { id: 999, title: 'Nouveau Film', genres: [] } });
  });
});

test('choisir une liste existante ajoute le film dedans (pas forcement la liste active)', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  // Attendre la fin du démarrage avant de semer : au chargement, l'app migre
  // l'ancienne clé de watchlist unique vers les listes multiples (voir
  // LEGACY_WATCHLIST_KEY, 08-watchlist.js). Semer pendant cette fenêtre était
  // une course — la migration écrasait parfois le meta qu'on venait d'écrire,
  // et le test échouait alors une fois sur deux, en alternance avec son
  // voisin. L'écran de démarrage se retire à la fin du boot : son absence est
  // un repère fiable, contrairement à un délai fixe.
  await page.waitForFunction(() => !document.getElementById('app-splash'));
  await page.evaluate(() => {
    window.saveWatchlistsMeta([{ id: 'list-a', name: 'Films du weekend' }, { id: 'list-b', name: 'A revoir' }]);
    localStorage.setItem('lbx_active_watchlist_id', 'list-a');
  });
  await page.evaluate(() => {
    window.addToWatchlistFromTMDb({ id: 999, title: 'Nouveau Film', poster_path: null }, 2024);
  });
  await page.waitForSelector('#wl-picker-modal.open');

  const items = await page.locator('.wl-picker-item').allTextContents();
  expect(items.some(t => t.includes('Films du weekend'))).toBe(true);
  expect(items.some(t => t.includes('A revoir'))).toBe(true);

  // Choisit la liste INACTIVE (list-b) pour verifier que ca marche meme si ce n'est pas la liste active
  await page.locator('.wl-picker-item', { hasText: 'A revoir' }).click();
  await expect(page.locator('#wl-picker-modal')).not.toHaveClass(/open/);

  // Même course que dans le test suivant : addToSpecificWatchlist() écrit après
  // un await, la fermeture de la modale est synchrone. On attend l'écriture.
  await page.waitForFunction(
    () => (window.loadWatchlist('list-b') || []).some(f => f.title === 'Nouveau Film'),
  );
  const listB = await page.evaluate(() => window.loadWatchlist('list-b'));
  expect(listB.some(f => f.title === 'Nouveau Film')).toBe(true);
  const listA = await page.evaluate(() => window.loadWatchlist('list-a'));
  expect(listA.some(f => f.title === 'Nouveau Film')).toBe(false);
});

test('creer une nouvelle liste a la volee ajoute le film dedans', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  // Attendre la fin du démarrage avant de semer : au chargement, l'app migre
  // l'ancienne clé de watchlist unique vers les listes multiples (voir
  // LEGACY_WATCHLIST_KEY, 08-watchlist.js). Semer pendant cette fenêtre était
  // une course — la migration écrasait parfois le meta qu'on venait d'écrire,
  // et le test échouait alors une fois sur deux, en alternance avec son
  // voisin. L'écran de démarrage se retire à la fin du boot : son absence est
  // un repère fiable, contrairement à un délai fixe.
  await page.waitForFunction(() => !document.getElementById('app-splash'));
  await page.evaluate(() => {
    window.saveWatchlistsMeta([{ id: 'list-a', name: 'Films du weekend' }]);
  });
  await page.evaluate(() => {
    window.addToWatchlistFromTMDb({ id: 999, title: 'Nouveau Film', poster_path: null }, 2024);
  });
  await page.waitForSelector('#wl-picker-modal.open');

  await page.click('#wl-picker-new-btn');
  await page.fill('#wl-picker-new-input', 'Films de Noel');
  await page.click('#wl-picker-new-confirm');

  await expect(page.locator('#wl-picker-modal')).not.toHaveClass(/open/);

  const meta = await page.evaluate(() => window.loadWatchlistsMeta());
  const newList = meta.find(l => l.name === 'Films de Noel');
  expect(newList).toBeTruthy();

  // addToSpecificWatchlist() est asynchrone (elle interroge TMDb pour le genre,
  // la note et la durée avant d'écrire) alors que la fermeture de la modale,
  // elle, est synchrone. Lire le stockage juste après le clic revenait donc à
  // le lire AVANT l'écriture. On attend l'ajout plutôt qu'un délai fixe.
  await page.waitForFunction(
    (id) => (window.loadWatchlist(id) || []).some(f => f.title === 'Nouveau Film'),
    newList.id,
  );
  const items = await page.evaluate((id) => window.loadWatchlist(id), newList.id);
  expect(items.some(f => f.title === 'Nouveau Film')).toBe(true);
});
