const { test, expect } = require('@playwright/test');

// Mise en page au-dessus des seuils responsive (861px et 1024px).
//
// Ce fichier tourne dans le projet `desktop-chrome` (voir playwright.config.js).
// Tout le reste de la suite tourne sur un gabarit Pixel 7 (412px), donc SOUS
// les deux seuils : les regles desktop n'etaient couvertes par presque rien,
// et trois defauts y vivaient sans faire rougir un seul test -- dont un qui
// rendait 85 % de l'historique inatteignable. Les tests ajoutes en fin de
// fichier ont chacun ete verifies en echec sur le CSS d'avant correction.
//
// ── Partie d'origine ────────────────────────────────────────────────────
// Verifie le bug d'affichage PC trouve suite a un signalement utilisateur :
// le carrousel "Tendances du moment" (flex + overflow-x:auto sans
// min-width:0) forcait la page a deborder bien au-dela de l'ecran. Corrige,
// puis la mise en page desktop a ete refondue en systeme d'onglets uniques
// (comme sur mobile) a la demande de l'utilisateur -- ce test verifie les
// deux : pas de debordement horizontal, et un seul onglet visible a la fois.

const DETAIL = { id: 1, title: 'Film Test', poster_path: '/p.jpg', release_date: '2020-01-01', credits: { crew: [], cast: [] } };
const TRENDING_MANY = { results: Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, title: 'Tendance ' + i, poster_path: '/t.jpg', vote_average: 7 })) };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
  });
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?id=1', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
  await page.route('**/api/search?trending=true', route => route.fulfill({ json: TRENDING_MANY }));
});

test('le carrousel Tendances (10 films) ne fait plus deborder la page en largeur bureau', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(1440);
});

test('la barre a 5 onglets est visible en haut sur PC, un seul onglet actif a la fois', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  // Filet de sécurité : ferme la fenêtre d'accueil si jamais elle apparaît
  // malgré le flag lbx_onboarding_seen déjà positionné (timing propre à ce
  // test) — retire directement l'overlay plutôt que de cliquer dessus, pour
  // ne pas dépendre d'un clic qui peut lui-même être intercepté.
  await page.evaluate(() => document.getElementById('onboarding-modal')?.remove());

  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(page.locator('.nav-btn')).toHaveCount(5);

  // L'onglet d'arrivee est Decouvrir, pas Noter : voir le
  // `setTimeout(() => switchMobileNav('discover'), 0)` de fin de
  // src/01-navigation.js. Ce test exigeait encore #col-rating visible au
  // chargement, ce qui datait de l'epoque ou Noter etait l'ecran d'accueil --
  // il echouait donc depuis ce changement (verifie : meme echec sur main).
  await expect(page.locator('#col-rating')).toBeHidden();
  await expect(page.locator('#col-right-views')).toBeVisible();

  for (const tab of ['discover', 'watchlist', 'profile', 'history']) {
    await page.click(`#nav-${tab}`);
    await page.waitForTimeout(500);
    await expect(page.locator('#col-rating')).toBeHidden();
    await expect(page.locator('#col-right-views')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
  }

  await page.click('#nav-rating');
  await page.waitForTimeout(400);
  await expect(page.locator('#col-rating')).toBeVisible();
  await expect(page.locator('#col-right-views')).toBeHidden();
});


// ═══════════════════════════════════════════════════════════════════════
//  Defauts trouves lors de l'audit desktop (phase 4)
// ═══════════════════════════════════════════════════════════════════════

function makeHistory(n) {
  return Array.from({ length: n }, (_, i) => ({
    title: `Film ${i}`, year: String(1990 + (i % 30)), runtime: '100 min',
    genre: 'Drame', director: `R${i}`, actors: 'A, B',
    score: (5 + (i % 5)).toFixed(1), mode: 'quick', values: { quick: 3 },
    date: `2026-0${(i % 6) + 1}-10`, savedAt: `2026-0${(i % 6) + 1}-10T10:00:00.000Z`,
    review: '', poster: '',
  }));
}

