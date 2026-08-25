// Reproduit le bug trouvé via les captures d'écran envoyées : deux
// suppressions confirmées coup sur coup, avant que le délai de la première
// (300ms, voir deleteItem() dans 06b-history-actions.js) n'ait eu le temps
// de se terminer. L'index du second film était capturé AVANT que le
// premier ne se supprime — une fois le premier effectivement supprimé,
// tous les index suivants décalent, et l'ancien index capturé pour le
// second ne correspond plus au bon film.
//
// Ludex 2.0 : re-déclenché ici via les boutons "Supprimer" au tap (voir
// .hist-action-btn.del, l'Historique étant passé en grille sans swipe) —
// mais le bug lui-même n'a rien à voir avec swipe vs tap : c'est le délai
// de 300ms entre le clic et la vraie suppression du tableau qui est en
// cause, donc toujours aussi pertinent à vérifier avec la nouvelle
// interaction.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film A (le plus ancien)', tmdbId: '1', score: '6.0', mode: 'quick', values: { quick: 3 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z' },
      { title: 'Film B (au milieu)', tmdbId: '2', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-05', savedAt: '2026-01-05T10:00:00.000Z' },
      { title: 'Film C (le plus recent)', tmdbId: '3', score: '8.0', mode: 'quick', values: { quick: 4 }, date: '2026-01-10', savedAt: '2026-01-10T10:00:00.000Z' },
    ]));
    window.renderAll();
  });
  await page.click('#nav-history');
});

async function clickDelete(page, titleSubstring) {
  const item = page.locator('.hist-item', { has: page.locator(`.hist-item-open[aria-label*="${titleSubstring}"]`) });
  await item.locator('.hist-action-btn.del').click();
}

test('deux suppressions confirmées coup sur coup suppriment les BONS films (pas de décalage d\'index)', async ({ page }) => {
  // Film A est affiché en DERNIER (le plus ancien), Film C en PREMIER (le plus récent).
  // On confirme A (index réel bas) PUIS immédiatement C (index réel plus haut) —
  // exactement l'ordre qui expose le bug : la suppression de A décale l'index de C.
  await clickDelete(page, 'Film A');
  await clickDelete(page, 'Film C');

  // Laisse les deux délais (300ms + 300ms cumulés) se terminer.
  await page.waitForTimeout(700);

  const remainingLabels = await page.locator('.hist-item .hist-item-open').evaluateAll(els => els.map(el => el.getAttribute('aria-label')).join(' | '));
  console.log('RESTANTS:', remainingLabels);
  expect(remainingLabels).toContain('Film B');
  expect(remainingLabels).not.toContain('Film A');
  expect(remainingLabels).not.toContain('Film C');
  expect(await page.locator('.hist-item').count()).toBe(1); // uniquement Film B doit rester
});
