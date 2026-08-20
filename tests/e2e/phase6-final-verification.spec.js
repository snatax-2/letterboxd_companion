const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const HIST = [
  { title: 'Parasite', tmdbId: '1', year: '2019', score: '9.5', mode: 'detail', values: { scenario: '10', realisation: '9', photo: '9', acteurs: '10', ambiance: '9', rythme: '9', affect: '10' }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', genre: 'Thriller', director: 'Bong Joon-ho', review: 'Un film exceptionnel.' },
  { title: 'Whiplash', tmdbId: '2', year: '2014', score: '8.5', mode: 'quick', values: { quick: 4.25 }, date: '2026-01-05', savedAt: '2026-01-05T10:00:00.000Z', genre: 'Drame', director: 'Damien Chazelle' },
];
const TV = [
  { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', genre: 'Policier', seasons: {
    '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
  } },
];

const SCREENS = [
  { nav: '#nav-history', name: 'Historique' },
  { nav: '#nav-watchlist', name: 'A voir' },
  { nav: '#nav-rating', name: 'Noter' },
  { nav: '#nav-discover', name: 'Decouvrir' },
  { nav: '#nav-profile', name: 'Profil' },
];

for (const viewport of [{ w: 390, h: 900, label: 'mobile' }, { w: 1440, h: 1000, label: 'desktop' }]) {
  for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
    test(`balayage final : ${viewport.label} / ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.w, height: viewport.h });
      await page.addInitScript((data) => {
        localStorage.setItem('lbx_onboarding_seen', '1');
        localStorage.setItem('lbx_settings', JSON.stringify({ theme: data.theme }));
        localStorage.setItem('lbx_v2', JSON.stringify(data.hist));
        localStorage.setItem('lbx_tv_shows', JSON.stringify(data.tv));
        localStorage.setItem('lbx_watchlist', JSON.stringify([{ title: 'Dune', tmdbId: '99', year: '2021', genre: 'SF', poster: '' }]));
      }, { theme, hist: HIST, tv: TV });
      await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
      await page.goto('/');
      await page.waitForTimeout(1400);

      const allViolations = [];
      for (const screen of SCREENS) {
        await page.click(screen.nav);
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page }).analyze();
        const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
        if (bad.length > 0) {
          allViolations.push(`${screen.name}: ${bad.map(v => v.id).join(',')}`);
        }
      }
      expect(allViolations, allViolations.join(' | ')).toHaveLength(0);
    });
  }
}

test('onboarding non ouverte : aucune diapositive ne doit intercepter de clics ailleurs sur la page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_settings', JSON.stringify({ theme: 'cinephile' }));
    localStorage.setItem('lbx_watchlist', JSON.stringify([{ title: 'Dune', tmdbId: '99', year: '2021', genre: 'SF', poster: '' }]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(600);
  await page.click('#nav-watchlist');
  await page.waitForTimeout(600);
  // Le vrai test : ce clic doit reussir sans timeout, sans etre intercepte
  await page.click('#nav-rating', { timeout: 3000 });
  await expect(page.locator('#nav-rating')).toHaveClass(/active/);
});
