// Isolation des gestes sur les cartes "À voir" vis-à-vis du glissement
// d'onglet global.
//
// ── LE RETRAIT PAR GLISSEMENT N'EXISTE PLUS ─────────────────────────────
// Ce fichier testait aussi le retrait d'une carte en la glissant vers la
// gauche. Son en-tête notait déjà que Ludex 2.0 avait désactivé ce geste sur
// le thème par défaut, et ciblait donc explicitement Carnet, « qui garde la
// liste en cartes et le swipe d'origine ».
//
// Cette échappatoire a disparu depuis : isDefaultComposition()
// (src/03-foundation.js) renvoie maintenant `true` en dur, la composition
// étant appliquée aux 6 thèmes — « décision confirmée : compositions
// identiques partout, seules les couleurs/polices changent », dit le
// commentaire. Le `if (isDefaultComposition()) return;` de
// initWatchlistSwipe() est donc inconditionnel : plus aucun thème n'a ce
// geste, Carnet compris.
//
// Le retrait d'une carte reste couvert, sur l'affordance actuelle (le bouton
// en surimpression), par watchlist-remove.spec.js — y compris l'annulation.
//
// Ce qui reste ici est la garantie que ce fichier était seul à porter : un
// geste horizontal démarré sur une carte "À voir" ne doit pas faire changer
// d'onglet. Elle tient toujours (isExcludedTarget() de 01-navigation.js
// exclut .wl-card du glissement d'onglet) et mérite son garde-fou.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // L'écran d'accueil (nouvel utilisateur) et le splash initial interceptaient
  // les clics sur un état vraiment vierge — ce test devenait intermittent
  // selon le hasard du timing. Même correctif que les autres suites E2E.
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
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

test('glisser sur une carte watchlist ne change pas d\'onglet', async ({ page }) => {
  const card = page.locator('.wl-card').first();
  const box = await card.boundingBox();
  await card.evaluate((el, box) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      ev.changedTouches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const y = box.y + box.height / 2;
    el.dispatchEvent(touchEvent('touchstart', box.x + box.width - 20, y));
    el.dispatchEvent(touchEvent('touchend', box.x + 20, y));
  }, box);
  await expect(page.locator('#nav-watchlist')).toHaveClass(/active/);
});

test('un glissement sur une carte ne retire rien et n\'ouvre rien', async ({ page }) => {
  // Contrepartie de la note d'en-tête : le geste est bel et bien inerte
  // désormais. Si un jour le glissement revient, ce test rougira — et c'est
  // le signal qu'on veut, plutôt qu'un retrait silencieux non couvert.
  const card = page.locator('.wl-card').first();
  const box = await card.boundingBox();
  await card.evaluate((el, box) => {
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, {
        touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true,
      }));
    }
    touch('touchstart', startX);
    for (let i = 1; i <= 6; i++) touch('touchmove', startX - i * 20);
    touch('touchend', startX - 120);
  }, box);
  await page.waitForTimeout(500);

  // La clé de stockage a changé avec les listes multiples ('lbx_watchlist'
  // n'est plus qu'un vestige migré au premier chargement) : on interroge
  // loadWatchlist(), qui reste le point de vérité quelle que soit la clé.
  const stored = await page.evaluate(() => window.loadWatchlist());
  expect(stored).toHaveLength(2);
  await expect(page.locator('#movie-detail-sheet.open')).toHaveCount(0);
});
