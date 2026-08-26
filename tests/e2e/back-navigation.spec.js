// Bouton Retour (Android / navigateur).
//
// Avant : l'app n'écrivait aucune entrée d'historique, donc en PWA installée
// le Retour QUITTAIT l'application quoi qu'il y ait à l'écran — fiche ouverte,
// modale de confirmation, onglet autre que celui d'arrivée. Voir
// src/20-back-navigation.js pour le raisonnement complet.

const { test, expect } = require('@playwright/test');

const FILM_DETAIL = {
  id: 1, title: 'Film Test', poster_path: '/p.jpg', release_date: '2020-01-01',
  genres: [], credits: { crew: [], cast: [] }, videos: { results: [] }, external_ids: {},
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick',
        values: { quick: 3.75 }, date: '2026-08-01', savedAt: '2026-08-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search?id=1*', route => route.fulfill({ json: FILM_DETAIL }));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1500);
});

const ongletActif = (page) => page.evaluate(() =>
  (document.querySelector('.mobile-nav .nav-btn.active') || {}).id);
const couchesOuvertes = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.modal-overlay.open')].map(e => e.id));

test('Retour ferme la couche la plus recente, une a la fois', async ({ page }) => {
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await page.evaluate(() => openMovieDetailSheet('1'));
  await page.waitForTimeout(800);
  await page.evaluate(() => openModal('Titre', 'Corps', () => {}));
  await page.waitForTimeout(400);

  // Les 12 overlays partagent le meme z-index et l'ordre du DOM ne dit rien de
  // l'ordre d'ouverture : c'est bien la modale ouverte EN DERNIER qui doit
  // partir la premiere, pas celle qui vient en premier dans le document.
  expect(await couchesOuvertes(page)).toContain('modal');
  await page.goBack();
  await page.waitForTimeout(600);
  expect(await couchesOuvertes(page)).toEqual(['movie-detail-sheet']);

  await page.goBack();
  await page.waitForTimeout(700);
  expect(await couchesOuvertes(page)).toEqual([]);
  // L'onglet ne bouge pas tant qu'il reste des couches a fermer.
  expect(await ongletActif(page)).toBe('nav-history');
});

test('Retour revient a l\'onglet d\'arrivee, puis quitte', async ({ page }) => {
  await page.click('#nav-profile');
  await page.waitForTimeout(400);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);

  // Un point de chute unique, pas un historique d'onglets : un seul Retour
  // suffit depuis n'importe quel onglet, sans allers-retours.
  await page.goBack();
  await page.waitForTimeout(600);
  expect(await ongletActif(page)).toBe('nav-discover');

  // Puis le Retour suivant sort vraiment de l'app.
  const avant = page.url();
  await page.goBack().catch(() => {});
  await page.waitForTimeout(500);
  expect(page.url(), 'le second Retour doit quitter l\'app').not.toBe(avant);
});

test('fermer au bouton n\'avale pas le Retour suivant', async ({ page }) => {
  // Cas piege : une sentinelle a ete posee a l'ouverture de la fiche, mais la
  // fiche est refermee autrement que par Retour. Sans nettoyage, le Retour
  // suivant serait consomme sans rien faire de visible.
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await page.evaluate(() => openMovieDetailSheet('1'));
  await page.waitForTimeout(800);
  await page.evaluate(() => closeMovieDetailSheet());
  await page.waitForTimeout(700);
  expect(await couchesOuvertes(page)).toEqual([]);

  await page.goBack();
  await page.waitForTimeout(600);
  expect(await ongletActif(page)).toBe('nav-discover');
});

test('sur l\'onglet d\'arrivee sans rien d\'ouvert, le premier Retour quitte', async ({ page }) => {
  expect(await ongletActif(page)).toBe('nav-discover');
  expect(await couchesOuvertes(page)).toEqual([]);

  const avant = page.url();
  await page.goBack().catch(() => {});
  await page.waitForTimeout(500);
  expect(page.url(), 'aucune entree parasite ne doit avaler ce Retour').not.toBe(avant);
});

// ── ROUTAGE PAR HASH (Phase 3 de l'audit) ───────────────────────────────
// Chaque onglet est reflété dans l'URL (#discover, #history...) via
// history.replaceState — pas pushState, pour ne pas créer d'entrée
// d'historique à chaque clic (ça casserait la sentinelle unique ci-dessus).
// Deux bénéfices concrets : un rechargement de page atterrit sur le bon
// onglet plutôt que systématiquement Découvrir, et un lien copié/collé dans
// la barre d'adresse d'un onglet déjà ouvert ouvre le bon onglet plutôt que
// de forcer un retour à Découvrir.

