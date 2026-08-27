const { test, expect } = require('@playwright/test');

// Recherche unifiée de l'onglet Découvrir : une loupe qui se déplie en champ,
// et donne accès à la fiche d'un film, d'une série ou d'une personne.

const RESULTATS = {
  results: [
    { media_type: 'movie',  id: 496243, title: 'Parasite', release_date: '2019-05-30', poster_path: '/p1.jpg' },
    { media_type: 'tv',     id: 4607,   name: 'True Detective', first_air_date: '2014-01-12', poster_path: '/p2.jpg' },
    { media_type: 'person', id: 525,    name: 'Christopher Nolan', known_for_department: 'Directing',
      profile_path: '/n.jpg', known_for: [{ title: 'Inception' }, { title: 'Interstellar' }] },
    { media_type: 'collection', id: 99, name: 'Une collection', poster_path: '/c.jpg' },
  ],
};

async function ouvrirDecouvrir(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_settings', JSON.stringify({ theme: 'ludex-dark' }));
  });
  await page.route('**fonts.googleapis.com**', r => r.abort());
  await page.route('**fonts.gstatic.com**', r => r.abort());
  await page.route('**image.tmdb.org/**', r => r.fulfill({
    status: 200, contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
  }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(500);
}

test('la loupe se déplie en champ et se referme', async ({ page }) => {
  await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
  await ouvrirDecouvrir(page);

  const ligne = page.locator('#discover-topline');
  const champ = page.locator('#discover-search-input');
  const bascule = page.locator('.discover-seg-tabs');

  // Replié : la bascule Films/Séries occupe la ligne, le champ est inerte.
  await expect(bascule).toBeVisible();
  await expect(page.locator('#discover-search-toggle')).toHaveAttribute('aria-expanded', 'false');

  await page.click('#discover-search-toggle');
  await page.waitForTimeout(400);
  await expect(ligne).toHaveClass(/searching/);
  await expect(champ).toBeFocused();
  await expect(page.locator('#discover-search-toggle')).toHaveAttribute('aria-expanded', 'true');

  await page.click('#discover-search-close');
  await page.waitForTimeout(400);
  await expect(ligne).not.toHaveClass(/searching/);
  await expect(bascule).toBeVisible();
});

test('Échap referme la recherche', async ({ page }) => {
  await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
  await ouvrirDecouvrir(page);
  await page.click('#discover-search-toggle');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await expect(page.locator('#discover-topline')).not.toHaveClass(/searching/);
});

test('les trois types sont proposés, et rien d\'autre', async ({ page }) => {
  await page.route('**/api/search*', (route) => {
    const u = route.request().url();
    if (u.includes('multiQuery=')) return route.fulfill({ json: RESULTATS });
    return route.fulfill({ json: { results: [] } });
  });
  await ouvrirDecouvrir(page);
  await page.click('#discover-search-toggle');
  await page.fill('#discover-search-input', 'nolan');
  await page.waitForTimeout(900);

  const items = page.locator('.dsr-item');
  // La collection renvoyée par TMDb n'a pas de fiche dans l'app : elle est
  // écartée plutôt que proposée puis inerte au clic.
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Parasite');
  await expect(items.nth(1)).toContainText('True Detective');
  await expect(items.nth(2)).toContainText('Christopher Nolan');

  // Le type est écrit, pas seulement suggéré par la forme de la vignette (§14).
  await expect(items.nth(0)).toContainText('Film');
  await expect(items.nth(1)).toContainText('Série');
  await expect(items.nth(2)).toContainText('Réalisation');
});

test('une seule requête est émise, pas trois', async ({ page }) => {
  const appels = [];
  await page.route('**/api/search*', (route) => {
    const u = route.request().url();
    if (/multiQuery=|[?&]query=|tvQuery=|personSearch=/.test(u)) appels.push(u);
    if (u.includes('multiQuery=')) return route.fulfill({ json: RESULTATS });
    return route.fulfill({ json: { results: [] } });
  });
  await ouvrirDecouvrir(page);
  await page.click('#discover-search-toggle');
  await page.fill('#discover-search-input', 'nolan');
  await page.waitForTimeout(900);

  // Le budget est de 60 requêtes/minute et Découvrir en consomme déjà 7 à
  // l'ouverture : une recherche ne doit pas en coûter trois de plus.
  expect(appels.length, `appels de recherche : ${appels.join(' | ')}`).toBe(1);
  expect(appels[0]).toContain('multiQuery=nolan');
});

test('choisir un résultat ouvre la bonne fiche et referme la recherche', async ({ page }) => {
  await page.route('**/api/search*', (route) => {
    const u = route.request().url();
    if (u.includes('multiQuery=')) return route.fulfill({ json: RESULTATS });
    if (/[?&]id=496243/.test(u)) return route.fulfill({ json: {
      id: 496243, title: 'Parasite', release_date: '2019-05-30', runtime: 132,
      genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
    } });
    return route.fulfill({ json: { results: [] } });
  });
  await ouvrirDecouvrir(page);
  await page.click('#discover-search-toggle');
  await page.fill('#discover-search-input', 'parasite');
  await page.waitForTimeout(900);
  await page.locator('.dsr-item').first().click();
  await page.waitForTimeout(1200);

  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
  // Au retour, Découvrir doit être tel qu'on l'avait laissé.
  await expect(page.locator('#discover-topline')).not.toHaveClass(/searching/);
});

test('moins de deux caractères : aucune requête', async ({ page }) => {
  let recherches = 0;
  await page.route('**/api/search*', (route) => {
    if (route.request().url().includes('multiQuery=')) recherches++;
    return route.fulfill({ json: { results: [] } });
  });
  await ouvrirDecouvrir(page);
  await page.click('#discover-search-toggle');
  await page.fill('#discover-search-input', 'n');
  await page.waitForTimeout(900);
  expect(recherches, 'une seule lettre ne justifie pas un appel réseau').toBe(0);
  await expect(page.locator('#discover-search-panel')).toBeHidden();
});

test('les carrousels GARNIS sont bien masqués pendant une recherche', async ({ page }) => {
  // Ce test existe pour un piège précis : loadCarousel() pilote l'affichage
  // de chaque bloc par un style INLINE, qui bat une règle de feuille. Avec des
  // carrousels VIDES le défaut est invisible — ils sont déjà masqués par leur
  // propre logique. Il faut donc de vraies données pour l'attraper.
  const FILMS = Array.from({ length: 6 }, (_, i) => ({
    id: 700 + i, title: `Film ${i}`, release_date: '2024-01-01', poster_path: `/c${i}.jpg`, media_type: 'movie',
  }));
  await page.route('**/api/search*', (route) => {
    const u = route.request().url();
    if (u.includes('multiQuery=')) return route.fulfill({ json: RESULTATS });
    if (u.includes('dailyPick')) return route.fulfill({ json: { result: FILMS[0] } });
    return route.fulfill({ json: { results: FILMS } });
  });
  await ouvrirDecouvrir(page);
  await page.waitForTimeout(1200);

  // Au moins un carrousel est réellement garni avant de chercher.
  const garnis = page.locator('.carousel-block:visible');
  expect(await garnis.count()).toBeGreaterThan(0);

  await page.click('#discover-search-toggle');
  await page.fill('#discover-search-input', 'nolan');
  await page.waitForTimeout(900);

  await expect(page.locator('.carousel-block:visible')).toHaveCount(0);
  await expect(page.locator('.choix-du-jour-wrap')).toBeHidden();

  // Et tout revient à la fermeture.
  await page.click('#discover-search-close');
  await page.waitForTimeout(500);
  expect(await page.locator('.carousel-block:visible').count()).toBeGreaterThan(0);
  await expect(page.locator('.choix-du-jour-wrap')).toBeVisible();
});

test('la cible tactile de la loupe est conforme', async ({ page }) => {
  await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
  await ouvrirDecouvrir(page);
  const box = await page.locator('#discover-search-toggle').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
