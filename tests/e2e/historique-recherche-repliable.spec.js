const { test, expect } = require('@playwright/test');

// Historique — le filtre vit derrière une loupe qui se déplie (même motif que
// Découvrir et À voir, mécanique partagée dans src/03c-collapsible-search.js).
//
// Le point qui mérite un filet à lui seul est la FERMETURE. Un filtre actif
// dont le champ est replié serait un état caché : la liste amputée, le
// compteur de la carte en désaccord avec ce qu'on voit, et plus rien à
// l'écran pour dire pourquoi. Refermer relâche donc le filtre, et le clic
// extérieur ne referme pas tant que le champ contient quelque chose — sinon
// un doigt qui effleure le fond effacerait la recherche en cours.

const FILMS = [
  { title: 'Pulp Fiction', year: '1994', director: 'Quentin Tarantino' },
  { title: 'Dune', year: '2021', director: 'Denis Villeneuve' },
  { title: 'Arrival', year: '2016', director: 'Denis Villeneuve' },
];

async function prepare(page) {
  await page.addInitScript((films) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify(films.map((f, i) => ({
      title: f.title, year: f.year, director: f.director, score: '7.0', mode: 'quick',
      values: { quick: 3.5 }, date: `2026-0${i + 1}-10`,
      savedAt: `2026-0${i + 1}-10T10:00:00.000Z`, genre: 'Drame',
    }))));
  }, FILMS);
  await page.route('**/api/**', route => route.fulfill({ json: { results: [] } }));
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
}

test('replié par défaut : la loupe est là, le champ ne l\'est pas', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('#history-search-toggle')).toBeVisible();
  await expect(page.locator('#history-search-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#history-search')).toBeHidden();
  await expect(page.locator('#hist-media-tabs')).toBeVisible();
});

test('la loupe déplie le champ, lui donne le focus et rétracte la bascule', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.waitForTimeout(500);

  await expect(page.locator('#history-search')).toBeVisible();
  await expect(page.locator('#history-search-toggle')).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('history-search');

  // La bascule ne disparaît pas du DOM, elle cède la place : c'est ce trajet
  // qui fait la continuité entre les deux états.
  const tabs = await page.locator('#hist-media-tabs').boundingBox();
  expect(tabs.width).toBeLessThan(10);
});

test('le champ filtre bien la liste', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.fill('#history-search', 'villeneuve');
  await page.waitForTimeout(400);
  await expect(page.locator('.hist-item')).toHaveCount(2);
});

test('refermer par la croix relâche le filtre — pas d\'état caché', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.fill('#history-search', 'dune');
  await page.waitForTimeout(400);
  await expect(page.locator('.hist-item')).toHaveCount(1);

  await page.click('#history-search-clear-btn');
  await page.waitForTimeout(500);

  await expect(page.locator('#history-search')).toBeHidden();
  await expect(page.locator('#history-search-toggle')).toHaveAttribute('aria-expanded', 'false');
  // Le cœur du test : la liste est revenue ENTIÈRE. Un filtre resté actif
  // derrière un champ replié serait invisible et inexplicable.
  await expect(page.locator('.hist-item')).toHaveCount(FILMS.length);
});

test('Échap referme et relâche le filtre de la même façon', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.fill('#history-search', 'dune');
  await page.waitForTimeout(400);
  await expect(page.locator('.hist-item')).toHaveCount(1);

  await page.locator('#history-search').press('Escape');
  await page.waitForTimeout(500);
  await expect(page.locator('#history-search')).toBeHidden();
  await expect(page.locator('.hist-item')).toHaveCount(FILMS.length);
});

test('un clic extérieur ne jette pas une recherche en cours', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.fill('#history-search', 'dune');
  await page.waitForTimeout(400);

  await page.locator('#hist-count-badge').click({ force: true });
  await page.waitForTimeout(400);
  await expect(page.locator('#history-search')).toBeVisible();
  await expect(page.locator('#history-search')).toHaveValue('dune');
  await expect(page.locator('.hist-item')).toHaveCount(1);
});

test('un clic extérieur referme si le champ est vide', async ({ page }) => {
  await prepare(page);
  await page.click('#history-search-toggle');
  await page.waitForTimeout(400);
  await expect(page.locator('#history-search')).toBeVisible();

  await page.locator('#hist-count-badge').click({ force: true });
  await page.waitForTimeout(500);
  await expect(page.locator('#history-search')).toBeHidden();
});

test('le filtre vaut aussi côté Séries', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { id: 't1', tmdbId: 1, title: 'Twin Peaks', poster: '', seasons: {},
        ratings: [{ season: 1, score: '9.0', savedAt: '2026-01-01T10:00:00.000Z' }] },
      { id: 't2', tmdbId: 2, title: 'The Wire', poster: '', seasons: {},
        ratings: [{ season: 1, score: '8.0', savedAt: '2026-01-02T10:00:00.000Z' }] },
    ]));
  });
  await page.route('**/api/**', route => route.fulfill({ json: { results: [] } }));
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(500);

  const avant = await page.locator('#tv-history-list .hist-item').count();
  expect(avant).toBe(2);

  await page.click('#history-search-toggle');
  await page.fill('#history-search', 'twin');
  await page.waitForTimeout(500);
  await expect(page.locator('#tv-history-list .hist-item')).toHaveCount(1);
});

test('la cible tactile de la loupe est conforme', async ({ page }) => {
  await prepare(page);
  const box = await page.locator('#history-search-toggle').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('replié, le champ n\'est pas une étape de tabulation invisible', async ({ page }) => {
  await prepare(page);
  // Un champ à opacity 0 reste focalisable et annoncé par un lecteur d'écran.
  // visibility:hidden le sort des deux.
  const focusable = await page.evaluate(() => {
    const el = document.getElementById('history-search');
    el.focus();
    return document.activeElement === el;
  });
  expect(focusable, 'le champ replié ne doit pas pouvoir prendre le focus').toBe(false);
});
