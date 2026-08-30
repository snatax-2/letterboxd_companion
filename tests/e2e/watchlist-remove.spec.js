// Retrait d'une carte de la watchlist, avec annulation possible.
//
// Ludex 2.0 : la watchlist est désormais une grille d'affiches sur les 6
// thèmes (décision confirmée : compositions identiques partout), et le
// swipe horizontal est retiré au profit du bouton "Retirer" toujours
// visible en overlay (voir isDefaultComposition(), 03-foundation.js, qui
// retourne maintenant true inconditionnellement). Ce test couvrait
// auparavant le retrait par glissement tactile ; il couvre maintenant le
// retrait par le menu compact, qui est le seul chemin d'action restant — même
// fonction (removeWatchlist), même toast d'annulation.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // L'écran d'accueil (nouvel utilisateur) et le splash initial interceptaient
  // les clics sur un état vraiment vierge — ce test devenait intermittent
  // selon le hasard du timing. Même correctif que les autres suites E2E.
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => {
    window.saveWatchlist([
      { title: 'Film Watchlist Un', tmdbId: '1', addedAt: new Date().toISOString(), poster: '' },
      { title: 'Film Watchlist Deux', tmdbId: '2', addedAt: new Date().toISOString(), poster: '' },
    ]);
    window.renderWatchlist();
  });
  await page.click('#nav-watchlist');
});

test('retirer une carte de la watchlist via le menu (avec annulation possible)', async ({ page }) => {
  await page.click('.wl-card .wl-menu-btn');
  await expect(page.locator('#action-sheet')).toHaveClass(/open/);
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await page.waitForTimeout(150);

  const titles = await page.locator('.wl-title').allTextContents();
  expect(titles.length).toBe(1);

  // Le toast d'annulation doit être visible et fonctionnel.
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/show/);
  await page.click('.toast-undo-btn');
  await page.waitForTimeout(200);
  const titlesAfterUndo = await page.locator('.wl-title').allTextContents();
  expect(titlesAfterUndo.length).toBe(2);
});
