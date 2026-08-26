const { test, expect } = require('@playwright/test');

// Un re-rendu de l'historique qui s'intercale PENDANT une action en cours.
//
// ── CE QUE CE FICHIER TESTAIT ───────────────────────────────────────────
// Le bug d'origine : glisser un film montrait parfois "rien" (ni Supprimer ni
// Modifier), parce qu'un re-rendu de la liste — déclenché par une synchro en
// arrière-plan ou un tirer-pour-rafraîchir — s'intercalait pendant qu'un item
// était "armé", laissant les variables d'état pointer vers des éléments DOM
// détachés. Les trois tests portaient sur cette machine à états : armement,
// préservation de l'état armé au re-rendu, seuil de reconnaissance d'un
// glissement diagonal.
//
// Ce glissement n'existe plus (Ludex 2.0 : historique en mosaïque, actions en
// surimpression — voir styles.css, section HISTORY), donc plus d'état armé,
// donc plus rien à préserver.
//
// ── CE QUI SURVIT, ET QUI COMPTE VRAIMENT ───────────────────────────────
// La classe de bug, elle, n'a pas disparu : une action de l'historique n'est
// pas instantanée (300 ms d'animation avant l'écriture), et un re-rendu peut
// toujours s'intercaler dans cette fenêtre. C'est exactement ce qui a produit
// la mise à jour perdue corrigée dans deleteItem() — l'instantané pris avant
// le délai écrasait l'écriture d'une suppression concurrente, et l'index figé
// désignait un autre film après décalage.
//
// Ce fichier vérifie donc désormais la variante "re-rendu" de ce scénario ;
// la variante "deux suppressions coup sur coup" vit dans
// history-stale-index.spec.js.

const FILMS = [
  { title: 'Film Un', tmdbId: '1', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
  { title: 'Film Deux', tmdbId: '2', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-05', savedAt: '2026-01-05T10:00:00.000Z' },
  { title: 'Film Trois', tmdbId: '3', score: '6.0', mode: 'quick', values: { quick: 3 }, date: '2026-01-03', savedAt: '2026-01-03T10:00:00.000Z' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((films) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify(films));
  }, FILMS);
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');
});

async function titresAffiches(page) {
  const labels = await page.locator('.hist-item-open').evaluateAll(els => els.map(el => el.getAttribute('aria-label') || ''));
  return labels.join(' | ');
}

test('un re-rendu pendant une suppression en cours supprime quand meme le bon film', async ({ page }) => {
  await expect(page.locator('.hist-item')).toHaveCount(3);

  // "Film Deux" est le plus récent, donc affiché en premier.
  const cible = page.locator('.hist-item', { has: page.locator('.hist-item-open[aria-label*="Film Deux"]') });
  await cible.locator('.hist-action-btn.del').click();

  // Simule une synchro en arrière-plan (ou un tirer-pour-rafraîchir) qui
  // re-rend la liste AVANT que l'écriture différée de 300 ms n'ait eu lieu.
  await page.waitForTimeout(100);
  await page.evaluate(() => window.renderHistory());
  await page.waitForTimeout(800);

  const restants = await titresAffiches(page);
  expect(restants).not.toContain('Film Deux');
  expect(restants).toContain('Film Un');
  expect(restants).toContain('Film Trois');
  await expect(page.locator('.hist-item')).toHaveCount(2);
});

test('un re-rendu pendant une suppression n\'ouvre aucune fiche par accident', async ({ page }) => {
  const cible = page.locator('.hist-item', { has: page.locator('.hist-item-open[aria-label*="Film Trois"]') });
  await cible.locator('.hist-action-btn.del').click();
  await page.waitForTimeout(100);
  await page.evaluate(() => window.renderHistory());
  await page.waitForTimeout(800);

  await expect(page.locator('#movie-detail-sheet.open')).toHaveCount(0);
  expect(await titresAffiches(page)).not.toContain('Film Trois');
});

test('annuler une suppression restaure le bon film', async ({ page }) => {
  const cible = page.locator('.hist-item', { has: page.locator('.hist-item-open[aria-label*="Film Deux"]') });
  await cible.locator('.hist-action-btn.del').click();
  await page.waitForTimeout(700);
  expect(await titresAffiches(page)).not.toContain('Film Deux');

  await page.locator('#toast button, #toast a').first().click();
  await page.waitForTimeout(500);

  const restants = await titresAffiches(page);
  expect(restants).toContain('Film Deux');
  await expect(page.locator('.hist-item')).toHaveCount(3);
});
