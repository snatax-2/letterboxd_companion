const { test, expect } = require('@playwright/test');

// ── LA PILE DE SUGGESTIONS DE DÉCOUVRIR N'EXISTE PLUS ──────────────────
// Deux tests portaient ici sur #discover-stack : son état vide compact
// ("Note au moins un film"), et le retour à une hauteur normale une fois la
// file peuplée. fa0caea a vidé l'écran Découvrir (-1470 lignes dans
// src/11-discover.js, -230 dans index.html) : plus de pile à balayer, plus
// de file, et donc plus d'état vide — l'écran ne dépend plus de ce qu'on a
// déjà noté, il propose un choix du jour et des rangées par catégorie.
//
// La garantie sous-jacente — "Découvrir est utilisable dès l'installation,
// sans avoir rien noté" — reste vraie et vérifiable, sur le contenu actuel.
test('Decouvrir est utilisable des l\'installation, sans aucune note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  // Le tirage du jour a besoin d'un `result`, que la route générique
  // ci-dessus ne fournit pas. Enregistrée APRÈS elle : Playwright donne la
  // priorité à la route la plus récemment enregistrée (piège documenté
  // ailleurs dans ce projet). Sans elle, le bloc « Choix du jour » se
  // masquerait — c'est son comportement correct quand il n'y a rien à
  // proposer, vérifié par le test suivant — et l'assertion ci-dessous ne
  // dirait plus rien de la garantie qu'on veut tenir ici.
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: {
    id: 603, title: 'Matrix', release_date: '1999-03-30', poster_path: '/m.jpg', backdrop_path: '/b.jpg',
  } } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-discover');
  await page.waitForTimeout(1000);

  // L'écran se rend, avec sa bascule Films/Séries et le choix du jour.
  const wrap = page.locator('#discover-card-wrap');
  await expect(wrap).toBeVisible();
  await expect(wrap.locator('.discover-seg-btn')).toHaveCount(2);
  await expect(page.locator('.choix-du-jour-wrap')).toBeVisible();
  await expect(page.locator('#choix-du-jour-card')).toContainText('Matrix');

  // La CARTE elle-même, pas seulement son conteneur — et pas seulement son
  // texte. Le pilote Archives & Editorial n'est plus un hero recadré en 4:3 :
  // il juxtapose une vraie affiche 2:3 et un bloc éditorial. On vérifie donc
  // la taille du bouton ET la proportion de l'affiche, ce qui protège la
  // nouvelle composition sans réintroduire l'ancien recadrage.
  await expect(page.locator('#choix-du-jour-card')).toBeVisible();
  const boite = await page.locator('#choix-du-jour-card').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(boite.w, `largeur de la carte : ${JSON.stringify(boite)}`).toBeGreaterThan(200);
  expect(boite.h, `hauteur de la composition : ${JSON.stringify(boite)}`).toBeGreaterThan(180);
  const affiche = await page.locator('.choix-du-jour-poster-wrap').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  expect(affiche.h / affiche.w, `ratio affiche : ${JSON.stringify(affiche)}`).toBeCloseTo(3 / 2, 1);
  await expect(page.locator('.choix-du-jour-title')).toBeVisible();

  // Et rien n'y invite à noter d'abord : c'était tout l'objet du changement.
  const texte = await wrap.textContent();
  expect(texte).not.toContain('Note au moins un film');
});

