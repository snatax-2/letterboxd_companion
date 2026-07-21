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
  // Une fois revele, la fiche utilise .fdj-poster (jamais floutee) — le
  // mecanisme de flou n'a plus lieu d'etre a ce stade, .guess-poster n'existe
  // plus du tout apres resolution (fusionne dans la fiche complete).
  await expect(page.locator('.fdj-poster')).toBeVisible();
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
  await expect(page.locator('.fdj-poster')).toBeVisible();
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

test('pendant la devinette, ni anecdote/faits ni plateformes ne sont visibles (evite de spoiler)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await expect(page.locator('.fdj-anecdote')).toHaveCount(0);
  await expect(page.locator('.fdj-facts')).toHaveCount(0);
  await expect(page.locator('#fdj-providers')).toHaveCount(0);
  await expect(page.locator('.fdj-film-title')).toHaveCount(0);
});

test('apres une victoire, les faits TMDb (repli) et les plateformes apparaissent avec le resultat', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Mystère');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('.guess-result.guess-won')).toBeVisible();
  await expect(page.locator('.fdj-film-title')).toContainText('Film Mystère');
  await expect(page.locator('.fdj-facts li').first()).toBeVisible();
  await expect(page.locator('#fdj-providers')).toBeVisible();
});

test('apres une defaite, la fiche complete se revele aussi (pas seulement le titre correct)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  for (let i = 0; i < 5; i++) {
    await page.fill('#guess-input', 'toujours faux');
    await page.click('.guess-submit-btn');
    await page.waitForTimeout(150);
  }

  await expect(page.locator('.guess-result.guess-lost')).toBeVisible();
  await expect(page.locator('.fdj-film-title')).toContainText('Film Mystère');
  await expect(page.locator('.fdj-facts li').first()).toBeVisible();
});

test('une seule carte affichee (plus de section separee en double)', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  const cardCount = await page.locator('.fdj-card').count();
  expect(cardCount).toBe(1);
  const oldSeparateSection = await page.locator('#guess-game-wrap').count();
  expect(oldSeparateSection).toBe(0);
});
