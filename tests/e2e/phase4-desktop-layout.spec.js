const { test, expect } = require('@playwright/test');

// Ce fichier testait auparavant que le glissement latéral sur une carte
// d'historique fonctionnait "en disposition colonnes". Les deux ont disparu :
// la disposition colonnes était le bug corrigé plus bas, et le glissement est
// volontairement neutralisé depuis le passage au balisage en grille — le
// touchstart de 06b-history-actions.js exige un .hist-item-content que ce
// balisage ne produit plus (garde-fou documenté dans styles.css, section
// HISTORY). Vérifié : ce test échoue à l'identique sur origin/main, il ne
// décrivait donc plus le produit depuis un moment.
//
// Ce qui compte réellement pour l'utilisateur reste vérifié ici : les deux
// actions (modifier, supprimer) sont atteignables à la souris sur grand écran,
// puisqu'elles sont en surimpression permanente et non plus derrière un geste.
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

test('la vraie mise en page a bien 2 colonnes de largeurs egales', async ({ page }) => {
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

  // Cette assertion exigeait auparavant columnCount === '2' : elle CODIFIAIT le
  // bug. Le multi-colonnes CSS ne défile pas verticalement — sur un conteneur à
  // hauteur contrainte (max-height: 700px) il déverse le surplus en colonnes
  // supplémentaires vers la droite, que le overflow-x: hidden de
  // .history-scroller rendait invisibles et inatteignables : 6 cartes sur 40
  // accessibles à 1440px. Le test passait au vert pendant ce temps, puisqu'il
  // ne vérifiait que la présence du multi-colonnes, jamais que les films
  // restaient joignables.
  //
  // Ce qu'on vérifie maintenant : pas de multi-colonnes, et aucun débordement
  // horizontal dans le scroller. La couverture complète (40 films sur 40) est
  // dans tests/e2e/desktop-layout.spec.js.
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
  console.log('largeur barre de navigation:', box.width);
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
const { default: AxeBuilder } = require("@axe-core/playwright");
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
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
    console.log(`${theme}: ${bad.length}`);
    for (const v of bad) console.log('  ', v.id);
  });
}
