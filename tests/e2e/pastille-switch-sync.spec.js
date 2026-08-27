const { test, expect } = require('@playwright/test');

// Pastille glissante du switch Films/Séries : elle doit suivre l'onglet actif
// PAR TOUS LES CHEMINS, pas seulement au clic.
//
// Bug réel corrigé, et qu'aucun test ne voyait : la pastille n'était déplacée
// que par l'écouteur de clic global (01-navigation.js). Or setMediaType('tv')
// est appelée par programme depuis quatre endroits — ouvrir une fiche série
// puis « Noter », commencer une série, noter une saison, envoyer une série de
// la watchlist vers la notation. Dans ces quatre parcours, le bouton « Série »
// recevait bien .active mais la pastille restait sous « Film » : l'onglet
// affiché et la pastille se contredisaient à l'écran.
//
// L'invariant testé ici est volontairement formulé comme une ÉQUIVALENCE
// plutôt que comme une liste de cas : la pastille est à droite si et seulement
// si le bouton « Séries » est actif. Un futur chemin d'appel qu'on n'aurait
// pas prévu tombera donc dessus tout seul.

const SWITCHES = [
  { nav: '#nav-rating',    conteneur: '.media-type-tabs',  tv: '#tab-media-tv',   film: '#tab-media-movie', nom: 'Noter' },
  { nav: '#nav-history',   conteneur: '#hist-media-tabs',  tv: '#hist-tab-tv',    film: '#hist-tab-movie',  nom: 'Historique' },
  { nav: '#nav-watchlist', conteneur: '#wl-media-tabs',    tv: '#wl-tab-tv',      film: '#wl-tab-movie',    nom: 'À voir' },
  { nav: '#nav-profile',   conteneur: '#stats-media-tabs', tv: '#stats-tab-tv',   film: '#stats-tab-movie', nom: 'Profil' },
];

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film', year: '2020', score: '8.0', mode: 'quick', values: { quick: 4 },
        date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', genre: 'Drame' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.goto('/');
  await page.waitForTimeout(1400);
}

// L'invariant : pastille à droite ⟺ bouton « Séries » actif.
async function verifierCoherence(page, sw, contexte) {
  const etat = await page.evaluate(({ conteneur, tv }) => ({
    pastilleADroite: document.querySelector(conteneur).classList.contains('series-active'),
    seriesActif: document.querySelector(tv).classList.contains('active'),
  }), sw);
  expect(etat.pastilleADroite,
    `${sw.nom} — ${contexte} : pastille à droite=${etat.pastilleADroite}, bouton Séries actif=${etat.seriesActif}`)
    .toBe(etat.seriesActif);
}

for (const sw of SWITCHES) {
  test(`${sw.nom} — la pastille suit l'onglet actif au clic`, async ({ page }) => {
    await prepare(page);
    await page.click(sw.nav);
    await page.waitForTimeout(400);

    await verifierCoherence(page, sw, 'état initial');

    await page.click(sw.tv);
    await page.waitForTimeout(400);
    await verifierCoherence(page, sw, 'après clic sur Séries');
    expect(await page.locator(sw.conteneur).evaluate(el => el.classList.contains('series-active')),
      `${sw.nom} : la pastille doit être passée à droite`).toBe(true);

    await page.click(sw.film);
    await page.waitForTimeout(400);
    await verifierCoherence(page, sw, 'retour sur Films');
  });
}

test("Noter — la pastille suit aussi un changement PAR PROGRAMME", async ({ page }) => {
  await prepare(page);
  await page.click('#nav-rating');
  await page.waitForTimeout(400);

  // Exactement ce que font openTvDetailSheet (19-tv-detail.js), le démarrage
  // d'une série et la notation d'une saison (18-tv-shows.js), et le passage
  // watchlist -> notation (08-watchlist.js) : un appel direct, sans clic.
  await page.evaluate(() => setMediaType('tv'));
  await page.waitForTimeout(300);

  const sw = SWITCHES[0];
  await verifierCoherence(page, sw, 'après setMediaType("tv") par programme');
  expect(await page.locator(sw.conteneur).evaluate(el => el.classList.contains('series-active')),
    'la pastille doit avoir suivi l\'appel par programme').toBe(true);

  await page.evaluate(() => setMediaType('movie'));
  await page.waitForTimeout(300);
  await verifierCoherence(page, sw, 'après setMediaType("movie") par programme');
});

test('Historique et Profil — la pastille suit un changement par programme', async ({ page }) => {
  await prepare(page);

  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.evaluate(() => switchHistoryMediaFilter('tv'));
  await page.waitForTimeout(300);
  await verifierCoherence(page, SWITCHES[1], 'après switchHistoryMediaFilter("tv")');

  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await page.evaluate(() => switchStatsMediaFilter('tv'));
  await page.waitForTimeout(400);
  await verifierCoherence(page, SWITCHES[3], 'après switchStatsMediaFilter("tv")');
});

test("le groupe Détaillé/Rapide n'a pas de pastille et ne doit pas en gagner", async ({ page }) => {
  await prepare(page);
  await page.click('#nav-rating');
  await page.waitForTimeout(400);

  // Ce groupe est le seul .mode-tabs qui ne soit pas un switch Films/Séries :
  // il ne porte pas de .toggle-slider, et le mécanisme générique ne doit pas
  // le confondre avec les cinq autres (il n'a pas d'icône .icon-tv).
  const plain = page.locator('.mode-tabs-plain');
  await expect(plain.locator('.toggle-slider')).toHaveCount(0);

  await page.click('#tab-quick');
  await page.waitForTimeout(300);
  expect(await plain.evaluate(el => el.classList.contains('series-active')),
    'le groupe Détaillé/Rapide ne doit jamais recevoir series-active').toBe(false);
  await expect(page.locator('#tab-quick')).toHaveClass(/active/);
});
