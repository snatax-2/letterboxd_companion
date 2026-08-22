const { test, expect } = require('@playwright/test');

const EVIL = '<img src=x onerror="window.__xss=1"> Pelicula';

test('un titre de film piege ne s\'execute jamais (historique, toast, fiche)', async ({ page }) => {
  await page.addInitScript((evil) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: evil, year: '2024', tmdbId: '99', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', review: '<script>window.__xss=2</script> critique' },
    ]));
  }, EVIL);
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  // Ludex 2.0 : l'Historique est passé en grille de posters — plus de texte
  // visible sur la carte elle-même. Le titre vit désormais dans l'attribut
  // aria-label de la zone cliquable (même échappement escAttr qu'avant,
  // juste un support différent) — même vérification qu'avant : la balise
  // <img> apparaît en toutes lettres (échappée), jamais interprétée.
  const openBtn = page.locator('.hist-item .hist-item-open').first();
  const ariaLabel = await openBtn.getAttribute('aria-label');
  expect(ariaLabel).toContain('<img');

  // Aucune image injectée dans la carte, aucun code exécuté
  const injectedImgs = await page.locator('.hist-item img[src="x"]').count();
  expect(injectedImgs).toBe(0);
  const xss = await page.evaluate(() => window.__xss);
  expect(xss).toBeUndefined();
});
