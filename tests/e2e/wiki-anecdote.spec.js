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

  await expect(page.locator('.fdj-anecdote')).toContainText('failli être annulé');
  await expect(page.locator('.fdj-anecdote-source')).toHaveAttribute('href', 'https://fr.wikipedia.org/wiki/Film_Test');
  await expect(page.locator('.fdj-anecdote-source')).toContainText('Wikipédia');
  await expect(page.locator('.fdj-facts')).toHaveCount(0); // pas les faits TMDb quand une vraie anecdote existe
});

test('sans anecdote trouvee, repli propre sur les faits TMDb (comportement inchange)', async ({ page }) => {
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: null } }));
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('.fdj-facts li').first()).toBeVisible();
  await expect(page.locator('.fdj-anecdote')).toHaveCount(0);
});

test('l\'anecdote est mise en cache pour la journee (pas de second appel wikipedia)', async ({ page }) => {
  let wikiCalls = 0;
  await page.route('**/api/search?wikianecdote=*', route => {
    wikiCalls++;
    return route.fulfill({ json: { anecdote: 'Une anecdote.', url: 'https://fr.wikipedia.org/wiki/Film_Test' } });
  });
  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.fdj-anecdote');

  await page.click('#nav-rating');
  await page.click('#nav-discover');
  await page.waitForTimeout(300);

  expect(wikiCalls).toBe(1);
});
