const { test, expect } = require('@playwright/test');

const TRENDING = { results: [
  { id: 42, title: 'Film Mystère', poster_path: '/poster.jpg', vote_average: 7.5 },
] };
const DETAIL = {
  id: 42, title: 'Film Mystère', original_title: 'Mystery Movie', release_date: '2015-06-01',
  poster_path: '/poster.jpg', genres: [{ id: 1, name: 'Thriller' }],
  budget: 1000000, revenue: 5000000, tagline: 'Une tagline.',
  credits: { crew: [{ job: 'Director', name: 'Réal Isateur' }], cast: [{ name: 'Act Rice' }] },
  vote_average: 7.2, runtime: 110,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  // dailyPick/weeklyRelease (pas trending=true, plus utilise par Film du Jour
  // depuis la correction du tirage elargi) — mock les DEUX endpoints possibles
  // pour rester correct quel que soit le jour reel ou tourne ce test.
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: TRENDING.results[0] } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: TRENDING.results[0] } }));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: null } }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('etat initial : affiche tres floutee, essai 1/5, pas d\'indice encore', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await expect(page.locator('.guess-attempts')).toContainText('1/5');
  const filter = await page.locator('.guess-poster').evaluate(el => getComputedStyle(el).filter);
  expect(filter).toContain('blur(22px)');
  await expect(page.locator('.guess-hints')).toHaveCount(0);
});

test('une mauvaise reponse reduit le flou et avance le compteur d\'essai', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Un mauvais titre');
  await page.click('.guess-submit-btn');
  await page.waitForTimeout(200);

  await expect(page.locator('.guess-attempts')).toContainText('2/5');
  const filter = await page.locator('.guess-poster').evaluate(el => getComputedStyle(el).filter);
  expect(filter).toContain('blur(16px)');
});

test('l\'indice annee apparait au 3e essai, le genre au 5e', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  for (let i = 0; i < 2; i++) {
    await page.fill('#guess-input', 'faux');
    await page.click('.guess-submit-btn');
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.guess-hints')).toContainText('2015');
  await expect(page.locator('.guess-hints')).not.toContainText('Thriller');

  for (let i = 0; i < 2; i++) {
    await page.fill('#guess-input', 'faux');
    await page.click('.guess-submit-btn');
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.guess-hints')).toContainText('Thriller');
});

test('trouver le bon titre (accents/majuscules ignores) gagne et incremente la serie', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'FILM mystere');
  await page.click('.guess-submit-btn');
  await page.waitForTimeout(200);

  await expect(page.locator('.guess-result.guess-won')).toContainText('Trouvé en 1 essai');
  const filter = await page.locator('.guess-poster').evaluate(el => getComputedStyle(el).filter);
  expect(filter).toContain('blur(0px)');
  await expect(page.locator('#guess-streak-badge')).toContainText('1');

  const streak = await page.evaluate(() => localStorage.getItem('lbx_guess_streak'));
  expect(streak).toBe('1');
});

test('le titre original (VO) est aussi accepte comme bonne reponse', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.fill('#guess-input', 'Mystery Movie');
  await page.click('.guess-submit-btn');
  await page.waitForTimeout(200);
  await expect(page.locator('.guess-result.guess-won')).toBeVisible();
});

test('epuiser les 5 essais revele le film en defaite, remet la serie a zero', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_guess_streak', '3'));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  for (let i = 0; i < 5; i++) {
    await page.fill('#guess-input', 'toujours faux');
    await page.click('.guess-submit-btn');
    await page.waitForTimeout(150);
  }

  await expect(page.locator('.guess-result.guess-lost')).toContainText('Film Mystère');
  const filter = await page.locator('.guess-poster').evaluate(el => getComputedStyle(el).filter);
  expect(filter).toContain('blur(0px)');
  await expect(page.locator('.guess-form')).toHaveCount(0);

  const streak = await page.evaluate(() => localStorage.getItem('lbx_guess_streak'));
  expect(streak).toBe('0');
});

test('une fois joue, l\'etat "deja joue" persiste apres rechargement de la page', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Mystère');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.guess-result.guess-won');

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-result');
  await expect(page.locator('.guess-result.guess-won')).toBeVisible();
  await expect(page.locator('.guess-form')).toHaveCount(0);
});
