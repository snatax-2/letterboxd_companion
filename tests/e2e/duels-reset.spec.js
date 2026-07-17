const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A', year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
      { title: 'Film B', year: '2021', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-02', savedAt: '2026-07-02T10:00:00.000Z' },
    ]));
    localStorage.setItem('lbx_duels', JSON.stringify({
      ratings: { 'film a|2020': { elo: 1250, duels: 3 }, 'film b|2021': { elo: 1150, duels: 3 } },
      totalDuels: 3,
      pairs: { 'film a|2020||film b|2021': true },
    }));
    localStorage.setItem('lbx_daily_duel_date', new Date().toISOString().slice(0, 10));
  });
});

test('reinitialiser les duels efface le classement mais laisse films et notes intacts', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#reset-duels-btn');
  await page.click('#reset-duels-btn');

  // Modale de confirmation obligatoire pour une action destructive
  await page.waitForSelector('#modal.open');
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);

  const duels = await page.evaluate(() => localStorage.getItem('lbx_duels'));
  expect(duels).toBeNull();
  const dailyDate = await page.evaluate(() => localStorage.getItem('lbx_daily_duel_date'));
  expect(dailyDate).toBeNull();

  // Films et notes intacts
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(history.length).toBe(2);
  expect(history[0].score).toBe('7.0');
});

test('annuler la confirmation ne touche a rien', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.click('#reset-duels-btn');
  await page.waitForSelector('#modal.open');
  await page.click('#modal-cancel');
  await page.waitForTimeout(200);

  const duels = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_duels')));
  expect(duels.totalDuels).toBe(3); // rien effacé
});
