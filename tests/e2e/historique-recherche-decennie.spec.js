const { test, expect } = require('@playwright/test');

function seed(films) {
  return JSON.stringify(films.map((f, i) => ({
    title: f.title, year: f.year || '2020', score: f.score || '7.0', mode: 'quick',
    values: { quick: (parseFloat(f.score) || 7) / 2 }, date: '2026-0' + ((i % 6) + 1) + '-10',
    savedAt: '2026-01-01T10:00:0' + i + '.000Z', genre: f.genre || '',
  })));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('chercher "199" dans l\'historique filtre par decennie 1990', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seed([
    { title: 'Pulp Fiction', year: '1994' }, { title: 'Seven', year: '1995' },
    { title: 'Dune', year: '2021' },
  ]));
  await page.goto('/');
  await page.click('#nav-history');
  await page.click('#history-search-toggle');
  await page.fill('#history-search', '199');
  await page.waitForTimeout(300);

  const visible = await page.locator('.hist-item').count();
  expect(visible).toBe(2);
  // Ludex 2.0 : titre désormais dans aria-label (grille de posters, plus de
  // texte visible sur la carte) — voir xss.spec.js pour la même adaptation.
  const ariaLabels = await page.locator('.hist-item .hist-item-open').evaluateAll(els => els.map(el => el.getAttribute('aria-label')).join(' '));
  expect(ariaLabels).not.toContain('Dune');
});
