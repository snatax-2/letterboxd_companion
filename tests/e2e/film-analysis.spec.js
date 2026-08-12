const { test, expect } = require('@playwright/test');

// Module Analyse de film — verifie la boucle complete (ecrire -> envoyer ->
// recevoir un retour structure -> garder une trace en stockage local), la
// validation cote client, et que le message d'erreur precis du serveur
// atteint bien l'utilisateur (pas un "verifie ta connexion" generique).

const DETAIL = {
  id: 767, title: 'Evil Dead', poster_path: '/p.jpg', release_date: '1981-04-15',
  overview: 'Synopsis.', genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
};
const RETOUR = {
  synthese: 'Une analyse technique solide mais qui gagnerait a creuser le sous-texte.',
  pointsForts: ['Bonne observation du cadrage claustrophobe', 'Analyse precise du montage nerveux'],
  anglesMorts: ['Le son est peu evoque', 'Le sujet reel du film reste peu explore'],
  questions: ['Que represente la foret dans ce recit ?', 'Comment le found footage sert-il le propos ?'],
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?id=767', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('flux complet : ecrire, envoyer, recevoir un retour structure, garder une trace', async ({ page }) => {
  await page.route('**/api/analyse-film', route => route.fulfill({ json: { retour: RETOUR } }));

  await page.goto('/');
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('#analysis-technique');

  await page.fill('#analysis-technique', 'Le cadrage est tres serre, creant une sensation de claustrophobie.');
  await page.fill('#analysis-theme', 'Le film semble parler de la peur de la nature.');
  await page.click('#analysis-submit-btn');

  await page.waitForSelector('.analysis-entry');
  await expect(page.locator('.analysis-synthese').first()).toContainText('analyse technique solide');
  await expect(page.locator('.analysis-retour-group')).toHaveCount(3);

  // Champs vides apres envoi, pour ecrire une nouvelle analyse tout de suite
  await expect(page.locator('#analysis-technique')).toHaveValue('');
  await expect(page.locator('#analysis-theme')).toHaveValue('');

  // Persistance : toujours la apres fermeture/reouverture de la fiche
  await page.evaluate(() => closeMovieDetailSheet());
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('.analysis-entry');
  await expect(page.locator('.analysis-entry')).toHaveCount(1);
});

test('validation cote client : champs vides bloques avant tout appel reseau', async ({ page }) => {
  let apiCalled = false;
  await page.route('**/api/analyse-film', route => { apiCalled = true; return route.fulfill({ json: { retour: RETOUR } }); });

  await page.goto('/');
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('#analysis-technique');
  await page.click('#analysis-submit-btn');
  await page.waitForTimeout(300);

  await expect(page.locator('#analysis-error')).toBeVisible();
  expect(apiCalled).toBe(false);
});

test('message d\'erreur precis du serveur atteint l\'utilisateur (pas un message generique)', async ({ page }) => {
  await page.route('**/api/analyse-film', route => route.fulfill({
    status: 503, json: { error: "L'analyse par IA n'est pas encore configurée (clé Gemini manquante)." },
  }));

  await page.goto('/');
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('#analysis-technique');
  await page.fill('#analysis-technique', 'Un texte quelconque.');
  await page.click('#analysis-submit-btn');

  await page.waitForSelector('#analysis-error:visible');
  await expect(page.locator('#analysis-error')).toContainText('clé Gemini manquante');
  await expect(page.locator('.analysis-entry')).toHaveCount(0);
});
