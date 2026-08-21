// Ludex 2.0 : la refonte de Découvrir (voir
// Ludex_Specifications_Decouverte.pdf) retire les bascules Quiz, Tendances
// et Recommandations Découvrir — ces fonctionnalités n'existent plus, donc
// plus rien à activer/désactiver pour elles. Duels est la seule bascule
// restante (voir 00e-feature-flags.js), et vit désormais entièrement dans
// Profil (arène + classement dans la même carte #duels-card) : plus besoin
// de vérifier séparément l'arène côté Découvrir, la masquer masque tout.
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

test('desactiver les Duels masque l\'arene et le classement (meme carte, Profil), sans toucher aux donnees stockees', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await expect(page.locator('#duels-card')).toBeVisible();

  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-duels) .settings-toggle-slider').click();
  await page.click('#settings-cancel'); // ferme sans "annuler" les toggles (deja sauves au changement)
  await page.waitForTimeout(200);

  await expect(page.locator('#duels-card')).toBeHidden();

  // Les donnees de classement restent intactes en arriere-plan
  const duels = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_duels')));
  expect(duels.totalDuels).toBe(3);
});

test('reactiver Duels le fait immediatement reapparaitre, sans recharger', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_features', JSON.stringify({ duels: false }));
  });
  await page.goto('/');
  await page.click('#nav-profile');
  await expect(page.locator('#duels-card')).toBeHidden();

  await page.click('#settings-btn');
  await page.locator('label:has(#setting-feature-duels) .settings-toggle-slider').click();
  await page.click('#settings-cancel');
  await page.waitForTimeout(300);

  await expect(page.locator('#duels-card')).toBeVisible();
  await expect(page.locator('.duel-side').first()).toBeVisible();
});