test("l'historique complet reste atteignable sur grand ecran", async ({ page }) => {
  await page.addInitScript((history) => {
    localStorage.setItem('lbx_v2', JSON.stringify(history));
  }, makeHistory(40));
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.click('#nav-history');
  await page.waitForTimeout(900);

  const measure = await page.evaluate(() => {
    const sc = document.querySelector('#history-list');
    const box = sc.getBoundingClientRect();
    const cards = [...sc.querySelectorAll('.hist-item')];
    const outside = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.right > box.right + 1 || r.left < box.left - 1;
    });
    return { total: cards.length, outside: outside.length, scrollW: sc.scrollWidth, clientW: sc.clientWidth };
  });

  // La regression d'origine : `column-count: 2` sur un conteneur a hauteur
  // contrainte. Le multi-colonnes CSS ne defile pas verticalement -- il
  // deverse le surplus en colonnes SUPPLEMENTAIRES vers la droite, que le
  // `overflow-x: hidden` de .history-scroller rendait invisibles ET
  // inatteignables. Mesure alors : scrollWidth de 8039px pour 1058px de
  // large, 6 cartes joignables sur 40, sans aucun indice a l'ecran.
  expect(measure.total).toBe(40);
  expect(measure.outside).toBe(0);
  expect(measure.scrollW).toBeLessThanOrEqual(measure.clientW + 1);
});

test("la barre d'onglets est en haut et y reste pendant le defilement", async ({ page }) => {
  await page.addInitScript((history) => {
    localStorage.setItem('lbx_v2', JSON.stringify(history));
  }, makeHistory(40));
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.click('#nav-profile');
  await page.waitForTimeout(900);

  const nav = page.locator('.mobile-nav');
  const before = await nav.boundingBox();
  const headerBox = await page.locator('.app-header').boundingBox();

  // Dans le HTML, <nav> est ecrit APRES .layout (sur mobile il est en
  // position:fixed, l'ordre du document n'y change rien). En flux normal,
  // ce meme ordre le rejetait tout en bas de la PAGE : mesure a 1440px,
  // 1021px du haut sur Decouvrir et 2637px sur Profil.
  expect(before.y).toBeGreaterThanOrEqual(headerBox.y);
  expect(before.y).toBeLessThan(headerBox.y + headerBox.height + 80);

  // Et il faut qu'il y reste : l'onglet Profil depasse 2600px de haut.
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(300);
  const after = await nav.boundingBox();
  expect(after.y).toBeLessThanOrEqual(1);
  expect(after.y + after.height).toBeGreaterThan(0);
});

test("en-tete et barre d'onglets occupent toute la largeur du conteneur", async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);

  // Garde-fou sur le correctif lui-meme : body passe en flex column au-dessus
  // de 861px pour remonter la barre d'onglets, et le `margin: 0 auto` deja
  // pose sur .app-header et .mobile-nav neutralise alors le align-items:
  // stretch. Sans `width: 100%`, les deux se reduisent a leur contenu --
  // barre ecrasee a ~290px avec les libelles qui se chevauchent, titre et
  // engrenage colles l'un a l'autre.
  const widths = await page.evaluate(() => {
    const w = (s) => Math.round(document.querySelector(s).getBoundingClientRect().width);
    return { header: w('.app-header'), nav: w('.mobile-nav'), layout: w('.layout') };
  });
  expect(widths.header).toBe(widths.layout);
  expect(widths.nav).toBe(widths.layout);
  expect(widths.layout).toBeGreaterThan(1000);
});

