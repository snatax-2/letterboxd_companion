// Widget de notation rapide (étoiles) : glissement pour sélectionner, et
// surtout une vérification du VRAI style calculé (clip-path) — c'est
// exactement la classe de bug qu'on a eue (le sélecteur CSS pour "étoile
// pleine" ne matchait jamais, donc toutes les étoiles pleines s'affichaient à
// moitié remplies quelle que soit la note). jsdom ne calcule pas les styles
// réels, donc ce bug ne pouvait être vu que dans un vrai navigateur.
const { test, expect } = require('@playwright/test');

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

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-rating');
  // Passe en mode rapide (étoiles) si ce n'est pas déjà le cas
  const quickBtn = page.locator('#mode-quick-btn, .mode-tab:has-text("Rapide")').first();
  if (await quickBtn.count() > 0) await quickBtn.click();
});

test('glisser sur les étoiles sélectionne la bonne valeur (pas de saut de tab)', async ({ page }) => {
  const stars = page.locator('#quick-stars-container');
  const box = await stars.boundingBox();
  // Glisse jusqu'à environ 80% de la largeur du widget (proche de la note max)
  const targetX = box.x + box.width * 0.8;
  const targetY = box.y + box.height / 2;

  await page.mouse.move(box.x + 5, targetY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY);
  await page.mouse.up();

  // Le label affiché doit refléter une note élevée (pas 0, pas resté par défaut)
  const label = await page.locator('#quick-rating-label').textContent();
  expect(label).toMatch(/\d\.\d\/10/);
  expect(label).not.toContain('0.0/10');

  // Toujours sur l'onglet Noter (le glissement ne doit pas avoir déclenché de changement d'onglet)
  await expect(page.locator('#nav-rating')).toHaveClass(/active/);
});

test('glisser sur les étoiles ne change pas d\'onglet même en swipe tactile', async ({ page }) => {
  const stars = page.locator('#quick-stars-container');
  const box = await stars.boundingBox();
  const y = box.y + box.height / 2;

  // Glissement tactile horizontal directement sur le widget d'étoiles
  await swipe(page, { startX: box.x + 5, endX: box.x + box.width - 5, y });

  await expect(page.locator('#nav-rating')).toHaveClass(/active/);
});

test('une étoile pleine (note entière) a un clip-path totalement ouvert, pas bloqué à moitié', async ({ page }) => {
  // Sélectionne une note entière (4.0 étoiles = s8) directement en DOM — les
  // radios sont volontairement invisibles (stylées via leur label), et
  // page.check() refuse d'agir dessus même avec force:true.
  await page.evaluate(() => {
    const radio = document.getElementById('s8');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(200); // laisse la transition CSS (clip-path .1s) se terminer avant de lire le style

  // Le label.left-half juste après (s7) correspond à la même étoile (4) et
  // doit avoir un clip-path totalement ouvert — PAS bloqué à inset(...50%...),
  // c'est exactement le bug qu'on a eu (le sélecteur ne matchait jamais).
  const clipPath = await page.locator('label[for="s7"]').evaluate(el => getComputedStyle(el, '::after').clipPath);
  expect(clipPath).toBe('inset(0px)');
});
