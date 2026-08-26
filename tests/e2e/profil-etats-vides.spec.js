const { test, expect } = require('@playwright/test');

test('radar vide ne reserve plus 160px, se replie proprement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);

  const containerBox = await page.locator('#radar-chart-container').boundingBox();
  console.log('radar-chart-container vide:', JSON.stringify(containerBox));
  expect(containerBox.height).toBeLessThan(20);
});

test('radar reprend sa hauteur normale une fois des notes detaillees presentes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'detail',
        values: { scenario: '8', realisation: '7', photo: '8', acteurs: '7', ambiance: '8', rythme: '7', affect: '8' },
        date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  const containerBox = await page.locator('#radar-chart-container').boundingBox();
  console.log('radar-chart-container avec donnees:', JSON.stringify(containerBox));
  expect(containerBox.height).toBeGreaterThanOrEqual(150);
  await expect(page.locator('#radar-chart-container svg')).toBeVisible();
});

// ── LE BLOC A CHANGÉ, PAS LA GARANTIE ───────────────────────────────────
// Ces deux tests portaient sur "Distribution des notes" (#histogram, ses 10
// tranches .histo-row), retiré en Ludex 2.0 avec "Top Réalisateurs" et
// remplacé par "Activité mensuelle".
//
// Ce que le remplaçant avait perdu au passage : mesuré sur un profil vierge,
// il affichait 6 mois × 2 barres à zéro sur 191px de haut — exactement le
// défaut pour lequel l'histogramme avait été corrigé, et le seul des quatre
// encarts du tableau de bord sans message (radar, trophées et duels ont le
// leur). Un état vide lui a été ajouté ; ces tests le gardent.
test('activite mensuelle affiche un message au lieu de barres a zero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('.month-chart-bar')).toHaveCount(0);
  const text = await page.locator('#monthly-activity-chart').textContent();
  expect(text).toContain('Note quelques films');
  // Et il reste compact, comme les trois autres encarts vides.
  const box = await page.locator('#monthly-activity-chart').boundingBox();
  expect(box.height).toBeLessThan(80);
});

test('activite mensuelle revient a l\'affichage normal des que des notes existent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    // Le graphe ne couvre que les 6 DERNIERS mois : une date en dur finirait
    // par en sortir et ferait rougir ce test des mois plus tard, pour une
    // raison sans rapport avec ce qu'il vérifie. On note donc "aujourd'hui".
    const aujourdhui = new Date().toISOString().slice(0, 10);
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: aujourdhui, savedAt: new Date().toISOString() },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  // 6 mois x 2 barres (films + séries) = 12 dès qu'il y a une note.
  await expect(page.locator('.month-chart-bar')).toHaveCount(12);
});

test('bouton telecharger desactive quand la carte de profil est verrouillee', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('#profile-share-btn')).toBeDisabled();
});

test('bouton telecharger actif des qu\'il y a au moins un film note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);
  await expect(page.locator('#profile-share-btn')).toBeEnabled();
});
const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  // Corrigé lors de la fusion (phase 6 de l'audit) : cette boucle ne faisait
  // auparavant que console.log les violations sans jamais les faire échouer
  // (aucun expect()) — un test qui passait toujours, quel que soit le
  // résultat réel. Volontairement distinct de accessibility.spec.js, qui
  // seed un état RICHE (son propre commentaire explique pourquoi) : ici
  // c'est justement le Profil VIDE, sur lequel vivent les correctifs
  // ci-dessus, qui est scanné.
  test(`a11y profil vide - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-profile');
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}

// ── Fusionné depuis phase3-ui-fixes.spec.js (renommage par comportement,
// phase 6 de l'audit) ────────────────────────────────────────────────────
// "Top Réalisateurs" (#top-directors-list) et "Distribution des notes"
// (#histogram) ont été retirés en Ludex 2.0, avec la classe
// .empty-state-compact qui les habillait — plus rien de tout ça n'existe.
//
// Ce que ces deux tests protègent reste valable et vérifiable sur les
// encarts actuels : sur un profil vierge, chacun affiche un message utile
// plutôt qu'un cadre vide ou une série de zéros. Les quatre y sont — le
// radar, l'activité mensuelle, les trophées et les duels. (L'activité
// mensuelle n'en avait pas : elle affichait 6 mois de barres à zéro,
// exactement ce que ce test interdisait à l'histogramme. Corrigé, voir
// renderMonthlyActivityChart.)

test('etats vides compacts (Profil) toujours corrects apres migration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-profile');
  await page.waitForTimeout(600);

  for (const [selecteur, extrait] of [
    ['#radar-empty', 'mode Détaillé'], // le message vit à côté du conteneur, qui se replie à 0 quand il est vide
    ['#monthly-activity-chart', 'Note quelques films'],
  ]) {
    const texte = await page.locator(selecteur).textContent();
    expect(texte, `encart ${selecteur}`).toContain(extrait);
  }
  await expect(page.locator('.trophy-empty')).toContainText('Note quelques films');
});

test('les etats vides riches (deja fonctionnels) restent inchanges', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await expect(page.locator('#empty-state-history-cta')).toBeVisible();
  await expect(page.locator('.empty-state-icon').first()).toBeVisible();
  await page.click('#empty-state-history-cta');
  await page.waitForTimeout(400);
  await expect(page.locator('#movie-search')).toBeFocused();
});