test('la liste A voir densifie au lieu de grossir les affiches', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_watchlist', JSON.stringify(
      Array.from({ length: 14 }, (_, i) => ({
        id: 1000 + i, title: `Watch ${i}`, year: String(2000 + i),
        poster: '', addedAt: '2026-01-01T10:00:00.000Z',
      })),
    ));
  });
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(900);

  const grid = await page.evaluate(() => {
    const s = document.querySelector('.watchlist-scroller');
    const card = document.querySelector('.wl-card');
    return {
      columns: getComputedStyle(s).gridTemplateColumns.split(' ').length,
      cardWidth: card ? Math.round(card.getBoundingClientRect().width) : 0,
    };
  });

  // Avant : repeat(3, 1fr) quelle que soit la largeur, soit des affiches de
  // 342px sur un conteneur de 1058px -- la place gagnee servait a grossir
  // les vignettes plutot qu'a en montrer davantage. Le meme `column-count`
  // que sur l'historique etait pose ici, mais sans effet : le multi-colonnes
  // ne s'applique pas a un conteneur display:grid, d'ou l'absence de casse
  // visible de ce cote.
  expect(grid.columns).toBeGreaterThanOrEqual(5);
  expect(grid.cardWidth).toBeLessThan(220);
});

// ── Fusionné depuis phase4-desktop-layout.spec.js (renommage par
// comportement, phase 6 de l'audit) — ce fichier testait auparavant que le
// glissement latéral sur une carte d'historique fonctionnait "en
// disposition colonnes". Les deux ont disparu : la disposition colonnes
// était le bug corrigé ici (voir plus haut), et le glissement est
// volontairement neutralisé depuis le passage au balisage en grille — le
// touchstart de 06b-history-actions.js exige un .hist-item-content que ce
// balisage ne produit plus (garde-fou documenté dans styles.css, section
// HISTORY).

test('les actions dune carte dhistorique restent atteignables a la souris (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);

  const secondCard = page.locator('#history-list .hist-item').nth(1);
  const actions = secondCard.locator('.hist-action-btn');
  await expect(actions).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const box = await actions.nth(i).boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  }
});

test('pas de mise en page multi-colonnes qui masque des films (garde-fou sur le mécanisme du bug)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);

  // Cette assertion exigeait auparavant columnCount === '2' : elle CODIFIAIT
  // le bug. Le multi-colonnes CSS ne défile pas verticalement — sur un
  // conteneur à hauteur contrainte (max-height: 700px) il déverse le surplus
  // en colonnes supplémentaires vers la droite, que le overflow-x: hidden de
  // .history-scroller rendait invisibles et inatteignables : 6 cartes sur 40
  // accessibles à 1440px. Le test passait au vert pendant ce temps, puisqu'il
  // ne vérifiait que la présence du multi-colonnes, jamais que les films
  // restaient joignables. La couverture complète (40 films sur 40) est dans
  // le test "l'historique complet reste atteignable sur grand ecran" plus haut.
  const layout = await page.locator('#history-list').evaluate(el => ({
    columnCount: getComputedStyle(el).columnCount,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
  }));
  expect(layout.columnCount).toBe('auto');
  expect(layout.scrollW).toBeLessThanOrEqual(layout.clientW + 1);
});

test('largeur du conteneur elargie a 1100px sur desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  const box = await page.locator('.mobile-nav').boundingBox();
  expect(box.width).toBeGreaterThan(1000);
});

test('mobile (390px) reste totalement inchange : une seule colonne, conteneur a 800px max', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);
  const columnCount = await page.locator('#history-list').evaluate(el => getComputedStyle(el).columnCount);
  expect(columnCount).toBe('auto');
  const navWidth = (await page.locator('.mobile-nav').boundingBox()).width;
  expect(navWidth).toBeLessThan(390); // barre fixe en bas, marges de 12px de chaque côté
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['dark', 'light']) {
  // Corrigé lors de la fusion : cette boucle ne faisait auparavant que
  // console.log les violations sans jamais les faire échouer (aucun expect())
  // — un test qui passait toujours, quel que soit le résultat réel.
  test(`a11y desktop - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_v2', JSON.stringify([
        { title: 'Film A', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
        { title: 'Film B', tmdbId: '2', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-02', savedAt: '2026-01-02T10:00:00.000Z' },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
