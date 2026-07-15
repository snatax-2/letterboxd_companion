const { test, expect } = require('@playwright/test');

function seedHistory(n) {
  return JSON.stringify(Array.from({ length: n }, (_, i) => ({
    title: 'Film ' + String.fromCharCode(65 + i), tmdbId: String(i + 1), score: '7.0',
    mode: 'quick', values: { quick: 3.5 }, date: '2026-01-0' + ((i % 9) + 1),
    savedAt: '2026-01-01T10:00:0' + i + '.000Z',
  })));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('un duel se joue : choisir un film met a jour les cotes et propose une nouvelle paire', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seedHistory(4));
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('.duel-side');

  const firstPairTitles = await page.locator('.duel-title').allTextContents();
  expect(firstPairTitles.length).toBe(2);

  await page.locator('.duel-side').first().click();
  await page.waitForTimeout(600); // temps du feedback + nouvelle paire

  const duels = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_duels')));
  expect(duels.totalDuels).toBe(1);
  const ratings = Object.values(duels.ratings);
  expect(ratings.length).toBe(2);
  // Une cote au-dessus de 1200, une en dessous (symetrie)
  const elos = ratings.map(r => r.elo).sort((a, b) => a - b);
  expect(elos[0]).toBeLessThan(1200);
  expect(elos[1]).toBeGreaterThan(1200);

  // Compteur affiché
  await expect(page.locator('#duel-counter')).toContainText('1 duel');
});

test('passer un duel change la paire sans toucher aux cotes', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seedHistory(6));
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('.duel-side');

  await page.click('#duel-skip-btn');
  await page.waitForTimeout(200);
  const duels = await page.evaluate(() => localStorage.getItem('lbx_duels'));
  expect(duels).toBeNull(); // rien n'a ete enregistre
});

test('avec moins de 2 films, message explicite au lieu de l\'arene', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seedHistory(1));
  await page.goto('/');
  await page.click('#nav-profile');
  await expect(page.locator('#duel-empty')).toBeVisible();
  await expect(page.locator('#duel-empty')).toContainText('au moins 2 films');
});

test('le classement apparait apres 3 duels du meme film', async ({ page }) => {
  await page.addInitScript((h) => localStorage.setItem('lbx_v2', h), seedHistory(2));
  // Pre-seed : Film A a deja gagne 3 duels contre Film B
  await page.addInitScript(() => {
    localStorage.setItem('lbx_duels', JSON.stringify({
      ratings: {
        'film a|': { elo: 1245, duels: 3 },
        'film b|': { elo: 1155, duels: 3 },
      },
      totalDuels: 3,
    }));
  });
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('.duel-rank-row');

  const rows = await page.locator('.duel-rank-title').allTextContents();
  expect(rows[0]).toBe('Film A'); // le mieux cote en premier
  await expect(page.locator('.duel-rank-pos').first()).toContainText('🥇');
});
