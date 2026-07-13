// Reproduit le bug trouvé via les captures d'écran envoyées : deux
// suppressions/modifications confirmées par glissement, l'une juste après
// l'autre, avant que le délai de la première (~500ms, deux animations
// cumulées) n'ait eu le temps de se terminer. L'index du second film était
// capturé AVANT que le premier ne se supprime — une fois le premier
// effectivement supprimé, tous les index suivants décalent, et l'ancien
// index capturé pour le second ne correspond plus au bon film.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A (le plus ancien)', tmdbId: '1', score: '6.0', mode: 'quick', values: { quick: 3 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B (au milieu)', tmdbId: '2', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-05', savedAt: '2026-01-05T10:00:00.000Z' },
      { title: 'Film C (le plus recent)', tmdbId: '3', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-10', savedAt: '2026-01-10T10:00:00.000Z' },
    ]));
    window.renderAll();
  });
  await page.click('#nav-history');
});

async function armAndConfirmDelete(page, titleSubstring) {
  const item = page.locator('.hist-item', { hasText: titleSubstring });
  console.log('BEFORE ARM', titleSubstring, 'idx=', await item.getAttribute('data-idx'), 'count=', await item.count());
  const box = await item.boundingBox();
  await item.evaluate((el, box) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const y = box.y + box.height / 2;
    el.dispatchEvent(touchEvent('touchstart', box.x + box.width - 20, y));
    el.dispatchEvent(touchEvent('touchmove', box.x + 20, y));
    el.dispatchEvent(new Event('touchend', { bubbles: true }));
  }, box);
  console.log('AFTER ARM', titleSubstring, 'class=', await item.evaluate(el => el.className));
  await page.waitForTimeout(250); // laisse la transition CSS de mise en place de l'indice (.2s) se terminer avant de taper dessus
  // Tap sur l'indice "Supprimer" maintenant révélé, pour confirmer.
  await item.locator('.hist-swipe-hint-left').click({ force: true });
  console.log('CONFIRMED', titleSubstring);
}

test('deux suppressions confirmées coup sur coup suppriment les BONS films (pas de decalage d\'index)', async ({ page }) => {
  // Film A est affiché en DERNIER (le plus ancien), Film C en PREMIER (le plus récent).
  // On confirme A (index réel bas) PUIS immédiatement C (index réel plus haut) —
  // exactement l'ordre qui expose le bug : la suppression de A décale l'index de C.
  await armAndConfirmDelete(page, 'Film A');
  await armAndConfirmDelete(page, 'Film C');

  // Laisse les deux délais (200ms + 300ms cumulés) se terminer.
  await page.waitForTimeout(700);

  const remainingTitles = await page.locator('.hist-title').allTextContents();
  console.log('REMAINING TITLES:', JSON.stringify(remainingTitles));
  expect(remainingTitles.some(t => t.includes('Film B'))).toBe(true);
  expect(remainingTitles.some(t => t.includes('Film A'))).toBe(false);
  expect(remainingTitles.some(t => t.includes('Film C'))).toBe(false);
  expect(remainingTitles.length).toBe(1); // uniquement Film B doit rester
});
