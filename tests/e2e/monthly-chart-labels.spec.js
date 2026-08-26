// Bug réel trouvé et corrigé : l'axe du graphique "Activité mensuelle"
// (renderMonthlyActivityChart, src/06c-profile-stats.js) abrégeait les mois
// avec `MONTH_LABELS_FR[i].slice(0, 3)` — un simple tronquage à 3 lettres du
// nom complet. Ça donne "Jui" à la fois pour Juin ET Juillet : les deux
// tronquent identiquement, indiscernables sur l'axe (capture d'écran à
// l'appui avant correction). Remplacé par MONTH_LABELS_FR_ABBR
// (06a-history-list.js), une vraie table d'abréviations distinctes.

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
});

test('la table d\'abreviations des 12 mois n\'a aucun doublon', async ({ page }) => {
  // Test direct sur les données plutôt que sur le rendu : le graphique
  // n'affiche que 6 mois glissants autour de la date du jour, donc une
  // collision Juin/Juillet ne serait visible sur l'écran qu'~8 mois sur 12
  // selon la date d'exécution du test (avr.-oct.) — un filet à éclipses.
  // Vérifier les 12 entrées d'un coup est déterministe, quelle que soit la
  // date d'exécution en CI.
  const abbr = await page.evaluate(() => MONTH_LABELS_FR_ABBR);
  expect(abbr).toHaveLength(12);
  expect(new Set(abbr).size, `abréviations : ${abbr.join(', ')}`).toBe(12);
  // Le cas précis du bug d'origine.
  expect(abbr[5]).not.toBe(abbr[6]); // Juin (index 5) != Juillet (index 6)
});

test('les libelles affiches sur le graphique sont tous distincts', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film', year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 },
        date: new Date().toISOString().slice(0, 10), savedAt: new Date().toISOString() },
    ]));
  });
  await page.reload();
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(900);

  const libelles = await page.locator('.month-chart-label').allTextContents();
  expect(libelles.length).toBe(6);
  expect(new Set(libelles).size, `libellés : ${libelles.join(', ')}`).toBe(6);
});
