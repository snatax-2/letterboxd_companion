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

// Note : les deux tests "duel du jour" (#daily-duel-wrap/#daily-duel-card)
// qui vivaient ici ont été retirés — cet élément n'existe nulle part dans
// le code actuel (vérifié), un résidu antérieur à la refonte de Découvrir
// de cette session, jamais mis à jour depuis que cette fonctionnalité a
// elle-même été retirée. L'arène de duels générale (#duel-arena, testée
// ci-dessous) est la seule mécanique de duel qui existe réellement.

test('le departage privilegie deux films de meme note jamais affrontes', async ({ page }) => {
  // 2 films a 8.0, 2 films a des notes uniques : la paire proposee doit etre les deux 8.0
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seed([
    { title: 'Huit Un', score: '8.0' }, { title: 'Huit Deux', score: '8.0' },
    { title: 'Trois', score: '3.0' }, { title: 'Dix', score: '10.0' },
  ]));
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('#duel-arena .duel-side');

  const titles = await page.locator('#duel-arena .duel-title').allTextContents();
  expect(titles.sort()).toEqual(['Huit Deux', 'Huit Un']);
});

test('chercher "199" dans l\'historique filtre par decennie 1990', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seed([
    { title: 'Pulp Fiction', year: '1994' }, { title: 'Seven', year: '1995' },
    { title: 'Dune', year: '2021' },
  ]));
  await page.goto('/');
  await page.click('#nav-history');
  await page.fill('#history-search', '199');
  await page.waitForTimeout(300);

  const visible = await page.locator('.hist-item').count();
  expect(visible).toBe(2);
  const titles = await page.locator('.hist-item .hist-title').allTextContents();
  expect(titles.join(' ')).not.toContain('Dune');
});

test('le badge hors-ligne apparait quand le reseau tombe', async ({ page, context }) => {
  await page.goto('/');
  const badge = page.locator('#offline-badge');
  expect(await badge.evaluate(el => el.classList.contains('visible'))).toBe(false);

  await context.setOffline(true);
  await page.waitForTimeout(200);
  expect(await badge.evaluate(el => el.classList.contains('visible'))).toBe(true);

  await context.setOffline(false);
  await page.waitForTimeout(200);
  expect(await badge.evaluate(el => el.classList.contains('visible'))).toBe(false);
});
