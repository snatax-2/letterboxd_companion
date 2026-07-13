// Accueil nouvel utilisateur — ne s'affiche qu'à un vrai premier lancement
// (historique et watchlists vides), se parcourt en plusieurs étapes, et ne
// revient plus une fois vu.
const { test, expect } = require('@playwright/test');

test('un nouvel utilisateur (aucune donnée) voit l\'accueil, qui se parcourt et disparaît définitivement', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#onboarding-modal.open', { timeout: 3000 });

  await expect(page.locator('.onboarding-slide').nth(0)).toHaveClass(/active/);

  await page.click('#onboarding-next-btn');
  await expect(page.locator('.onboarding-slide').nth(1)).toHaveClass(/active/);
  await page.click('#onboarding-next-btn');
  await expect(page.locator('.onboarding-slide').nth(2)).toHaveClass(/active/);
  await page.click('#onboarding-next-btn');
  await expect(page.locator('.onboarding-slide').nth(3)).toHaveClass(/active/);
  // Sur la dernière diapositive, le bouton devient "Commencer".
  await expect(page.locator('#onboarding-next-btn')).toHaveText('Commencer');
  await page.click('#onboarding-next-btn');

  await expect(page.locator('#onboarding-modal')).not.toHaveClass(/open/);

  // Un rechargement ne doit plus jamais le montrer.
  await page.reload();
  await page.waitForTimeout(1600);
  await expect(page.locator('#onboarding-modal')).not.toHaveClass(/open/);
});

test('le bouton "Passer" ferme aussi l\'accueil définitivement', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#onboarding-modal.open', { timeout: 3000 });
  await page.click('#onboarding-skip-btn');
  await expect(page.locator('#onboarding-modal')).not.toHaveClass(/open/);

  await page.reload();
  await page.waitForTimeout(1600);
  await expect(page.locator('#onboarding-modal')).not.toHaveClass(/open/);
});

test('un utilisateur avec déjà des films dans l\'historique ne voit PAS l\'accueil', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Existant', tmdbId: '1', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(1600);
  await expect(page.locator('#onboarding-modal')).not.toHaveClass(/open/);
});
