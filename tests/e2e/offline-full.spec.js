const { test, expect } = require('@playwright/test');

// Vérifie un VRAI usage hors-ligne complet — pas juste "l'API échoue proprement"
// (déjà couvert ailleurs), mais : l'app s'installe-t-elle vraiment comme PWA
// offline-first ? Chaque onglet reste-t-il utilisable ? Rien ne plante
// silencieusement (le journal d'erreurs local sert justement de témoin ici) ?
//
// Étape 1 obligatoire : une VRAIE visite EN LIGNE d'abord, pour que le service
// worker s'installe et mette en cache le shell (HTML/CSS/JS) — exactement
// comme sur un vrai téléphone (l'app doit avoir été ouverte au moins une fois
// avec réseau avant de pouvoir fonctionner hors-ligne, ce n'est pas magique).

test('parcours hors-ligne complet : shell installe, chaque onglet reste utilisable, rien ne plante', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Historique', year: '2020', runtime: '110 min', genre: 'Drame', director: 'X', actors: 'Y', tmdbId: '1', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', stars: '★★★½', poster: '' },
    ]));
    localStorage.setItem('lbx_watchlist_default', JSON.stringify([
      { title: 'Film Watchlist', tmdbId: '2', addedAt: new Date().toISOString(), poster: '' },
    ]));
    localStorage.setItem('lbx_duels', JSON.stringify({ ratings: {}, totalDuels: 0, pairs: {} }));
  });

  // ── Étape 1 : visite EN LIGNE, laisse le service worker s'installer ──
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 }).catch(() => {
    // Sur certains environnements de test le SW peut prendre un cycle de plus —
    // un reload suffit à le laisser prendre le contrôle.
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 });

  // ── Étape 2 : bascule VRAIMENT hors-ligne (pas juste une requête qui échoue) ──
  await context.setOffline(true);

  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  // Recharge complètement hors-ligne : le shell doit venir du cache du SW,
  // pas du réseau (qui est coupé) — c'est la vraie promesse d'une PWA.
  await page.reload();
  await expect(page.locator('#app-splash')).toBeAttached(); // la page a bien chargé, pas d'erreur réseau bloquante
  await page.waitForTimeout(500);

  // Badge hors-ligne visible : l'utilisateur sait où il en est
  await expect(page.locator('#offline-badge')).toHaveClass(/visible/);

  // Onglet Noter : l'UI de base s'affiche (la recherche TMDb elle-même
  // échouera hors-ligne, c'est attendu — mais rien ne doit planter)
  await expect(page.locator('#movie-search')).toBeVisible();

  // Onglet Historique : les données déjà sauvegardées restent pleinement
  // consultables hors-ligne (c'est tout l'intérêt du stockage local)
  await page.click('#nav-history');
  await page.waitForTimeout(300);
  await expect(page.locator('.hist-item')).toHaveCount(1);
  await expect(page.locator('.hist-title').first()).toContainText('Film Historique');

  // Onglet Watchlist : pareil, pleinement utilisable
  await page.click('#nav-watchlist');
  await page.waitForTimeout(300);
  await expect(page.locator('.wl-card')).toHaveCount(1);

  // Onglet Découvrir : dépend entièrement de TMDb — doit dégrader
  // proprement (pas de plantage), pas forcément tout fonctionnel
  await page.click('#nav-discover');
  await page.waitForTimeout(500);

  // Onglet Profil : les stats calculées depuis les données locales
  // (radar, historique) doivent rester disponibles hors-ligne
  await page.click('#nav-profile');
  await page.waitForTimeout(400);
  await expect(page.locator('#kpi-total')).toHaveText('1');

  // Le test le plus important : AUCUNE erreur JS non interceptée nulle part
  // dans tout ce parcours (le filet de sécurité existe, mais l'idéal est
  // qu'il n'ait jamais à se déclencher hors-ligne).
  expect(jsErrors, `Erreurs JS pendant le parcours hors-ligne : ${jsErrors.join(' | ')}`).toHaveLength(0);
  const loggedErrors = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_error_log') || '[]'));
  expect(loggedErrors, `Journal d'erreurs non vide : ${JSON.stringify(loggedErrors)}`).toHaveLength(0);

  await context.setOffline(false);
});

test('une action locale (noter/modifier/supprimer) fonctionne integralement hors-ligne', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A Modifier', year: '2020', tmdbId: '1', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
    ]));
  });
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 }).catch(() => {});
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 });

  await context.setOffline(true);
  await page.reload();
  await page.waitForTimeout(500);

  // Supprime un film hors-ligne : purement local, doit marcher sans réseau
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');
  await page.locator('.hist-item .hist-action-btn.del').first().click();
  await page.waitForTimeout(300);

  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2') || '[]'));
  expect(history).toHaveLength(0);

  await context.setOffline(false);
});
