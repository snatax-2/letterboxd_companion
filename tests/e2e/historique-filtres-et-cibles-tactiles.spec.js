const { test, expect } = require('@playwright/test');

test('cibles tactiles : zone effective agrandie pour les 4 elements corriges', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'detail',
        values: { scenario: '8', realisation: '7', photo: '8', acteurs: '7', ambiance: '8', rythme: '7', affect: '8' },
        date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  // Polices Google bloquees : ce fichier lance axe-core sur six themes, a
  // ~28s par theme dont une dizaine passees a attendre le <link> injecte par
  // loadThemeFonts. On fraisait le delai de 30s sans rien tester de plus :
  // axe lit des styles CALCULES, la disponibilite d'une webfont n'y change
  // rien.
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);

  // ctx-tag : hauteur reelle augmentee
  const ctxTag = await page.locator('.ctx-tag').first().boundingBox();
  console.log('ctx-tag:', JSON.stringify(ctxTag));
  expect(ctxTag.height).toBeGreaterThan(30);

  // criterion-step-btn : clic 6px au-dessus (dans la zone etendue invisible) doit fonctionner
  await page.click('#weights-toggle');
  await page.waitForTimeout(300);
  const stepBtn = page.locator('.criterion-step-btn[data-step="0.5"]').first();
  // Ouvrir le panneau des pondérations pousse le critère vers le bas : mesuré,
  // le bouton passait de y=970 à y=1440, hors du viewport de 1400. Or
  // mouse.click() travaille en coordonnées de viewport SANS faire défiler —
  // le clic tombait donc dans le vide, et le test concluait à tort que la zone
  // tactile étendue ne marchait plus. On amène le bouton à l'écran, puis on
  // relit sa position.
  await stepBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const stepBox = await stepBtn.boundingBox();
  const before = await page.locator('#scenario').inputValue();
  await page.mouse.click(stepBox.x + stepBox.width / 2, stepBox.y - 6);
  await page.waitForTimeout(200);
  const after = await page.locator('#scenario').inputValue();
  console.log('avant/apres clic 6px au-dessus du bouton +:', before, '->', after);
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));

  // settings-btn : clic 6px a gauche (zone etendue) doit ouvrir les reglages.
  // Remonter d'abord : le scrollIntoViewIfNeeded ci-dessus a fait defiler la
  // page, et l'en-tete n'etait plus dans le viewport — mesuree depuis un
  // en-tete hors ecran, la position servait un clic qui n'atteignait rien.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const settingsBox = await page.locator('#settings-btn').boundingBox();
  await page.mouse.click(settingsBox.x - 6, settingsBox.y + settingsBox.height / 2);
  await page.waitForTimeout(400);
  await expect(page.locator('#settings-modal')).toHaveClass(/open/);

  // filter-btn : hauteur reelle augmentee
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  const filterBtn = await page.locator('.filter-btn').first().boundingBox();
  console.log('filter-btn:', JSON.stringify(filterBtn));
  expect(filterBtn.height).toBeGreaterThan(30);
});

test('filtres de tri caches quand Historique est vide, film ET serie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await expect(page.locator('#filter-row')).toBeHidden();

  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);
  await expect(page.locator('#filter-row')).toBeHidden();
});

test('filtres de tri visibles des qu\'il y a des donnees', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(500);
  await expect(page.locator('#filter-row')).toBeVisible();
});

test('placeholder du champ film ne mentionne plus Twin Peaks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  const placeholder = await page.locator('#movie-search').getAttribute('placeholder');
  console.log('placeholder film:', placeholder);
  expect(placeholder).not.toContain('Twin Peaks');
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
  test(`accessibilite correctifs ux - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_v2', JSON.stringify([
        { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'detail',
          values: { scenario: '8', realisation: '7', photo: '8', acteurs: '7', ambiance: '8', rythme: '7', affect: '8' },
          date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.click('#nav-rating');
    await page.waitForTimeout(1400);
    await page.click('#weights-toggle');
    await page.waitForTimeout(300);
    await page.click('#nav-history');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
