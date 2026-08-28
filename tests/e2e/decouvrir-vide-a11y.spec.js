const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Extrait de phase3-ui-fixes.spec.js (renommage par comportement, phase 6
// de l'audit). Ce test vérifiait à l'origine les 8 puces .theme-chip
// (Braquage, etc.) et l'ouverture de leur fiche. fa0caea a retiré
// #theme-chips-row d'index.html en vidant l'écran Découvrir — vérifié : le
// conteneur est absent sur origin/main aussi. renderThemeChips() et
// openThemeSheet() survivent dans src/15-curated-lists.js mais ne peuvent
// plus rien remplir (la fonction sort tout de suite, faute de conteneur).
//
// Ce que l'écran propose aujourd'hui est couvert par
// bascule-films-series-transitions.spec.js ("Decouvrir est utilisable des
// l'installation") et trending-carousel.spec.js — mais aucun des deux ne
// scanne l'accessibilité. C'est ce que cette boucle continue de garder,
// sur l'écran Découvrir vide (aucune donnée locale), volontairement
// distinct de accessibility.spec.js qui seed un état riche par principe
// (son propre commentaire explique pourquoi) et ne couvre pas Découvrir.
for (const theme of ['dark', 'light']) {
  test(`a11y Decouvrir (etat vide) - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-discover');
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
