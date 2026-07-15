const { test, expect } = require('@playwright/test');

test('la carte Ton profil ET les cartes decouverte (heatmap, decennies, il y a un an) se remplissent', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Vieux Film', year: '1975', score: '8.0', mode: 'quick', values: { quick: 4 }, date: yearAgo, savedAt: '2025-07-15T10:00:00.000Z', runtime: '120 min' },
      { title: 'Film Recent', year: '2024', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-10', savedAt: '2026-07-10T10:00:00.000Z', runtime: '95 min' },
    ]));
  });
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForTimeout(500);

  // Carte "Ton profil" (celle qui etait silencieusement cassee par le doublon de fonction)
  await expect(page.locator('#profile-member-since')).not.toHaveText('—');
  await expect(page.locator('#profile-watch-time')).not.toHaveText('—');

  // Heatmap : des cellules rendues, dont au moins une active
  const cellCount = await page.locator('.heatmap-cell').count();
  expect(cellCount).toBeGreaterThan(300); // ~365 jours + la legende
  const activeCells = await page.locator('.heatmap-cell.l1, .heatmap-cell.l2, .heatmap-cell.l3').count();
  expect(activeCells).toBeGreaterThanOrEqual(2); // les 2 films + cellules de legende

  // Decennies : 1970 et 2020 presentes
  await expect(page.locator('#decades-card')).toBeVisible();
  const decadesText = await page.locator('#decades-list').textContent();
  expect(decadesText).toContain('1970');
  expect(decadesText).toContain('2020');

  // Il y a un an : le film vu a la meme date l'an dernier
  await expect(page.locator('#year-ago-card')).toBeVisible();
  await expect(page.locator('#year-ago-card')).toContainText('Vieux Film');
});
