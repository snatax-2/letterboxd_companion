const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 3 },
      } },
    ]));
  });
  // Polices Google bloquées : ce fichier enchaîne deux chargements de page
  // (un initial, un rechargement pour vérifier la persistance de la
  // préférence de repli), et le <link> injecté par loadThemeFonts met une
  // dizaine de secondes à résoudre sur ce runner. Les deux cumulés
  // dépassaient le délai de 30s — un échec de chronomètre, pas de
  // comportement. Même parade que visual-regression et jetons-semantiques.
  await page.route('**fonts.googleapis.com**', route => route.abort());
  await page.route('**fonts.gstatic.com**', route => route.abort());
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [
      { episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 58, overview: 'Synopsis 1.' },
      { episode_number: 2, name: 'Ep 2', air_date: '2014-01-19', runtime: 52, overview: 'Synopsis 2.' },
      { episode_number: 3, name: 'Ep 3', air_date: '2014-01-26', runtime: 51, overview: 'Synopsis 3.' },
    ],
  } }));
});

test('nouveau rond a cocher a droite valide, plus de bouton pleine largeur', async ({ page }) => {
  await page.goto('/');

  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);

  await expect(page.locator('.tv-continue-validate-btn')).toHaveCount(0);
  await expect(page.locator('.tv-continue-check-btn')).toHaveCount(1);

  let text = await page.locator('.tv-continue-list').textContent();
  expect(text).toContain('Ep 2'); // episode 1 deja vu -> le widget propose l'episode 2

  await page.click('.tv-continue-check-btn');
  await page.waitForTimeout(800);
  text = await page.locator('.tv-continue-list').textContent();
  expect(text).toContain('Ep 3'); // episode 2 valide -> passe au suivant
});

test('retirer une carte du widget : disparait, revient au prochain rendu (aucune donnee touchee)', async ({ page }) => {
  await page.goto('/');

  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);

  await page.click('.tv-continue-remove-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#tv-continue-section')).toBeHidden();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].watchedEpisodes).toEqual([1]); // rien change

  // Revient si on redeclenche un rendu (ex: en revenant sur l'onglet)
  await page.click('#tab-media-movie');
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  await expect(page.locator('#tv-continue-section')).toBeVisible();
});

test('mettre en pause : disparait du widget de facon persistante (flag en donnees)', async ({ page }) => {
  await page.goto('/');

  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);

  await page.click('.tv-continue-pause-btn');
  await page.waitForTimeout(300);
  await expect(page.locator('#tv-continue-section')).toBeHidden();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored[0].seasons['1'].paused).toBe(true);

  // Persiste meme apres un nouveau rendu (contrairement a "retirer")
  await page.click('#tab-media-movie');
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  await expect(page.locator('#tv-continue-section')).toBeHidden();
});

test('repli/depliage du widget, preference memorisee', async ({ page }) => {
  await page.goto('/');

  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);

  await expect(page.locator('#tv-continue-list')).toBeVisible();
  const countText = await page.locator('#tv-continue-count').textContent();
  expect(countText).toContain('1');

  await page.click('#tv-continue-toggle');
  await page.waitForTimeout(200);
  await expect(page.locator('#tv-continue-list')).toBeHidden();

  const collapsedPref = await page.evaluate(() => localStorage.getItem('lbx_tv_continue_collapsed'));
  expect(collapsedPref).toBe('1');

  // Persiste au rechargement.
  // #nav-rating est indispensable ici : l'onglet d'arrivée est Découvrir
  // (setTimeout(() => switchMobileNav('discover'), 0) en fin de
  // src/01-navigation.js), pas Noter. Sans ce clic, #tab-media-tv est masqué
  // et le test expirait dessus — vérifié : la préférence de repli, elle,
  // était bien mémorisée et réappliquée.
  await page.reload();
  await page.waitForTimeout(1400);
  await page.click('#nav-rating');
  await page.waitForTimeout(400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  await expect(page.locator('#tv-continue-list')).toBeHidden();
  await expect(page.locator('#tv-continue-section')).toBeVisible(); // la section reste visible, juste repliee
});

test('hauteur de carte stable malgre un titre d\'episode tres long', async ({ page }) => {
  await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
    episodes: [
      { episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 58 },
      { episode_number: 2, name: 'Un titre extremement long qui pourrait normalement etirer la carte sur plusieurs lignes de texte et casser la coherence visuelle entre les series', air_date: '2014-01-19', runtime: 52 },
    ],
  } }));
  await page.goto('/');

  await page.click('#nav-rating');
  await page.waitForTimeout(1400);
  await page.click('#tab-media-tv');
  await page.waitForTimeout(1000);
  const height1 = await page.locator('.tv-continue-card').first().evaluate(el => el.getBoundingClientRect().height);
  console.log('hauteur avec titre normal:', height1);
  expect(height1).toBeLessThan(140); // plafonnee malgre le titre long (line-clamp)
});

const { default: AxeBuilder } = require('@axe-core/playwright');
for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
  test(`accessibilite widget redesigne - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 3 },
        } },
      ]));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.route('**/api/search?tvSeasonShowId=4607&tvSeasonNumber=1', route => route.fulfill({ json: {
      episodes: [
        { episode_number: 1, name: 'Ep 1', air_date: '2014-01-12', runtime: 58 },
        { episode_number: 2, name: 'Ep 2', air_date: '2014-01-19', runtime: 52, overview: 'Synopsis.' },
      ],
    } }));
    await page.goto('/');

    await page.click('#nav-rating');
    await page.waitForTimeout(1400);
    await page.click('#tab-media-tv');
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}
