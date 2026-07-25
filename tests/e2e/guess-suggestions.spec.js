const { test, expect } = require('@playwright/test');

const DETAIL = {
  id: 42, title: 'Film Mystère', original_title: 'Film Mystère', release_date: '2015-06-01',
  poster_path: '/poster.jpg', genres: [{ id: 1, name: 'Thriller' }],
  overview: 'Un synopsis suffisamment long pour le test.',
  credits: { crew: [{ job: 'Director', name: 'Réal Isateur' }], cast: [{ name: 'Act Rice' }] },
  vote_average: 7.2,
};
const SEARCH_RESULTS = { results: [
  { id: 42, title: 'Film Mystère', poster_path: '/poster.jpg', release_date: '2015-06-01' },
  { id: 43, title: 'Film Mystique', poster_path: '/other.jpg', release_date: '2018-01-01' },
] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
  await page.route('**/api/search?query=*', route => route.fulfill({ json: SEARCH_RESULTS }));
});

test('taper dans le champ affiche des suggestions texte, sans affiche (anti-spoiler)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Film');
  await page.waitForSelector('.guess-suggestion-item');

  const itemCount = await page.locator('.guess-suggestion-item').count();
  expect(itemCount).toBe(2);
  await expect(page.locator('.guess-suggestion-item').first()).toContainText('Film Mystère');
  await expect(page.locator('.guess-suggestion-item').first()).toContainText('2015');

  // Aucune image nulle part dans la liste de suggestions -- ne doit jamais
  // reveler visuellement l'affiche du bon film pendant la devinette.
  const imgCount = await page.locator('.guess-suggestions img').count();
  expect(imgCount).toBe(0);
});

test('cliquer une suggestion remplit le champ sans soumettre ni spoiler', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Film');
  await page.waitForSelector('.guess-suggestion-item');
  await page.locator('.guess-suggestion-item').first().click();

  const inputValue = await page.locator('#guess-input').inputValue();
  expect(inputValue).toBe('Film Mystère');
  await expect(page.locator('.guess-suggestions')).toBeHidden();
  // Pas encore soumis : toujours en phase de devinette, pas de resultat affiche
  await expect(page.locator('.guess-result')).toHaveCount(0);
});

test('cliquer en dehors ferme les suggestions', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Film');
  await page.waitForSelector('.guess-suggestion-item');
  await page.click('.guess-attempts');
  await expect(page.locator('.guess-suggestions')).toBeHidden();
});

test('moins de 2 caracteres : pas de recherche declenchee', async ({ page }) => {
  let searchCalls = 0;
  await page.route('**/api/search?query=*', route => { searchCalls++; return route.fulfill({ json: SEARCH_RESULTS }); });
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'F');
  await page.waitForTimeout(400);
  expect(searchCalls).toBe(0);
  await expect(page.locator('.guess-suggestions')).toBeHidden();
});

test('choisir une suggestion puis valider fonctionne normalement (gagner)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Film');
  await page.waitForSelector('.guess-suggestion-item');
  await page.locator('.guess-suggestion-item').first().click();
  await page.click('.guess-submit-btn');

  await page.waitForSelector('.guess-result.guess-won');
  await expect(page.locator('.guess-result.guess-won')).toContainText('Trouvé en 1 essai');
});
