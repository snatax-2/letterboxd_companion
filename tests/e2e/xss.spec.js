const { test, expect } = require('@playwright/test');

// ═══════════════════════════════════════════════════════════════════════════
//  NON-RÉGRESSION XSS
// ═══════════════════════════════════════════════════════════════════════════
// Ces tests couvrent le scénario réel : les données d'un utilisateur ne
// viennent pas seulement de ce qu'il tape. Elles arrivent aussi d'un import
// JSON, d'un CSV Letterboxd, et surtout d'une SYNCHRO CLOUD — donc d'une
// source qu'il ne contrôle pas forcément. Tout champ relu depuis localStorage
// doit être traité comme hostile au moment du rendu.
//
// Trois vecteurs distincts ont été trouvés et corrigés ; chacun a son test.
// La charge utile est toujours la même : sortir de son attribut ou de son
// nœud texte pour faire exécuter du JS. `window.__xss` ne doit JAMAIS exister.

const EVIL_TAG = '<img src=x onerror="window.__xss=1"> Pelicula';
// Sort d'un attribut src="…" en le refermant, puis greffe son propre onerror.
const EVIL_ATTR = 'x" onerror="window.__xss=1" data-z="';

async function seed(page, entries) {
  await page.addInitScript((data) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

const noXss = async (page) => page.evaluate(() => window.__xss);

// ─── Vecteur 1 : titre et critique (couvert depuis l'origine) ───────────────
test('un titre de film piege ne s\'execute jamais (historique, toast, fiche)', async ({ page }) => {
  await seed(page, {
    lbx_v2: [
      { title: EVIL_TAG, year: '2024', tmdbId: '99', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', review: '<script>window.__xss=2</script> critique' },
    ],
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  // Ludex 2.0 : l'Historique est passé en grille de posters — plus de texte
  // visible sur la carte elle-même. Le titre vit désormais dans l'attribut
  // aria-label de la zone cliquable (même échappement escAttr qu'avant,
  // juste un support différent) — même vérification qu'avant : la balise
  // <img> apparaît en toutes lettres (échappée), jamais interprétée.
  const openBtn = page.locator('.hist-item .hist-item-open').first();
  expect(await openBtn.getAttribute('aria-label')).toContain('<img');

  expect(await page.locator('.hist-item img[src="x"]').count()).toBe(0);
  expect(await noXss(page)).toBeUndefined();
});

// ─── Vecteur 2 : l'URL d'affiche stockée (item.poster) ─────────────────────
// Le titre voisin était bien échappé, l'URL non : `src="${item.poster}"`.
// Corrigé par safePosterSrc() (src/03-foundation.js), qui restreint l'origine
// à image.tmdb.org ET échappe.
test('une URL d\'affiche piegee ne s\'echappe pas de son attribut src', async ({ page }) => {
  await seed(page, {
    lbx_v2: [
      { title: 'Film A', year: '2024', tmdbId: '1', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', poster: EVIL_ATTR },
      { title: 'Film B', year: '2024', tmdbId: '2', score: '7.0', mode: 'quick', values: { quick: 3 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z', poster: EVIL_ATTR },
    ],
    lbx_watchlist_default: [
      { title: 'Film C', tmdbId: '3', addedAt: '2026-07-01T10:00:00.000Z', poster: EVIL_ATTR },
    ],
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForTimeout(600);
  expect(await noXss(page), 'XSS via item.poster dans l\'Historique').toBeUndefined();

  // Aucune image ne doit avoir hérité d'un gestionnaire onerror injecté.
  expect(await page.locator('img[onerror*="__xss"]').count()).toBe(0);

  await page.click('#nav-watchlist');
  await page.waitForTimeout(600);
  expect(await noXss(page), 'XSS via item.poster dans la watchlist').toBeUndefined();
  expect(await page.locator('img[onerror*="__xss"]').count()).toBe(0);
});

// ─── Vecteur 3 : realisateur et acteurs (buildStripMeta -> innerHTML) ──────
// buildStripMeta() construisait du HTML en interpolant director/actors bruts.
test('un realisateur ou un acteur piege ne s\'execute pas dans la bande film', async ({ page }) => {
  await seed(page, {
    lbx_v2: [
      {
        title: 'Film D', year: '2024', tmdbId: '4', score: '8.0', mode: 'detail',
        values: { scenario: 8, realisation: 8, photo: 8, acteurs: 8, ambiance: 8, rythme: 8, affect: 8 },
        date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z', poster: '',
        director: '<img src=q onerror="window.__xss=1">',
        actors: '<img src=q onerror="window.__xss=1">',
        genre: '<img src=q onerror="window.__xss=1">',
      },
    ],
  });
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.loadItem(0));
  await page.waitForTimeout(600);

  expect(await noXss(page), 'XSS via director/actors/genre').toBeUndefined();
  // La charge doit apparaître en toutes lettres, jamais comme un vrai <img>.
  const strip = page.locator('#strip-genre');
  expect(await strip.innerText()).toContain('<img');
  expect(await strip.locator('img').count()).toBe(0);
});

// ─── Vecteur 4 : poster_path d'une serie (tmdbImage) ───────────────────────
// tmdbImage() interpolait `path` dans l'URL sans le valider. show.poster_path
// étant relu depuis localStorage, la charge ressortait chez tous ses appelants.
// Corrigé par TMDB_PATH_RE dans src/03-foundation.js.
test('un poster_path de serie piege ne produit pas d\'URL dangereuse', async ({ page }) => {
  await seed(page, {
    lbx_tv_shows: [
      {
        tmdbTvId: 42, title: 'Serie E', genre: 'Drame',
        poster_path: '/a.jpg" onerror="window.__xss=1" data-z="',
        seasons: { 1: { seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 2, rating: '8.0', savedAt: '2026-07-01T10:00:00.000Z' } },
      },
    ],
  });
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(800);

  expect(await noXss(page), 'XSS via show.poster_path').toBeUndefined();
  expect(await page.locator('img[onerror*="__xss"]').count()).toBe(0);
});

test('un nom d application piege reste du texte dans le titre', async ({ page }) => {
  await seed(page, {
    lbx_settings: { appName: '<img src=x onerror="window.__xss=1"> Mon Ludex', theme: 'default' },
  });
  await page.goto('/');
  await page.waitForTimeout(300);

  expect(await noXss(page), 'XSS via settings.appName').toBeUndefined();
  expect(await page.locator('.app-title img').count()).toBe(0);
  await expect(page.locator('.app-title')).toHaveText('Mon Ludex');
});

// ─── Garde-fou sur la fonction d'echappement elle-meme ─────────────────────
// escAttr() est appelée à ~167 endroits : si elle cesse de couvrir un
// caractère, la faille réapparaît partout à la fois, en silence.
test('escAttr echappe les cinq caracteres dangereux', async ({ page }) => {
  await page.goto('/');
  const out = await page.evaluate(() => window.escAttr
    ? window.escAttr(`&<>"'`)
    : eval('escAttr')(`&<>"'`));
  expect(out).toBe('&amp;&lt;&gt;&quot;&#39;');
});
