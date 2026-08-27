const { test, expect } = require('@playwright/test');

// À voir — le champ d'ajout passe derrière une loupe qui se déplie (même
// motif que Découvrir et Historique, mécanique partagée dans
// src/03c-collapsible-search.js).
//
// La particularité de cet écran : DEUX instances indépendantes, une par
// section, parce que chaque média a son champ et sa liste de suggestions. La
// loupe cède la place au TITRE de la section, pas à la bascule Films/Séries —
// cette bascule est partagée par les deux sections, alors que le champ
// d'ajout est propre à chacune, et une loupe posée sur la bascule aurait dû
// deviner quelle section elle vise.

const SUGGESTIONS = {
  results: [
    { id: 9, title: 'Blade Runner 2049', release_date: '2017-10-04', poster_path: null, genre_ids: [] },
    { id: 10, title: 'Blade Runner', release_date: '1982-06-25', poster_path: null, genre_ids: [] },
  ],
};

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_watchlist', JSON.stringify([
      { title: 'Dune', year: '2021', poster: '', genre: 'SF', tmdbId: 1, addedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.route('**/api/search*', route => route.fulfill({ json: SUGGESTIONS }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(500);
}

test('replié par défaut : la loupe est là, le champ ne l\'est pas', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('#wl-search-toggle')).toBeVisible();
  await expect(page.locator('#wl-search-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#watchlist-input')).toBeHidden();
  // Le bouton d'ajout voyage avec le champ : séparé de lui, il ne voudrait
  // plus rien dire.
  await expect(page.locator('#watchlist-add-btn')).toBeHidden();
  await expect(page.locator('#watchlist-count-badge')).toBeVisible();
});

test('la loupe déplie le champ, lui donne le focus et rétracte le titre', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.waitForTimeout(500);

  await expect(page.locator('#watchlist-input')).toBeVisible();
  await expect(page.locator('#watchlist-add-btn')).toBeVisible();
  await expect(page.locator('#wl-search-toggle')).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('watchlist-input');

  const titre = await page.locator('#wl-movie-search-line .card-title').boundingBox();
  expect(titre.width).toBeLessThan(10);
});

test('le champ garde une largeur utilisable à côté du bouton d\'ajout', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.waitForTimeout(500);
  // Régression réelle : sous 480px, .watchlist-add-btn passait à width:100%
  // pour l'ancienne disposition EMPILÉE. Dans une ligne, cette largeur
  // mangeait tout et écrasait le champ à zéro.
  const champ = await page.locator('#watchlist-input').boundingBox();
  expect(champ.width, 'le champ ne doit pas être écrasé par le bouton').toBeGreaterThan(120);
});

test('les suggestions se posent sous la ligne et ajoutent le film', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.fill('#watchlist-input', 'blade');
  await page.waitForTimeout(700);

  const sugg = page.locator('#wl-suggestions .wl-suggest-item');
  await expect(sugg.first()).toBeVisible();

  const ligne = await page.locator('#wl-movie-search-line').boundingBox();
  const panneau = await page.locator('#wl-suggestions').boundingBox();
  expect(panneau.y, 'le panneau doit tomber SOUS la ligne').toBeGreaterThanOrEqual(ligne.y + ligne.height - 2);

  // Cliquer une suggestion n'ajoute pas directement : addToWatchlistFromTMDb
  // ouvre d'abord le choix de la liste. Ce test vérifie que le clic ARRIVE
  // jusqu'au parcours d'ajout existant — c'est le seul point que le passage
  // derrière une loupe pouvait casser. Le parcours lui-même a ses propres
  // tests.
  await sugg.first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#wl-picker-modal')).toBeVisible();
  await page.locator('#wl-picker-list button').first().click();
  await page.waitForTimeout(600);
  await expect(page.locator('.wl-card')).toHaveCount(2);
});

test('« + Ajouter » ajoute toujours un titre libre', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.fill('#watchlist-input', 'Un film introuvable sur TMDb');
  await page.waitForTimeout(200);
  await page.click('#watchlist-add-btn');
  await page.waitForTimeout(500);
  await expect(page.locator('.wl-card')).toHaveCount(2);
  await expect(page.locator('#watchlist-input')).toHaveValue('');
});

test('refermer vide le champ et range les suggestions', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.fill('#watchlist-input', 'blade');
  await page.waitForTimeout(700);
  await expect(page.locator('#wl-suggestions .wl-suggest-item').first()).toBeVisible();

  await page.click('#wl-search-close');
  await page.waitForTimeout(500);
  await expect(page.locator('#watchlist-input')).toBeHidden();
  await expect(page.locator('#watchlist-input')).toHaveValue('');
  await expect(page.locator('#wl-suggestions')).toBeHidden();
  // Rien n'a été ajouté : refermer n'est pas valider.
  await expect(page.locator('.wl-card')).toHaveCount(1);
});

test('Échap referme', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.fill('#watchlist-input', 'blade');
  await page.locator('#watchlist-input').press('Escape');
  await page.waitForTimeout(500);
  await expect(page.locator('#watchlist-input')).toBeHidden();
});

test('un clic extérieur ne jette pas une saisie en cours, mais referme un champ vide', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.fill('#watchlist-input', 'blade');
  await page.waitForTimeout(600);
  await page.locator('#wl-sort-row').click({ position: { x: 5, y: 5 }, force: true });
  await page.waitForTimeout(400);
  await expect(page.locator('#watchlist-input')).toBeVisible();
  await expect(page.locator('#watchlist-input')).toHaveValue('blade');

  await page.fill('#watchlist-input', '');
  await page.locator('#wl-sort-row').click({ position: { x: 5, y: 5 }, force: true });
  await page.waitForTimeout(500);
  await expect(page.locator('#watchlist-input')).toBeHidden();
});

test('les deux sections ont chacune leur loupe, indépendantes', async ({ page }) => {
  await prepare(page);
  await page.click('#wl-search-toggle');
  await page.waitForTimeout(400);
  await expect(page.locator('#watchlist-input')).toBeVisible();

  await page.click('#wl-tab-tv');
  await page.waitForTimeout(500);
  await expect(page.locator('#wl-tv-search-toggle')).toBeVisible();
  await expect(page.locator('#wl-tv-search-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#wl-tv-input')).toBeHidden();

  await page.click('#wl-tv-search-toggle');
  await page.waitForTimeout(500);
  await expect(page.locator('#wl-tv-input')).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('wl-tv-input');
});

test('cibles tactiles : la loupe et le bouton d\'ajout', async ({ page }) => {
  await prepare(page);
  const loupe = await page.locator('#wl-search-toggle').boundingBox();
  expect(loupe.width).toBeGreaterThanOrEqual(44);
  expect(loupe.height).toBeGreaterThanOrEqual(44);

  await page.click('#wl-search-toggle');
  await page.waitForTimeout(500);
  const ajouter = await page.locator('#watchlist-add-btn').boundingBox();
  expect(ajouter.height, 'le bouton d\'ajout doit rester atteignable au doigt').toBeGreaterThanOrEqual(44);
  const croix = await page.locator('#wl-search-close').boundingBox();
  expect(croix.width).toBeGreaterThanOrEqual(44);
});

test('repliés, les deux champs ne sont pas des étapes de tabulation invisibles', async ({ page }) => {
  await prepare(page);
  const focusables = await page.evaluate(() => ['watchlist-input', 'wl-tv-input'].map((id) => {
    const el = document.getElementById(id);
    el.focus();
    return document.activeElement === el;
  }));
  expect(focusables).toEqual([false, false]);
});
