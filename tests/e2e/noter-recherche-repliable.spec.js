const { test, expect } = require('@playwright/test');

// Noter — le champ titre se replie une fois le sujet choisi.
//
// C'est le seul des quatre écrans où la ligne s'ouvre par DÉFAUT, et la
// raison n'est pas esthétique : #movie-search et #tv-search ne sont pas des
// barres de recherche mais les champs titre du formulaire. saveRating() lit
// searchEl.value comme titre de repli quand aucune fiche TMDb n'a été
// retenue — on peut noter un film que TMDb ne connaît pas rien qu'en tapant
// son titre. Replier ce champ par défaut aurait cassé ça en silence.
//
// Les deux tests qui comptent vraiment ici sont donc « rien ne referme la
// ligne tant qu'aucun sujet n'est retenu » et « la saisie libre note
// toujours » : ce sont les deux façons dont ce changement pouvait faire
// disparaître une fonction sans qu'aucun autre test ne s'en aperçoive.

async function prepare(page) {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  // Route générique d'ABORD : Playwright donne la priorité à la route la
  // plus récemment enregistrée (piège documenté ailleurs dans ce projet).
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?query=*', route => route.fulfill({ json: { results: [
    { id: 438631, title: 'Dune', release_date: '2021-09-15', poster_path: null },
  ] } }));
  // fetchTvSuggestions (18-tv-shows.js) écarte les séries sans affiche :
  // un poster_path nul ici et la liste revient vide.
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 1399, name: 'Twin Peaks', first_air_date: '1990-04-08', poster_path: '/tp.jpg' },
  ] } }));
  await page.route('**/api/search?id=*', route => route.fulfill({ json: {
    genres: [{ name: 'Science-Fiction' }], runtime: 155, vote_average: 7.8, vote_count: 100,
    credits: { crew: [{ job: 'Director', name: 'Denis Villeneuve' }], cast: [{ name: 'T. Chalamet' }] },
  } }));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.click('#nav-rating');
  await page.waitForTimeout(600);
}

async function choisirDune(page) {
  await page.fill('#movie-search', 'dune');
  await page.waitForTimeout(800);
  await page.locator('.suggestion-item').first().click();
  await page.waitForTimeout(1200);
}

test('à l\'arrivée, le formulaire étant vide, le champ titre est déplié', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('#movie-search')).toBeVisible();
  await expect(page.locator('#movie-search-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#movie-search-subject')).toHaveText('');
});

test('RIEN ne referme la ligne tant qu\'aucun sujet n\'est retenu', async ({ page }) => {
  await prepare(page);
  // Un clic ailleurs. C'est le défaut qu'avait la mécanique partagée telle
  // quelle : le premier appui n'importe où repliait la ligne et laissait le
  // formulaire sans aucun moyen visible de nommer ce qu'on note.
  await page.locator('#film-card-title').click({ force: true });
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toBeVisible();

  // Échap non plus.
  await page.locator('#movie-search').press('Escape');
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toBeVisible();

  // Même avec du texte en cours de frappe.
  await page.fill('#movie-search', 'un titre en cours');
  await page.locator('#film-card-title').click({ force: true });
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toBeVisible();
  await expect(page.locator('#movie-search')).toHaveValue('un titre en cours');
});

test('LA SAISIE LIBRE NOTE TOUJOURS : un film que TMDb ne connaît pas', async ({ page }) => {
  await prepare(page);
  // Aucune suggestion cliquée, aucune fiche TMDb : saveRating() doit
  // retomber sur la valeur brute du champ. C'est la fonction que replier ce
  // champ par défaut aurait supprimée sans bruit.
  await page.fill('#movie-search', 'Un film introuvable sur TMDb');
  await page.waitForTimeout(400);
  await page.click('#save-btn');
  await page.waitForTimeout(900);

  const titres = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lbx_v2') || '[]').map((f) => f.title));
  expect(titres).toContain('Un film introuvable sur TMDb');
});

test('choisir un film replie la ligne et laisse le titre à sa place', async ({ page }) => {
  await prepare(page);
  await choisirDune(page);

  await expect(page.locator('#movie-search')).toBeHidden();
  await expect(page.locator('#movie-search-toggle')).toBeVisible();
  await expect(page.locator('#movie-search-toggle')).toHaveAttribute('aria-expanded', 'false');
  // Exactement ce que le champ affichait avant de se replier : rien n'est perdu.
  await expect(page.locator('#movie-search-subject')).toHaveText('Dune (2021)');
  await expect(page.locator('#film-strip')).toHaveClass(/visible/);
});

