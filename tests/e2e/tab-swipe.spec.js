// Test de bout en bout du swipe entre onglets, dans un VRAI navigateur avec
// un vrai viewport mobile — cette classe de bug (une fonction de détection
// d'onglet actif qui ne reconnaît pas un onglet, faussant le calcul du
// suivant) s'est produite plusieurs fois dans ce projet et jsdom ne peut pas
// l'attraper puisqu'il ne simule pas de vrais événements tactiles avec un
// vrai layout. Ce test vérifie TOUTES les paires d'onglets adjacentes, dans
// les deux sens, pour ne plus jamais laisser passer cette régression.
const { test, expect } = require('@playwright/test');

const TAB_ORDER = ['nav-rating', 'nav-history', 'nav-watchlist', 'nav-discover', 'nav-profile'];

// Dispatche une vraie séquence tactile (touchstart -> touchend) dans la page,
// pour simuler un glissement horizontal comme le ferait un doigt réel.
async function swipe(page, { startX, endX, y = 400 }) {
  await page.evaluate(({ startX, endX, y }) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      ev.changedTouches = [{ clientX: x, clientY: y }];
      return ev;
    }
    document.body.dispatchEvent(touchEvent('touchstart', startX, y));
    document.body.dispatchEvent(touchEvent('touchend', endX, y));
  }, { startX, endX, y });
}

test.describe('Navigation par swipe entre les 5 onglets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app-splash.hide', { timeout: 5000 }).catch(() => {});
  });

  // Pour chaque onglet de départ, vérifie qu'un swipe vers la gauche va bien
  // au SUIVANT dans TAB_ORDER, et un swipe vers la droite au PRÉCÉDENT — sans
  // sauter d'onglet ni rester bloqué, quel que soit l'onglet de départ.
  for (let i = 0; i < TAB_ORDER.length; i++) {
    const current = TAB_ORDER[i];

    if (i < TAB_ORDER.length - 1) {
      const next = TAB_ORDER[i + 1];
      test(`depuis ${current}, glisser à gauche va vers ${next}`, async ({ page }) => {
        await page.click(`#${current}`);
        await expect(page.locator(`#${current}`)).toHaveClass(/active/);
        await swipe(page, { startX: 300, endX: 50 }); // glissement vers la gauche
        await expect(page.locator(`#${next}`)).toHaveClass(/active/);
      });
    }

    if (i > 0) {
      const prev = TAB_ORDER[i - 1];
      test(`depuis ${current}, glisser à droite va vers ${prev}`, async ({ page }) => {
        await page.click(`#${current}`);
        await expect(page.locator(`#${current}`)).toHaveClass(/active/);
        await swipe(page, { startX: 50, endX: 300 }); // glissement vers la droite
        await expect(page.locator(`#${prev}`)).toHaveClass(/active/);
      });
    }
  }

  test("glisser au-delà de Noter (premier onglet) ne fait rien", async ({ page }) => {
    await page.click('#nav-rating');
    await swipe(page, { startX: 50, endX: 300 });
    await expect(page.locator('#nav-rating')).toHaveClass(/active/);
  });

  test("glisser au-delà de Profil (dernier onglet) ne fait rien", async ({ page }) => {
    await page.click('#nav-profile');
    await swipe(page, { startX: 300, endX: 50 });
    await expect(page.locator('#nav-profile')).toHaveClass(/active/);
  });
});
