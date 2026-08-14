const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Audit UX/design complet — verrouille zero violation d'accessibilite
// serieuse sur les 7 themes, avec une vraie note en mode detaille (pas un
// ecran vide) qui revele des elements que les tests plus etroits ne
// couvraient pas (score-big, criteres detailles, etoiles, bouton
// Sauvegarder...). Verrouille aussi le correctif du champ item.stars non
// protege dans l'Historique.

const THEMES = ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'meridien', 'technicolor'];

for (const theme of THEMES) {
  test(`audit complet : zero violation sur ${theme} (Noter, mode detaille)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_v2', JSON.stringify([
        { title: 'Evil Dead', tmdbId: '767', year: '1981', score: '7.5', mode: 'detailed', values: { detailed: { scenario: 8, realisation: 7, photo: 8, acteurs: 7, ambiance: 8, rythme: 7, affect: 8 } }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '', liked: true },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}

test('historique : item.stars manquant n\'affiche jamais "undefined"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Sans champ stars', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  const fullText = await page.locator('#view-history').textContent();
  expect(fullText).not.toContain('undefined');
});
