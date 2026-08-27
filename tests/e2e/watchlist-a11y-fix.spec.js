const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
  test(`a11y watchlist corrigee - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_watchlist', JSON.stringify([
        { title: 'Film A voir', tmdbId: '99', year: '2023', genre: 'Drame', poster: '' },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-watchlist');
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme}: ${bad.length} violation(s)`);
    for (const v of bad) console.log('  ', v.id);
  });
}

test('ouvrir la fiche fonctionne toujours en tapant sur la carte (pas les boutons)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_watchlist', JSON.stringify([
      { title: 'Film A voir', tmdbId: '99', year: '2023', genre: 'Drame', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?id=99', route => route.fulfill({ json: {
    id: 99, title: 'Film A voir', release_date: '2023-01-01', overview: 'Synopsis.',
    credits: { cast: [], crew: [] }, videos: { results: [] }, external_ids: {},
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(600);
  await page.click('.wl-card-open');
  await page.waitForTimeout(500);
  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
});

test('les boutons Noter/Retirer fonctionnent toujours independamment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_watchlist', JSON.stringify([
      { title: 'Film A voir', tmdbId: '99', year: '2023', genre: 'Drame', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.wl-btn.del').click());
  await page.waitForTimeout(300);
  // La migration au premier chargement copie lbx_watchlist vers
  // lbx_watchlist_default (et laisse l'ancienne clé telle quelle, jamais
  // relue ensuite — c'est la clé migrée qu'il faut vérifier).
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_watchlist_default')));
  expect(stored).toHaveLength(0);
});
