const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('chaque theme se selectionne et applique son fond', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');

  const themeNames = await page.locator('.theme-card').evaluateAll(cards => cards.map(c => c.dataset.theme));
  console.log('THEMES:', themeNames.join(', '));

  for (const name of themeNames) {
    if (name === 'system') continue; // dependent du systeme, teste a part
    const card = page.locator(`.theme-card[data-theme="${name}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(120);
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(applied, `theme ${name}`).toBe(name);
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bg, `theme ${name} doit definir --bg`).not.toBe('');
  }
});

// Le poster du fixture etait un data: URL. safePosterSrc() (03-foundation.js)
// n'accepte plus que les URL image.tmdb.org depuis la fermeture des XSS
// stockes : un data: est donc rejete, aucun <img> n'est rendu, et le test
// attendait indefiniment '.hist-item img'. Verifie avant de changer le
// fixture plutot que le code : le selecteur d'affiches ne propose que des
// posters TMDb (file_path -> tmdbImage), l'app ne stocke jamais de data: URL.
// Le rejet ne casse donc rien de reel — c'est le fixture qui etait
// irrealiste. L'image n'a pas besoin de charger : le test ne lit qu'un style
// calcule, qui s'applique que la requete aboutisse ou non.
test('touches signatures: noir grise les affiches, carnet raye les cartes en pointilles, moderne a son losange', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Film', year: '1994', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-07-10', savedAt: '2026-07-10T10:00:00.000Z', poster: 'https://image.tmdb.org/t/p/w342/exemple.jpg' },
  ])));
  // La carte remplace son <img> par l'espace réservé si l'image échoue
  // (onerror, voir renderHistory) : sans réseau, l'affiche TMDb 404 et le
  // test ne trouverait jamais '.hist-item img'. On sert donc un PNG 1x1.
  await page.route('**image.tmdb.org/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
  }));
  await page.goto('/');

  async function applyTheme(name) {
    await page.evaluate((n) => {
      document.documentElement.setAttribute('data-theme', n);
    }, name);
    await page.waitForTimeout(300);
  }

  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');

  await applyTheme('filmnoir');
  const filter = await page.locator('.hist-item img').first().evaluate(el => getComputedStyle(el).filter);
  // Chromium sérialise grayscale(100%) en "grayscale(0.998903)" : comparer la
  // chaîne exacte rendait le test dépendant d'un arrondi du moteur. On lit la
  // valeur et on vérifie qu'elle est bien au maximum.
  const niveauGris = parseFloat((filter.match(/grayscale\(([\d.]+)\)/) || [])[1]);
  expect(niveauGris, `filtre lu : ${filter}`).toBeGreaterThan(0.99);
  const vignette = await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
  expect(vignette).toContain('radial-gradient');

  await applyTheme('carnet');
  const borderStyle = await page.locator('.card').first().evaluate(el => getComputedStyle(el).borderStyle);
  expect(borderStyle).toContain('dashed');

  await applyTheme('moderne');
  const thumbRotate = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--slider-thumb-rotate').trim());
  expect(thumbRotate).toBe('45deg');
});
