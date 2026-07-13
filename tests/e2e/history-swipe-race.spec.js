// Reproduit le bug signalé : glisser un film de l'historique montre parfois
// "rien" (ni Supprimer ni Modifier). Cause trouvée : un re-rendu de la liste
// (déclenché par une synchro en arrière-plan, un tirer-pour-rafraîchir...)
// s'intercalant PENDANT qu'un item est "armé" laissait les variables d'état
// pointer vers des éléments DOM détachés, sans réinitialiser l'affichage.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Un', tmdbId: '1', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film Deux', tmdbId: '2', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-05', savedAt: '2026-01-05T10:00:00.000Z' },
    ]));
    window.renderAll();
  });
  await page.click('#nav-history');
});

async function armFirstItem(page) {
  const item = page.locator('.hist-item').first();
  const box = await item.boundingBox();
  await item.evaluate((el, box) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const y = box.y + box.height / 2;
    el.dispatchEvent(touchEvent('touchstart', box.x + box.width - 20, y));
    el.dispatchEvent(touchEvent('touchmove', box.x + 20, y)); // glisse fort vers la gauche
    el.dispatchEvent(new Event('touchend', { bubbles: true }));
  }, box);
}

test('un swipe normal arme bien l\'indice de suppression', async ({ page }) => {
  await armFirstItem(page);
  await expect(page.locator('.hist-item').first()).toHaveClass(/hist-swipe-armed-left/);
});

test('un re-rendu pendant un item armé ne laisse pas un état fantôme (le prochain swipe fonctionne normalement)', async ({ page }) => {
  await armFirstItem(page);
  await expect(page.locator('.hist-item').first()).toHaveClass(/hist-swipe-armed-left/);

  // Simule une synchro en arrière-plan (ou un tirer-pour-rafraîchir) qui
  // re-rend la liste PENDANT que l'item est encore armé.
  await page.evaluate(() => window.renderHistory());

  // Le nouvel item (reconstruit) ne doit PAS être dans un état armé fantôme,
  // et un nouveau swipe doit fonctionner normalement ensuite.
  await expect(page.locator('.hist-item').first()).not.toHaveClass(/hist-swipe-armed-left/);
  await armFirstItem(page);
  await expect(page.locator('.hist-item').first()).toHaveClass(/hist-swipe-armed-left/);
});

test('un glissement légèrement diagonal au départ est quand même reconnu comme un swipe', async ({ page }) => {
  // Simule un doigt qui part en diagonale (8px vertical, bien plus horizontal
  // ensuite) — avec l'ancien seuil (10px, ratio 1.2), ce genre de trajectoire
  // pouvait se faire classer "scroll" à tort dès les tout premiers pixels.
  const item = page.locator('.hist-item').first();
  const box = await item.boundingBox();
  await item.evaluate((el, box) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const y = box.y + box.height / 2;
    el.dispatchEvent(touchEvent('touchstart', box.x + box.width - 20, y));
    // Ratio dx/dy du tout premier mouvement : 12/11 ≈ 1.09 — et les deux
    // dépassent même l'ancien seuil de 10px (donc la décision se prend bien
    // SUR ce premier mouvement). Sous l'ancien ratio (1.2), ce mouvement
    // aurait été classé "scroll" à tort ; avec le nouveau (1.0), "swipe".
    el.dispatchEvent(touchEvent('touchmove', box.x + box.width - 32, y + 11));
    el.dispatchEvent(touchEvent('touchmove', box.x + 20, y + 11)); // puis nettement horizontal
    el.dispatchEvent(new Event('touchend', { bubbles: true }));
  }, box);

  await expect(item).toHaveClass(/hist-swipe-armed-left/);
});
