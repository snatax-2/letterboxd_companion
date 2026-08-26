const { test, expect } = require('@playwright/test');

// Suppression d'un film depuis l'historique, et ouverture de sa fiche.
//
// ── POURQUOI CE FICHIER NE TESTE PLUS UN GLISSEMENT ─────────────────────
// Il vérifiait le parcours "glisser la carte vers la gauche pour armer un
// indice Supprimer, puis taper l'indice pour confirmer". Ce geste n'existe
// plus : Ludex 2.0 a fait passer l'historique en mosaïque d'affiches, où une
// cellule de 104 × 156 px n'a pas la place de révéler un indice en dessous.
// Les actions vivent désormais en surimpression permanente sur la carte
// (raisonnement écrit dans styles.css, section HISTORY).
//
// Les deux garanties que ce fichier protégeait, elles, restent entières et
// sont vérifiées ici sur l'affordance actuelle :
//   1. supprimer retire le BON film et n'ouvre PAS sa fiche au passage ;
//   2. taper la carte ailleurs que sur une action ouvre bien sa fiche.
// La première est la vraie raison d'être du fichier : le bug d'origine était
// que le tap de confirmation ouvrait la fiche du film au lieu de le
// supprimer.

const FILM_UN = { title: 'Film Un', year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', tmdbId: '11' };
const FILM_DEUX = { title: 'Film Deux', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', tmdbId: '22' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((films) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify(films));
  }, [FILM_UN, FILM_DEUX]);
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

test('supprimer retire le bon film et n\'ouvre pas sa fiche', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');
  await expect(page.locator('.hist-item')).toHaveCount(2);

  // Film Deux est le plus récent, donc affiché en premier.
  const cible = page.locator('.hist-item', { has: page.locator('.hist-item-open[aria-label*="Film Deux"]') });
  await cible.locator('.hist-action-btn.del').click();
  await page.waitForTimeout(800); // 300ms d'animation + marge

  await expect(page.locator('.hist-item')).toHaveCount(1);
  const restant = await page.locator('.hist-item-open').first().getAttribute('aria-label');
  expect(restant).toContain('Film Un');

  // Le bug d'origine : le geste de confirmation ouvrait la fiche du film.
  await expect(page.locator('#movie-detail-sheet.open')).toHaveCount(0);
});

test('taper la carte ailleurs que sur une action ouvre sa fiche', async ({ page }) => {
  await page.route('**/api/search?id=22*', route => route.fulfill({ json: {
    id: 22, title: 'Film Deux', poster_path: '/p.jpg', release_date: '2021-01-01',
    genres: [], credits: { crew: [], cast: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  await page.locator('.hist-item-open[aria-label*="Film Deux"]').click();
  await page.waitForTimeout(900);

  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
  // Rien n'a été supprimé au passage.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(stored).toHaveLength(2);
});
