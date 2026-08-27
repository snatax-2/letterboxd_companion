const { test, expect } = require('@playwright/test');

// Wordmark de l'en-tête et migration du nom d'application.
//
// #main-app-title n'est pas un libellé figé : c'est un RÉGLAGE utilisateur
// (champ « Nom de l'application », stocké dans lbx_settings.appName). Faire
// passer le titre par défaut de « Ludex Rating Companion » au wordmark LUDeX
// touche donc à une préférence — d'où une migration qui ne remplace QUE la
// valeur correspondant exactement à l'ancien défaut.
//
// Ces tests couvrent les trois cas qui comptent : le nouveau venu, celui qui
// n'a jamais personnalisé, et celui qui l'a fait.

async function ouvrir(page, settings) {
  await page.addInitScript((s) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    if (s) localStorage.setItem('lbx_settings', JSON.stringify(s));
  }, settings);
  await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
  await page.route('**fonts.googleapis.com**', r => r.abort());
  await page.route('**fonts.gstatic.com**', r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1200);
}

test('nouvel utilisateur : le wordmark composé est le titre par défaut', async ({ page }) => {
  await ouvrir(page, null);
  const titre = page.locator('#main-app-title');
  await expect(titre).toHaveText('LUDeX');
  // La lettre italique est un élément à part : c'est ce qui permet de lui
  // donner le serif sans toucher au reste du mot.
  await expect(titre.locator('em')).toHaveText('e');
});

test("ancien utilisateur jamais personnalisé : son titre est migré", async ({ page }) => {
  await ouvrir(page, { appName: '<em>Ludex</em> Rating Companion', theme: 'ludex-dark' });
  await expect(page.locator('#main-app-title')).toHaveText('LUDeX');
  const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings')).appName);
  expect(stocke).toBe('LUD<em>e</em>X');
});

test('nom personnalisé : jamais écrasé par la migration', async ({ page }) => {
  await ouvrir(page, { appName: '<em>Ma</em> Cinémathèque', theme: 'ludex-dark' });
  await expect(page.locator('#main-app-title')).toHaveText('Ma Cinémathèque');
  const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_settings')).appName);
  expect(stocke, 'un nom choisi par l\'utilisateur doit rester intact').toBe('<em>Ma</em> Cinémathèque');
});

test('le wordmark survit à un aller-retour dans Réglages', async ({ page }) => {
  await ouvrir(page, null);
  // Ouvrir les Réglages et sauvegarder SANS rien changer : la sauvegarde
  // re-dérive le balisage depuis le champ texte (premier mot en italique).
  // Sans garde, le wordmark composé devenait un LUDEX entièrement italique.
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');
  await expect(page.locator('#setting-app-name')).toHaveValue('LUDeX');
  await page.click('#settings-save');
  await page.waitForTimeout(400);

  await expect(page.locator('#main-app-title')).toHaveText('LUDeX');
  await expect(page.locator('#main-app-title em')).toHaveText('e');
});

test('un nom personnalisé saisi dans Réglages garde le traitement générique', async ({ page }) => {
  await ouvrir(page, null);
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');
  await page.fill('#setting-app-name', 'Ma Cinémathèque');
  await page.click('#settings-save');
  await page.waitForTimeout(400);

  await expect(page.locator('#main-app-title')).toHaveText('Ma Cinémathèque');
  await expect(page.locator('#main-app-title em'), 'le premier mot reste mis en avant').toHaveText('Ma');
});

test("le « e » du wordmark reste minuscule et en serif", async ({ page }) => {
  await ouvrir(page, null);
  const styles = await page.locator('#main-app-title em').evaluate(el => {
    const cs = getComputedStyle(el);
    return { transform: cs.textTransform, style: cs.fontStyle, famille: cs.fontFamily };
  });
  // .app-title met tout en capitales : sans annulation explicite, le « e »
  // deviendrait un « E » et la composition perdrait tout son sens.
  expect(styles.transform).toBe('none');
  expect(styles.style).toBe('italic');
  expect(styles.famille).toContain('Playfair');
});
