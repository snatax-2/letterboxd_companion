const { test, expect } = require('@playwright/test');

const DETAIL = {
  id: 99, title: 'Film Pioche', original_title: 'Film Pioche', release_date: '2020-03-01',
  poster_path: '/p.jpg', genres: [{ id: 1, name: 'Drame' }],
  credits: { crew: [], cast: [] },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search?id=99', route => route.fulfill({ json: DETAIL }));
  await page.route('**/api/search?wikianecdote=*', route => route.fulfill({ json: { anecdote: null } }));
  await page.route('**/api/search*providers*', route => route.fulfill({ json: { results: {} } }));
});

test('un jour normal (pas mercredi) : titre "Film du jour", tirage elargi (dailyPick), pas les tendances', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-20T09:00:00'));
  let calledEndpoint = '';
  await page.route('**/api/search?dailyPick=*', route => {
    calledEndpoint = 'dailyPick';
    return route.fulfill({ json: { result: DETAIL } });
  });
  await page.route('**/api/search?trending=true', route => route.fulfill({ json: { results: [] } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('#fdj-title')).toHaveText('Film du jour');
  expect(calledEndpoint).toBe('dailyPick');
});

test('le mercredi : titre "Sortie de la semaine", vraies sorties en salle (weeklyRelease)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T09:00:00'));
  let calledEndpoint = '';
  await page.route('**/api/search?weeklyRelease=*', route => {
    calledEndpoint = 'weeklyRelease';
    return route.fulfill({ json: { result: DETAIL } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');

  await expect(page.locator('#fdj-title')).toHaveText('Sortie de la semaine');
  expect(calledEndpoint).toBe('weeklyRelease');
});

test('rechargement (chargement depuis le cache) : ne plante pas, garde le bon titre — c\'est le vrai bug corrige', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T09:00:00'));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');
  await expect(page.locator('#fdj-title')).toHaveText('Sortie de la semaine');

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title');
  await expect(page.locator('#fdj-title')).toHaveText('Sortie de la semaine');

  expect(errors, `Erreurs JS au rechargement : ${errors.join(' | ')}`).toHaveLength(0);
});

test('le jeu et l\'anecdote fonctionnent aussi bien depuis le chemin en cache que le premier chargement', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-20T09:00:00'));
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');
  await expect(page.locator('#fdj-title')).toHaveText('Film du jour');
});
