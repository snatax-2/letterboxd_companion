const { test, expect } = require('@playwright/test');

// Extrait de tv-shows-phase1.spec.js (renommage par comportement, phase 6
// de l'audit) — largeurs des 4 onglets normaux de la barre de navigation
// (min-width:0 manquant faisait deborder "Historique"/"Decouvrir" et
// ecrasait "A voir" sur 2 lignes, cassant la symetrie autour du bouton
// Noter — signale par l'utilisateur, confirme visuellement avant fix). Pas
// spécifique aux séries : déplacé ici pour un nom de fichier fidèle.

test('nav bar : les 4 onglets normaux ont une largeur strictement egale, sur 6 themes', async ({ page }) => {
  // Six chargements de page complets dans un seul test. Précision importante :
  // ce test PASSE sur le CI dans les 30s par défaut — il n'est pas dans la
  // liste d'échecs du run. Il expire en revanche sur un environnement au
  // réseau lent, parce que page.goto attend l'événement `load`, lequel attend
  // la feuille de style Google Fonts injectée par loadThemeFonts(). Mesuré
  // dans un tel environnement : goto = 13 429 ms avec les polices, 192 ms en
  // les bloquant. Six goto suffisent alors à dépasser le budget.
  //
  // Le budget est donc élargi pour la robustesse hors CI, pas pour masquer un
  // échec : l'assertion est inchangée, et un vrai déséquilibre de largeur la
  // ferait toujours échouer.
  test.setTimeout(90_000);
  for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
    await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
    await page.goto('/');
    await page.waitForTimeout(300);
    const widths = await page.evaluate(() => Array.from(document.querySelectorAll('.nav-btn:not(.nav-btn-primary)')).map(el => Math.round(el.getBoundingClientRect().width)));
    expect(Math.max(...widths) - Math.min(...widths), `theme ${theme}: ${JSON.stringify(widths)}`).toBeLessThan(3);
  }
});
