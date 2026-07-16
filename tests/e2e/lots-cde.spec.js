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

test('le duel du jour se joue une seule fois par jour', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h),
    seed([{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }]));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#daily-duel-wrap[style*="display: block"]', { timeout: 8000 });

  await page.locator('#daily-duel-card .duel-side').first().click();
  await page.waitForTimeout(700);
  await expect(page.locator('#daily-duel-card .quiz-already-played')).toContainText('reviens demain');

  // Un duel a bien ete comptabilise dans le meme systeme que l'arene
  const duels = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_duels')));
  expect(duels.totalDuels).toBe(1);

  // Quitter et revenir : toujours "deja joue"
  await page.click('#nav-rating');
  await page.click('#nav-discover');
  await page.waitForTimeout(300);
  await expect(page.locator('#daily-duel-card .quiz-already-played')).toBeVisible();
});

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

test('duel du jour : message explicite quand toutes les paires ont ete jouees', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seed([{ title: 'A' }, { title: 'B' }]));
  await page.addInitScript(() => {
    // La seule paire possible (A vs B) est deja jouee
    localStorage.setItem('lbx_duels', JSON.stringify({
      ratings: { 'a|2020': { elo: 1216, duels: 1 }, 'b|2020': { elo: 1184, duels: 1 } },
      totalDuels: 1,
      pairs: { 'a|2020||b|2020': true },
    }));
  });
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(500);

  await expect(page.locator('#daily-duel-wrap')).toBeVisible();
  await expect(page.locator('#daily-duel-card')).toContainText('Tous les duels possibles');
});
