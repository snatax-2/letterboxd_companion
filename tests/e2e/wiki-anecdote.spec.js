const { test, expect } = require('@playwright/test');

const TRENDING = { results: [
  { id: 42, title: 'Film Test', poster_path: '/poster.jpg', vote_average: 7.5 },
] };
const DETAIL = {
  id: 42, title: 'Film Test', original_title: 'Test Movie', release_date: '2015-06-01',
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
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('une vraie anecdote Wikipedia s\'affiche avec son attribution, priorite sur les faits TMDb', async ({ page }) => {
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({
    json: { anecdote: 'Le tournage a failli être annulé faute de financement.', url: 'https://fr.wikipedia.org/wiki/Film_Test' },
  }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('.fdj-anecdote-card')).toContainText('failli être annulé');
  await expect(page.locator('.fdj-anecdote-source')).toHaveAttribute('href', 'https://fr.wikipedia.org/wiki/Film_Test');
  await expect(page.locator('.fdj-anecdote-source')).toContainText('Wikipédia');
  // Les faits TMDb restent disponibles dans l'accordeon "Chiffres cles",
  // mais REPLIE par defaut quand une vraie anecdote existe deja (pas absents
  // du DOM : juste pas la premiere chose montree).
  const accordionOpen = await page.locator('.fdj-facts-accordion').evaluate(el => el.open);
  expect(accordionOpen).toBe(false);
});

test('sans anecdote trouvee, repli propre sur les faits TMDb (comportement inchange)', async ({ page }) => {
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: null } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('.fdj-facts li').first()).toBeVisible();
  await expect(page.locator('.fdj-anecdote-card')).toHaveCount(0);
  // L'accordeon s'ouvre automatiquement puisqu'il n'y a rien d'autre a montrer
  const accordionOpen = await page.locator('.fdj-facts-accordion').evaluate(el => el.open);
  expect(accordionOpen).toBe(true);
});

test('l\'anecdote est mise en cache pour la journee (pas de second appel wikipedia)', async ({ page }) => {
  let wikiCalls = 0;
  await page.route('**/api/search?wikianecdote=*', route => {
    wikiCalls++;
    return route.fulfill({ json: { anecdote: 'Une anecdote.', url: 'https://fr.wikipedia.org/wiki/Film_Test' } });
  });
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.fdj-anecdote-card');

  await page.click('#nav-rating');
  await page.click('#nav-discover');
  await page.waitForTimeout(300);

  expect(wikiCalls).toBe(1);
});

test('les deux titres (francais et original) sont envoyes quand ils different, le francais en priorite', async ({ page }) => {
  const DETAIL_TRANSLATED = {
    id: 42, title: 'Le Parrain', original_title: 'The Godfather', release_date: '1972-03-14',
    credits: { crew: [], cast: [] },
  };
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL_TRANSLATED }));

  let capturedUrl = '';
  await page.route('**/api/search?wikianecdote=*', route => {
    capturedUrl = route.request().url();
    return route.fulfill({ json: { anecdote: null } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title, .guess-poster');

  expect(capturedUrl).toContain('wikianecdote=Le+Parrain');
  expect(capturedUrl).toContain('wikititle2=The+Godfather');
});

test('anecdote longue : tronquee a 3 lignes par defaut, "Lire la suite" la deplie completement', async ({ page }) => {
  const LONG = "Le tournage débute le 25 février 2025, avec des prises de vue dans la province de Ouarzazate au Maroc (notamment dans le ksar d'Aït Ben Haddou) jusqu'au 4 mars, pour les scènes situées à Troie. Il se poursuit entre le 10 et 21 mars en Grèce, dans le Péloponnèse (en Messénie : dans la ville de Pylos et ses environs, ainsi que sur le site de l'Acrocorinthe à Corinthe).";
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: LONG, url: 'https://fr.wikipedia.org/wiki/test' } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title, .guess-poster');
  if (await page.locator('.guess-poster').count()) {
    await page.fill('#guess-input', 'Film Test');
    await page.click('.guess-submit-btn');
  }
  await page.waitForSelector('.fdj-anecdote-card');

  const clampedBefore = await page.locator('.fdj-anecdote-text').evaluate(el => el.classList.contains('fdj-anecdote-clamped'));
  expect(clampedBefore).toBe(true);
  await expect(page.locator('.fdj-anecdote-toggle')).toHaveText('Lire la suite');

  await page.click('.fdj-anecdote-toggle');
  const clampedAfter = await page.locator('.fdj-anecdote-text').evaluate(el => el.classList.contains('fdj-anecdote-clamped'));
  expect(clampedAfter).toBe(false);
  await expect(page.locator('.fdj-anecdote-toggle')).toHaveText('Réduire');
});

test('anecdote courte : pas de bouton "Lire la suite" (rien a replier)', async ({ page }) => {
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: 'Une courte anecdote.', url: 'https://fr.wikipedia.org/wiki/test' } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title, .guess-poster');
  if (await page.locator('.guess-poster').count()) {
    await page.fill('#guess-input', 'Film Test');
    await page.click('.guess-submit-btn');
  }
  await page.waitForSelector('.fdj-anecdote-card');
  await expect(page.locator('.fdj-anecdote-toggle')).toHaveCount(0);
});
