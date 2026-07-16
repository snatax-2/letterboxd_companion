const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1'); // pas d'apercu auto qui interfererait
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Un', year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', tmdbId: '11' },
      { title: 'Film Deux', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', tmdbId: '22' },
    ]));
  });
});

async function swipeLeft(page, locator) {
  // Vrais TouchEvents synthétiques : c'est le chemin TACTILE qui portait le
  // bug signalé (touchstart annulait l'état armé avant le clic). Départ au
  // CENTRE de la carte : les boutons d'action refusent volontairement le geste.
  await locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, {
        touches: type === 'touchend' ? [] : [t],
        changedTouches: [t],
        bubbles: true, cancelable: true,
      }));
    }
    touch('touchstart', startX);
    for (let i = 1; i <= 6; i++) touch('touchmove', startX - i * 20);
    touch('touchend', startX - 120);
  });
}

test('swiper puis taper pour confirmer SUPPRIME le film (et n\'ouvre pas sa fiche)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  const first = page.locator('.hist-item').first();
  await swipeLeft(page, first);
  await page.waitForTimeout(250);

  // L'item est armé : l'indice "Supprimer" est visible
  const armed = await first.evaluate(el => el.className);
  expect(armed).toContain('armed');

  // Tap sur la zone révélée (l'indice) pour confirmer
  await first.locator('.hist-swipe-hint-left').click({ force: true });
  await page.waitForTimeout(800);

  // Le film est supprimé, la fiche ne s'est PAS ouverte
  const count = await page.locator('.hist-item').count();
  expect(count).toBe(1);
  const sheetOpen = await page.locator('#movie-detail-sheet.open').count();
  expect(sheetOpen).toBe(0);
});

test('taper ailleurs sur la carte armee annule sans rien supprimer ni ouvrir', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  const first = page.locator('.hist-item').first();
  await swipeLeft(page, first);
  await page.waitForTimeout(250);

  // Tap au centre de la carte (pas sur l'indice) : annulation propre
  await first.locator('.hist-item-content').click({ force: true, position: { x: 30, y: 20 } });
  await page.waitForTimeout(400);

  const count = await page.locator('.hist-item').count();
  expect(count).toBe(2); // rien supprimé
  const armed = await first.evaluate(el => el.className);
  expect(armed).not.toContain('armed'); // plus armé
});
