const { test, expect } = require('@playwright/test');

const DETAIL = {
  id: 42, title: 'Film Test', original_title: 'Film Test', release_date: '2015-06-01',
  poster_path: '/p.jpg', genres: [{ id: 1, name: 'Drame' }], credits: { crew: [], cast: [] },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?id=42', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('anecdote en cache a null : retentee au chargement, affichage mis a jour si trouvee cette fois', async ({ page }) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  await page.addInitScript((today) => {
    localStorage.setItem('lbx_film_du_jour', JSON.stringify({
      date: today,
      movie: { id: 42, title: 'Film Test', original_title: 'Film Test', release_date: '2015-06-01', poster_path: '/p.jpg', genres: [{ id: 1, name: 'Drame' }], credits: { crew: [], cast: [] } },
      anecdote: null,
      isWeekly: false,
    }));
  }, todayKey);

  let wikiCalls = 0;
  await page.route('**/api/search?wikianecdote=*', route => {
    wikiCalls++;
    return route.fulfill({ json: { anecdote: 'Une anecdote trouvee au deuxieme essai.', url: 'https://fr.wikipedia.org/wiki/Film_Test' } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  // La retentative se fait bien au chargement (pas seulement le lendemain)
  await page.waitForFunction(() => (window.localStorage.getItem('lbx_film_du_jour') || '').includes('deuxieme essai'), { timeout: 5000 });
  expect(wikiCalls).toBeGreaterThanOrEqual(1);

  // Gagne pour voir l'anecdote mise a jour s'afficher
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Test');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.fdj-anecdote');
  await expect(page.locator('.fdj-anecdote')).toContainText('deuxieme essai');
});

test('anecdote en cache et trouvee : aucun nouvel appel Wikipedia (comportement inchange)', async ({ page }) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  await page.addInitScript((today) => {
    localStorage.setItem('lbx_film_du_jour', JSON.stringify({
      date: today,
      movie: { id: 42, title: 'Film Test', poster_path: '/p.jpg', release_date: '2015-06-01', credits: { crew: [], cast: [] } },
      anecdote: { anecdote: 'Anecdote deja en cache.', url: 'https://fr.wikipedia.org/wiki/Film_Test' },
      isWeekly: false,
    }));
  }, todayKey);

  let wikiCalls = 0;
  await page.route('**/api/search?wikianecdote=*', route => { wikiCalls++; return route.fulfill({ json: { anecdote: null } }); });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Test');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('.fdj-anecdote');
  await expect(page.locator('.fdj-anecdote')).toContainText('deja en cache');
  expect(wikiCalls).toBe(0);
});

test('bouton "Vider le cache du Film du jour" dans Reglages force une nouvelle recherche', async ({ page }) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  await page.addInitScript((today) => {
    localStorage.setItem('lbx_film_du_jour', JSON.stringify({
      date: today,
      movie: { id: 42, title: 'Film Test', poster_path: '/p.jpg', release_date: '2015-06-01', credits: { crew: [], cast: [] } },
      anecdote: null,
      isWeekly: false,
    }));
  }, todayKey);
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));
  let wikiCalls = 0;
  await page.route('**/api/search?wikianecdote=*', route => {
    wikiCalls++;
    return route.fulfill({ json: { anecdote: 'Anecdote apres vidage du cache.', url: 'https://fr.wikipedia.org/wiki/Film_Test' } });
  });

  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#clear-fdj-cache-btn');
  await page.click('#clear-fdj-cache-btn');
  await page.waitForTimeout(400);

  expect(wikiCalls).toBeGreaterThanOrEqual(1);
  const cached = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_film_du_jour')));
  expect(cached.anecdote.anecdote).toContain('apres vidage');
});
