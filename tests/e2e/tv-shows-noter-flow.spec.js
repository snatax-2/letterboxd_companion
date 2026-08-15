const { test, expect } = require('@playwright/test');

test('nouvelle saison : menu Commencer, ajoute au widget En cours', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective',
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
  } }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [{ episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 55, overview: 'Un synopsis.' }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);

  // Aucune grille, aucun formulaire de notation, juste le menu Commencer
  await expect(page.locator('#tv-season-start-prompt')).toBeVisible();
  await expect(page.locator('#notation-card')).toBeHidden();
  const promptText = await page.locator('#tv-start-prompt-text').textContent();
  console.log('texte du menu commencer:', promptText);
  expect(promptText).toContain('True Detective');
  expect(promptText).toContain('Saison 1');

  await page.click('#tv-start-season-btn');
  await page.waitForTimeout(1000);

  // La saison existe desormais localement
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  console.log('stockage apres Commencer:', JSON.stringify(stored));
  expect(stored[0].seasons['1'].watchedEpisodes).toEqual([]);
  expect(stored[0].seasons['1'].totalEpisodes).toBe(8);

  // Le message "deja en cours" doit maintenant s'afficher
  await expect(page.locator('#tv-season-in-progress-msg')).toBeVisible();
  await expect(page.locator('#tv-season-start-prompt')).toBeHidden();

  // Le widget En cours doit maintenant montrer cette serie avec l'episode 1
  await expect(page.locator('.tv-continue-card')).toHaveCount(1);
  const widgetText = await page.locator('.tv-continue-list').textContent();
  console.log('widget En cours:', widgetText.replace(/\s+/g, ' ').trim());
  expect(widgetText).toContain('True Detective');
  expect(widgetText).toContain('Ep 1');
});

test('saison deja en cours (retrouvee par recherche) : message pointant vers En cours, pas de doublon', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1, 2], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective',
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);

  await expect(page.locator('#tv-season-in-progress-msg')).toBeVisible();
  await expect(page.locator('#tv-season-start-prompt')).toBeHidden();
  await expect(page.locator('#notation-card')).toBeHidden();
  const msgText = await page.locator('#tv-in-progress-text').textContent();
  console.log('message en cours:', msgText);
  expect(msgText).toContain('2/8');
});

test('saison terminee : formulaire de notation direct, pas de menu ni de message', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1,2,3,4,5,6,7,8], totalEpisodes: 8,
          rating: { mode: 'detail', values: { scenario: '9' }, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
      } },
    ]));
  });
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvQuery=*', route => route.fulfill({ json: { results: [
    { id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12' },
  ] } }));
  await page.route('**/api/search?tvId=4607', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective',
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8, poster_path: '/s1.jpg' }],
  } }));

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.fill('#tv-search', 'True Detective');
  await page.waitForTimeout(500);
  await page.click('.suggestion-item');
  await page.waitForTimeout(400);
  await page.click('[data-season-number="1"]');
  await page.waitForTimeout(400);

  await expect(page.locator('#notation-card')).toBeVisible();
  await expect(page.locator('#tv-season-start-prompt')).toBeHidden();
  await expect(page.locator('#tv-season-in-progress-msg')).toBeHidden();
  await expect(page.locator('#scenario')).toHaveValue('9'); // prerempli
});