test('la loupe rouvre la ligne pour changer de film', async ({ page }) => {
  await prepare(page);
  await choisirDune(page);

  await page.click('#movie-search-toggle');
  await page.waitForTimeout(500);
  await expect(page.locator('#movie-search')).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('movie-search');
  // La saisie précédente est reprise, sélectionnée : on la remplace en tapant
  // plutôt que de la retaper en entier.
  await expect(page.locator('#movie-search')).toHaveValue('Dune (2021)');
});

test('la croix efface sans replier', async ({ page }) => {
  await prepare(page);
  await page.fill('#movie-search', 'dune');
  await page.waitForTimeout(400);
  await expect(page.locator('#search-clear-btn')).toBeVisible();
  await page.click('#search-clear-btn');
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toHaveValue('');
  // Elle EFFACE, elle ne referme pas : replier ici ne mènerait nulle part.
  await expect(page.locator('#movie-search')).toBeVisible();
});

test('réinitialiser le formulaire rouvre la ligne', async ({ page }) => {
  await prepare(page);
  await choisirDune(page);
  await expect(page.locator('#movie-search')).toBeHidden();

  await page.click('#new-btn');
  await page.waitForTimeout(400);
  await page.click('#modal-confirm');
  await page.waitForTimeout(700);

  await expect(page.locator('#movie-search')).toBeVisible();
  await expect(page.locator('#movie-search-subject')).toHaveText('');
});

test('reprendre une note depuis l\'historique arrive avec la ligne repliée', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Stalker', year: '1979', score: '9.0', mode: 'quick', values: { quick: 4.5 },
        date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', genre: 'SF' },
    ]));
  });
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => loadItem(0));
  await page.waitForTimeout(700);

  await expect(page.locator('#movie-search')).toBeHidden();
  await expect(page.locator('#movie-search-subject')).toHaveText('Stalker');
});

test('côté Séries : choisir la série ne suffit pas, c\'est la SAISON qui fait le sujet', async ({ page }) => {
  await prepare(page);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(600);

  await expect(page.locator('#tv-search')).toBeVisible();
  await expect(page.locator('#tv-search-subject')).toHaveText('');

  await page.fill('#tv-search', 'twin');
  await page.waitForTimeout(800);
  const sugg = page.locator('#tv-suggestions .suggestion-item');
  await expect(sugg.first()).toBeVisible();
  await sugg.first().click();
  await page.waitForTimeout(1000);

  // selectShow() (18-tv-shows.js) MASQUE explicitement le sélecteur de saison
  // et la bande, puis ouvre la fiche de la série : à cet instant il n'y a
  // encore rien à noter. La ligne doit donc rester dépliée — c'est le
  // pendant exact de la règle côté film.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await expect(page.locator('#tv-search')).toBeVisible();

  // C'est selectSeason() qui installe le sujet : il affiche la bande et y
  // écrit « Série — Saison ». On reproduit ici ses deux effets (lignes
  // 192-196), qui sont précisément ce que ce module observe.
  await page.evaluate(() => {
    document.getElementById('tv-strip-title').textContent = 'Twin Peaks — Saison 1';
    document.getElementById('tv-season-strip').style.display = 'flex';
  });
  await page.waitForTimeout(600);

  await expect(page.locator('#tv-search')).toBeHidden();
  await expect(page.locator('#tv-search-subject')).toHaveText(/Twin Peaks/);

  // Et l'inverse : la bande disparaît, la ligne se rouvre.
  await page.evaluate(() => {
    document.getElementById('tv-season-strip').style.display = 'none';
  });
  await page.waitForTimeout(600);
  await expect(page.locator('#tv-search')).toBeVisible();
});

test('cibles tactiles de la loupe et de la croix', async ({ page }) => {
  await prepare(page);
  await page.fill('#movie-search', 'dune');
  await page.waitForTimeout(400);
  const croix = await page.locator('#search-clear-btn').boundingBox();
  // 24px avant : la croix d'effacement n'a jamais été atteignable au doigt.
  expect(croix.width).toBeGreaterThanOrEqual(44);
  expect(croix.height).toBeGreaterThanOrEqual(44);

  await choisirDune(page);
  const loupe = await page.locator('#movie-search-toggle').boundingBox();
  expect(loupe.width).toBeGreaterThanOrEqual(44);
  expect(loupe.height).toBeGreaterThanOrEqual(44);
});