test('un rechargement atterrit sur l\'onglet indique par l\'URL', async ({ page }) => {
  await page.click('#nav-watchlist');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => location.hash)).toBe('#watchlist');

  await page.reload();
  await page.waitForTimeout(1500);
  expect(await ongletActif(page)).toBe('nav-watchlist');
});

test('coller un lien de fragment dans une session deja ouverte ouvre le bon onglet, sans le confondre avec un Retour', async ({ page }) => {
  // Cas piège corrigé pendant le développement : le navigateur traite une
  // navigation vers un fragment différent, sur la même page déjà chargée,
  // comme une navigation "vers l'avant" — mais elle déclenche quand même un
  // popstate. Sans distinction, le gestionnaire de Retour l'interprétait à
  // tort comme "l'utilisateur a pressé Retour" et forçait un retour à
  // Découvrir au lieu d'ouvrir l'onglet demandé.
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#nav-profile');
  await page.waitForTimeout(400);
  expect(await ongletActif(page)).toBe('nav-profile');

  await page.goto('/#watchlist');
  await page.waitForTimeout(600);
  expect(await ongletActif(page)).toBe('nav-watchlist');

  // Et le Retour continue de fonctionner normalement depuis cet état.
  await page.goBack();
  await page.waitForTimeout(600);
  expect(await ongletActif(page)).toBe('nav-discover');
});

// ── Sortie accidentelle de l'application en changeant d'onglet ────────────
// Bug réel, trouvé en réparant une assertion périmée de offline-full.spec.js
// et reproduit sur les commits antérieurs (ce n'est pas une régression de
// l'audit) : revenir sur l'onglet d'ARRIVÉE après l'avoir quitté faisait
// SORTIR de l'application, silencieusement.
//
// Mécanisme : en quittant Découvrir, une entrée sentinelle est empilée. En y
// revenant, il n'y a plus rien à annuler, donc la sentinelle est consommée
// par un history.back(). Mais history.back() est asynchrone, et le drapeau
// `sentinellePosee` n'était remis à false que dans le gestionnaire popstate,
// au tour de boucle suivant. Or l'observateur de mutations rappelle
// synchroniserSentinelle() plusieurs fois pour un même changement d'onglet
// (le clic retire .active d'un bouton et l'ajoute sur un autre). Les deux
// passages voyaient encore le drapeau à true : DEUX history.back() pour UNE
// seule entrée sentinelle. Le second remontait au-delà de l'application.
//
// Aucune erreur JS, aucune trace en console : juste la page qui disparaît.
test('revenir sur l\'onglet d\'arrivee ne fait pas sortir de l\'application', async ({ page }) => {
  // Mise en place (localStorage, routes, goto) faite par le test.beforeEach
  // du fichier — la refaire ici relancerait une seconde navigation.

  // Quitter l'onglet d'arrivee (Decouvrir) puis y revenir.
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#nav-discover');
  await page.waitForTimeout(800);

  // L'application doit toujours etre la : avant correctif, la page etait
  // remplacee par l'entree d'historique precedente du navigateur.
  await expect(page.locator('#nav-discover')).toHaveClass(/active/);
  await expect(page.locator('.mobile-nav')).toBeVisible();
  expect(page.url()).toContain('#discover');

  // Et la navigation reste utilisable ensuite.
  await page.click('#nav-profile');
  await page.waitForTimeout(400);
  await expect(page.locator('#nav-profile')).toHaveClass(/active/);
});

test('aller-retour repete sur l\'onglet d\'arrivee reste stable', async ({ page }) => {
  // Trois allers-retours : chaque consommation de sentinelle doit retirer
  // exactement une entree, jamais deux.
  for (let i = 0; i < 3; i++) {
    await page.click('#nav-watchlist');
    await page.waitForTimeout(350);
    await page.click('#nav-discover');
    await page.waitForTimeout(350);
    await expect(page.locator('#nav-discover')).toHaveClass(/active/);
  }
  await expect(page.locator('.mobile-nav')).toBeVisible();
  expect(page.url()).toContain('#discover');
});
