const { test, expect } = require('@playwright/test');

// ── L'UNIFORMITÉ EST DEVENUE STRUCTURELLE ──────────────────────────────
// Ce test vérifiait qu'une carte d'historique garde la même hauteur qu'une
// autre malgré des genres et des acteurs bien plus longs, et que les lignes
// débordantes soient ellipsées (.hist-meta-line, text-overflow).
//
// Ludex 2.0 a remplacé la carte à lignes de texte par une mosaïque
// d'affiches : plus de .hist-meta-line du tout — le titre vit dans l'aria-label
// de .hist-item-open, et la hauteur découle d'un aspect-ratio 2/3 sur la
// vignette. L'uniformité n'est donc plus une propriété à surveiller ligne par
// ligne, elle est garantie par construction.
//
// Ce qui reste vérifiable, et qui casserait si un palier vedette débordait de
// la grille : toutes les cartes d'un même palier ont la même hauteur, et un
// texte anormalement long n'y change rien.
test('les cartes d\'un meme palier gardent la meme hauteur, quel que soit le texte', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Long', year: '2003', runtime: '108 min', genre: 'Comédie, Familial, Musique, Aventure, Drame, Histoire', director: 'Richard Linklater', actors: 'Jack Black, Joan Cusack, Mike White, Sarah Silverman, Miranda Cosgrove', score: '7.2', mode: 'quick', values: { quick: 3.6 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', stars: '★★★½' },
      { title: 'Court', year: '2013', runtime: '130 min', genre: 'Action', director: 'Guillermo del Toro', actors: 'Charlie Hunnam', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', stars: '★★★★' },
      { title: 'Avec Tag', year: '2024', runtime: '135 min', genre: 'Action, Aventure', director: 'Matthew Vaughn', actors: 'Henry Cavill, Bryce Dallas Howard', score: '6.1', mode: 'quick', values: { quick: 3 }, date: '2026-07-03', savedAt: '2026-07-03T10:00:00.000Z', stars: '★★★', contextTags: ['home'] },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  // On compare à palier égal : une carte vedette est volontairement plus
  // grande (grid-row: span 2), la comparer aux autres n'aurait pas de sens.
  const hauteurs = await page.locator('.hist-item:not([class*="hist-grid-card-"])').evaluateAll(
    els => els.map(el => Math.round(el.getBoundingClientRect().height)));
  expect(hauteurs.length).toBeGreaterThanOrEqual(2);
  expect(Math.max(...hauteurs) - Math.min(...hauteurs), `hauteurs : ${hauteurs}`).toBeLessThan(2);
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

  // .genre-fold-summary existe en trois exemplaires (historique films,
  // historique séries, "À voir") depuis que chaque liste a son propre filtre :
  // il faut viser celui de #genre-fold, sinon Playwright refuse en mode strict.
  await page.locator('#genre-fold .genre-fold-summary').click();
  await page.locator('.genre-chip', { hasText: 'Action' }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('#genre-fold-current')).toHaveText('Action');
  const visible = await page.locator('.hist-item').count();
  expect(visible).toBe(1);
});

test('meme hauteur malgre un tag de contexte ("A la maison") sur une seule carte', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Argylle', year: '2024', runtime: '135 min', genre: 'Action, Aventure, Comédie', director: 'Matthew Vaughn', actors: 'Henry Cavill, Bryce Dallas Howard', score: '6.1', mode: 'quick', values: { quick: 3 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', stars: '★★★', contextTags: ['home'] },
      { title: 'They Will Kill You', year: '2026', runtime: '94 min', genre: 'Action, Comédie, Horreur', director: 'Kirill Sokolov', actors: "Zazie Beetz, Myha'la, Paterson Joseph", score: '6.1', mode: 'quick', values: { quick: 3 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', stars: '★★★' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');
  const heights = await page.locator('.hist-item').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
  expect(Math.abs(heights[0] - heights[1])).toBeLessThan(2);
});
