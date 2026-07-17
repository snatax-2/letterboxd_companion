const { test, expect } = require('@playwright/test');

test('les cartes de l\'historique ont un rythme uniforme (lignes meta bornees)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Long', year: '2003', runtime: '108 min', genre: 'Comédie, Familial, Musique, Aventure, Drame, Histoire', director: 'Richard Linklater', actors: 'Jack Black, Joan Cusack, Mike White, Sarah Silverman, Miranda Cosgrove', score: '7.2', mode: 'quick', values: { quick: 3.6 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', stars: '★★★½' },
      { title: 'Court', year: '2013', runtime: '130 min', genre: 'Action', director: 'Guillermo del Toro', actors: 'Charlie Hunnam', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', stars: '★★★★' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  // Meme nombre de champs -> meme hauteur, malgre genres/acteurs bien plus longs
  const heights = await page.locator('.hist-item').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
  expect(Math.abs(heights[0] - heights[1])).toBeLessThan(2);

  // Les lignes debordantes sont ellipsees, pas enroulees
  const overflow = await page.locator('.hist-meta-line').first().evaluate(el => getComputedStyle(el).textOverflow);
  expect(overflow).toBe('ellipsis');
});

test('le filtre genre est plie par defaut avec le genre actif visible', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'A', year: '2020', genre: 'Action', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
      { title: 'B', year: '2021', genre: 'Drame', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('#genre-fold');

  expect(await page.locator('#genre-fold').evaluate(el => el.open)).toBe(false);
  await expect(page.locator('#genre-fold-current')).toHaveText('Tous');

  await page.locator('.genre-fold-summary').click();
  await page.locator('.genre-chip', { hasText: 'Action' }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('#genre-fold-current')).toHaveText('Action');
  const visible = await page.locator('.hist-item').count();
  expect(visible).toBe(1);
});
