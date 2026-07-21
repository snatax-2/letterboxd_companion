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

// Gagne le jeu de devinette (titre exact) pour atteindre la fiche revelee,
// ou tous les onglets partagent desormais la meme carte fusionnee.
async function winGuess(page) {
  await page.waitForSelector('.guess-poster');
  await page.fill('#guess-input', 'Film Pioche');
  await page.click('.guess-submit-btn');
  await page.waitForSelector('#fdj-card .fdj-film-title');
}

test('pendant la devinette, le titre reste "Devine le Film du Jour" quel que soit le jour', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T09:00:00')); // mercredi
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await expect(page.locator('#fdj-title-text')).toHaveText('Devine le Film du Jour');
});

test('un jour normal (pas mercredi) : apres devinette, titre "Film du jour", tirage elargi (dailyPick)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-20T09:00:00')); // lundi
  let calledEndpoint = '';
  await page.route('**/api/search?dailyPick=*', route => {
    calledEndpoint = 'dailyPick';
    return route.fulfill({ json: { result: DETAIL } });
  });
  await page.route('**/api/search?trending=true', route => route.fulfill({ json: { results: [] } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await winGuess(page);

  await expect(page.locator('#fdj-title-text')).toHaveText('Film du jour');
  expect(calledEndpoint).toBe('dailyPick');
});

test('le mercredi : apres devinette, titre "Sortie de la semaine" (weeklyRelease)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T09:00:00')); // mercredi
  let calledEndpoint = '';
  await page.route('**/api/search?weeklyRelease=*', route => {
    calledEndpoint = 'weeklyRelease';
    return route.fulfill({ json: { result: DETAIL } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await winGuess(page);

  await expect(page.locator('#fdj-title-text')).toHaveText('Sortie de la semaine');
  expect(calledEndpoint).toBe('weeklyRelease');
});

test('rechargement apres devinette (chemin en cache) : ne plante pas, garde le bon titre — le vrai bug corrige', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-22T09:00:00'));
  await page.route('**/api/search?weeklyRelease=*', route => route.fulfill({ json: { result: DETAIL } }));

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.click('#nav-discover');
  await winGuess(page);
  await expect(page.locator('#fdj-title-text')).toHaveText('Sortie de la semaine');

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForSelector('#fdj-card .fdj-film-title'); // deja resolu -> revele direct depuis le cache
  await expect(page.locator('#fdj-title-text')).toHaveText('Sortie de la semaine');

  expect(errors, `Erreurs JS au rechargement : ${errors.join(' | ')}`).toHaveLength(0);
});

test('sans devinette jouee, le rechargement reaffiche la phase "a deviner" (pas resolu)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-20T09:00:00'));
  await page.route('**/api/search?dailyPick=*', route => route.fulfill({ json: { result: DETAIL } }));

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster');

  await page.reload();
  await page.click('#nav-discover');
  await page.waitForSelector('.guess-poster'); // toujours en attente, meme depuis le cache
  await expect(page.locator('#fdj-title-text')).toHaveText('Devine le Film du Jour');
});
