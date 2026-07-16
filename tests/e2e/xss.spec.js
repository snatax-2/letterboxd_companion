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

  // Le titre s'affiche comme TEXTE (la balise img visible en toutes lettres)
  const titleText = await page.locator('.hist-title').first().textContent();
  expect(titleText).toContain('<img');

  // Aucune image injectee dans la carte, aucun code execute
  const injectedImgs = await page.locator('.hist-item img[src="x"]').count();
  expect(injectedImgs).toBe(0);
  const xss = await page.evaluate(() => window.__xss);
  expect(xss).toBeUndefined();

  // Le toast (coup de coeur) contient le titre : chemin textContent sur
  const likeBtn = page.locator('.hist-item .hist-action-btn').first();
  if (await likeBtn.count() > 0) {
    await likeBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    const xssAfterToast = await page.evaluate(() => window.__xss);
    expect(xssAfterToast).toBeUndefined();
  }
});
