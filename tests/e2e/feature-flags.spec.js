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
      pairs: {},
    }));
  });
});

test('desactiver les Duels masque l\'arene ET le duel du jour, sans toucher au classement stocke', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await expect(page.locator('#duels-card')).toBeVisible();

  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-duels) .settings-toggle-slider').click();
  await page.click('#settings-cancel'); // ferme sans "annuler" les toggles (deja sauves au changement)
  await page.waitForTimeout(200);

  await expect(page.locator('#duels-card')).toBeHidden();

  await page.click('#nav-discover');
  await page.waitForTimeout(300);
  await expect(page.locator('#daily-duel-wrap')).toBeHidden();

  // Les donnees de classement restent intactes en arriere-plan
  const duels = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_duels')));
  expect(duels.totalDuels).toBe(3);
});

test('la preference persiste apres rechargement de la page', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-trending) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(200);

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForTimeout(400);
  await expect(page.locator('#trending-carousel-wrap')).toBeHidden();

  const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_features')));
  expect(flags.trending).toBe(false);
});

test('reactiver une fonctionnalite la fait immediatement reapparaitre, sans recharger', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_features', JSON.stringify({ duels: true, quiz: false, trending: true, discoverRecs: true }));
    // Batch de quiz valide en cache : evite l'appel reseau reel (needsRefresh=false),
    // pour que loadDailyQuiz() puisse reussir et reafficher #quiz-wrap.
    localStorage.setItem('lbx_quiz_batch', JSON.stringify([
      { question: 'Question test', correct_answer: 'Bonne reponse', incorrect_answers: ['Mauvaise 1', 'Mauvaise 2', 'Mauvaise 3'] },
    ]));
    localStorage.setItem('lbx_quiz_batch_fetched_day', String(Math.floor(Date.now() / 86400000)));
  });
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForTimeout(300);
  await expect(page.locator('#quiz-wrap')).toBeHidden();

  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-quiz) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(300);

  await expect(page.locator('#quiz-wrap')).toBeVisible();
});

test('desactiver les recommandations Decouvrir masque la pile de suggestions', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-discover-recs) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(200);

  await page.click('#nav-discover');
  await page.waitForTimeout(300);
  await expect(page.locator('.discover-section-tinder')).toBeHidden();
});