// Non-régression sur le défaut trouvé en traitant l'audit tiers :
// loadChoixDuJour() ne retirait son squelette qu'en cas de rendu RÉUSSI. API
// en panne, appareil hors-ligne, ou réponse sans `result` → le miroitement
// tournait indéfiniment, sans le moindre indice pour l'utilisateur. Les 4
// carrousels géraient déjà leur échec en se masquant ; le hero était le seul
// oublié.
//
// On masque le BLOC entier (surtitre + carte) et pas seulement la carte :
// masquer la carte seule laisserait « Choix du jour » flotter au-dessus d'un
// vide. C'est ce que font les carrousels, qui masquent `carousel-block-*` et
// non la seule rangée d'affiches.
for (const [nom, remplir] of [
  ['réponse sans tirage', route => route.fulfill({ json: { results: [] } })],
  ['API en panne', route => route.fulfill({ status: 500, body: 'boom' })],
  ['réseau coupé', route => route.abort()],
]) {
  test(`Choix du jour indisponible (${nom}) : le bloc se masque, pas de squelette infini`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.route('**/api/search?dailyPick=*', remplir);
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(1000);

    await expect(page.locator('.choix-du-jour-wrap')).toBeHidden();
    // Le point qui compte vraiment : plus aucun squelette en train de
    // miroiter. `toBeHidden` sur le bloc ne le garantirait pas seul — un
    // squelette laissé dans le DOM d'un bloc masqué reviendrait à l'écran
    // au premier réaffichage.
    await expect(page.locator('#choix-du-jour-card .skeleton-bg')).toHaveCount(0);
  });
}

test('Historique : bascule Films/Series avec fondu, contenu final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);

  await expect(page.locator('#history-list')).toBeVisible();
  await page.click('#hist-tab-tv');
  // Attend la fin complete de la sequence de fondu (140+150ms) avant de verifier
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-history-list')).toBeVisible();
  await expect(page.locator('#history-list')).toBeHidden();
  const opacity = await page.locator('#tv-history-list').evaluate(el => getComputedStyle(el).opacity);
  console.log('opacity finale apres transition:', opacity);
  expect(opacity).toBe('1');
  // Ludex 2.0 : l'historique des séries est passé à la mosaïque d'affiches des
  // films — .tv-show-card a laissé place à .hist-item.hist-grid-card.
  await expect(page.locator('#tv-history-list .hist-item').first()).toBeVisible();
});

test('Noter : bascule Film/Serie avec fondu, formulaire final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await expect(page.locator('#movie-only-fields')).toBeVisible();
  await page.click('#tab-media-tv');
  await page.waitForTimeout(400);
  await expect(page.locator('#tv-only-fields')).toBeVisible();
  await expect(page.locator('#movie-only-fields')).toBeHidden();
  await expect(page.locator('#tv-search')).toBeVisible();
});

test('Profil : bascule stats Films/Series avec fondu, KPI final correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(500);
  await page.click('#stats-tab-tv');
  await page.waitForTimeout(400);
  const label = await page.locator('#kpi-total-label').textContent();
  expect(label).toBe('Séries suivies');
  const opacity = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-grid')).opacity);
  console.log('opacity finale dashboard:', opacity);
  expect(opacity).toBe('1');
});
const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['dark', 'light']) {
  // Corrigé lors du renommage (phase 6 de l'audit) : cette boucle ne faisait
  // auparavant que console.log les violations sans jamais les faire échouer
  // (aucun expect()) — deux scans axe-core complets par thème, pour un test
  // qui passait toujours quel que soit le résultat.
  //
  // Budget de temps élargi en même temps, et pas pour masquer un échec : le
  // test enchaîne DEUX analyses axe-core complètes plus 2,5s d'attentes fixes,
  // mesuré à 30,5s seul — soit juste au-dessus des 30s par défaut. Il passait
  // donc de justesse en isolation et expirait dès que la machine était
  // chargée par le reste de la suite (reproduit : vert seul, rouge en lot).
  // L'assertion, elle, est bien réelle maintenant.
  test(`a11y bascule Films/Séries - ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    let results = await new AxeBuilder({ page }).analyze();
    let bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, `Découvrir — ${JSON.stringify(bad.map(v => v.id))}`).toHaveLength(0);
    await page.click('#nav-rating');
    await page.waitForTimeout(400);
    await page.click('#tab-media-tv');
    await page.waitForTimeout(400);
    results = await new AxeBuilder({ page }).analyze();
    bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, `après transition — ${JSON.stringify(bad.map(v => v.id))}`).toHaveLength(0);
  });
}
