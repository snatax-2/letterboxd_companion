const { test, expect } = require('@playwright/test');
test('flux complet du module analyse : ecrire, envoyer, recevoir, garder une trace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?id=767', route => route.fulfill({ json: {
    id: 767, title: 'Evil Dead', poster_path: '/p.jpg', release_date: '1981-04-15',
    overview: 'Synopsis.', genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
  } }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
  await page.route('**/api/analyse-film', route => route.fulfill({ json: { retour: {
    synthese: 'Une analyse technique solide mais qui gagnerait a creuser le sous-texte.',
    pointsForts: ['Bonne observation du cadrage claustrophobe', 'Analyse precise du montage nerveux'],
    anglesMorts: ['Le son est peu evoque', 'Le sujet reel du film reste peu explore'],
    questions: ['Que represente la foret dans ce recit ?', 'Comment le found footage sert-il le propos ?'],
  } } }));

  await page.goto('/');
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('#analysis-technique');

  await page.fill('#analysis-technique', 'Le cadrage est tres serre, creant une sensation de claustrophobie.');
  await page.fill('#analysis-theme', 'Le film semble parler de la peur de la nature.');
  await page.click('#analysis-submit-btn');

  await page.waitForSelector('.analysis-entry');
  const synthese = await page.locator('.analysis-synthese').first().textContent();
  console.log('synthese affichee:', synthese);
  await expect(page.locator('.analysis-retour-group')).toHaveCount(3);

  const techniqueValue = await page.locator('#analysis-technique').inputValue();
  console.log('champ technique vide apres envoi:', techniqueValue === '');

  // Recharge la fiche : l'analyse doit etre conservee (stockage local)
  await page.evaluate(() => closeMovieDetailSheet());
  await page.evaluate(() => openMovieDetailSheet(767));
  await page.waitForSelector('.analysis-entry');
  const entryCount = await page.locator('.analysis-entry').count();
  console.log('analyse toujours presente apres reouverture:', entryCount);
});
