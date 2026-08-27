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
//
// Ce test portait sur les signatures de Film Noir (affiches en noir et
// blanc), Carnet de Voyage (cartes en pointillés) et Moderne (curseur en
// losange) — les trois thèmes ont été retirés. Son objet reste le même sur
// les thèmes qui subsistent : une signature de thème doit RENDRE, pas juste
// exister dans la feuille de style.
test('touches signatures : Technicolor a son grain, Cinéphile 70s ses angles ronds', async ({ page }) => {
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

  // Technicolor : voile de grain argentique sur un pseudo-élément fixe.
  await applyTheme('technicolor');
  const grain = await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
  expect(grain, 'Technicolor doit poser son grain').toContain('url(');

  // Cinéphile 70s : tout y est délibérément arrondi (rayon 18px) et sépia.
  //
  // DÉFAUT PRÉEXISTANT, laissé tel quel : la signature annoncée de ce thème
  // est un halo chaud sur les étoiles, écrit
  // « [data-theme="cinephile"] .stars, [...] .duel-medal-gold ». Or aucun
  // élément .stars n'existe dans le balisage — il y a .stars-display et
  // .rating-stars. Ce halo n'a donc jamais rendu ailleurs que sur les
  // médailles de Duels. Corriger le sélecteur ferait APPARAÎTRE un effet que
  // personne n'a jamais vu, sur l'un des deux thèmes conservés précisément
  // tels qu'ils sont : c'est un changement d'apparence à demander, pas à
  // décider ici. On vérifie donc ce qui rend vraiment.
  await applyTheme('cinephile');
  const rond = await page.evaluate(() => ({
    radius: getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  }));
  expect(rond.radius, 'Cinéphile 70s doit garder ses angles arrondis').toBe('18px');
  expect(rond.bg.toUpperCase(), 'Cinéphile 70s doit garder son papier chaud').toBe('#F9F6F0');

  // Ludex Sombre : angles francs (rayon 2px), l'opposé des thèmes arrondis.
  await applyTheme('ludex-dark');
  const rayon = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--radius').trim());
  expect(rayon, 'Ludex Sombre doit garder son rayon de 2px').toBe('2px');
});

// Les quatre thèmes retirés ne doivent plus apparaître nulle part : ni carte
// dans les Réglages, ni bloc de variables dans la feuille de style. Sans ce
// test, un bloc oublié ressusciterait silencieusement un thème injoignable.
test('les thèmes retirés ne sont plus proposés ni définis', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-btn');
  await page.waitForSelector('#settings-modal.open');

  const proposes = await page.locator('.theme-card').evaluateAll(cards => cards.map(c => c.dataset.theme));
  expect(proposes.sort()).toEqual(['cinephile', 'ludex-dark', 'ludex-light', 'system', 'technicolor']);

  for (const retire of ['default', 'carnet', 'filmnoir', 'moderne', 'meridien']) {
    const defini = await page.evaluate((nom) => {
      const html = document.documentElement;
      const avant = html.getAttribute('data-theme');
      html.setAttribute('data-theme', nom);
      const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
      html.setAttribute('data-theme', avant);
      // Un thème retiré ne redéfinit plus rien : il hérite des valeurs de
      // :root, qui restent le substrat de Cinéphile 70s et Technicolor.
      return bg;
    }, retire);
    const base = await page.evaluate(() => {
      const html = document.documentElement;
      const avant = html.getAttribute('data-theme');
      html.removeAttribute('data-theme');
      const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
      html.setAttribute('data-theme', avant);
      return bg;
    });
    expect(defini, `${retire} ne doit plus avoir sa propre palette`).toBe(base);
  }
});
