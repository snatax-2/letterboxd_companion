const { test, expect } = require('@playwright/test');

// Le libellé de l'onglet actif doit tenir dans sa colonne.
//
// Régression réelle, attrapée à l'œil et pas par la suite : en passant la
// police d'interface de Fraunces à Inter (P0), « HISTORIQUE » est devenu plus
// large que sa colonne. Le libellé se retrouvait rogné en plein milieu du mot
// — « ISTORIQU » — sous le bouton NOTER, sans qu'aucun test ne bronche.
//
// L'invariant est mesuré, pas approximé : on clone le libellé sans contrainte
// de largeur pour connaître sa largeur NATURELLE, puis on la compare à celle
// de la colonne qui doit l'accueillir.
//
// PORTÉE — les six thèmes historiques sont exclus, et ce n'est pas une
// commodité : ils portent le même défaut, mais ANTÉRIEUR à la refonte.
// Vérifié en remettant le dépôt dans son état d'avant P0 puis en lançant ce
// test : « Découvrir » y demande déjà 65,0px pour une colonne de 63,0px à
// 360px. Le corriger reviendrait à retoucher des thèmes délibérément gelés
// (leurs instantanés visuels servent de filet pendant toute la migration) et
// promis à la suppression en P10. Le défaut disparaîtra avec eux.

const ONGLETS = ['nav-discover', 'nav-watchlist', 'nav-history', 'nav-profile'];

for (const theme of ['ludex-dark', 'ludex-light']) {
  for (const largeur of [360, 390, 430]) {
    test(`${theme} · ${largeur}px — chaque libellé tient dans sa colonne`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.addInitScript((t) => {
        localStorage.setItem('lbx_onboarding_seen', '1');
        localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      }, theme);
      await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
      await page.route('**fonts.googleapis.com**', r => r.abort());
      await page.route('**fonts.gstatic.com**', r => r.abort());
      await page.goto('/');
      await page.waitForTimeout(1400);

      const mesures = await page.evaluate((ids) => ids.map((id) => {
        const btn = document.getElementById(id);
        const lab = btn.querySelector('.nav-btn-label');
        // Largeur naturelle : un clone libéré de max-width, hors flux.
        const clone = lab.cloneNode(true);
        clone.style.cssText = 'position:absolute;visibility:hidden;max-width:none;white-space:nowrap;opacity:1';
        btn.appendChild(clone);
        const besoin = clone.getBoundingClientRect().width;
        clone.remove();
        return { id, texte: lab.textContent, besoin, colonne: btn.getBoundingClientRect().width };
      }), ONGLETS);

      for (const m of mesures) {
        expect(m.besoin,
          `${m.id} — « ${m.texte} » demande ${m.besoin.toFixed(1)}px pour une colonne de ${m.colonne.toFixed(1)}px`)
          .toBeLessThanOrEqual(m.colonne);
      }
    });
  }
}

test('la cible tactile de chaque onglet reste conforme', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_settings', JSON.stringify({ theme: 'ludex-dark' }));
  });
  await page.route('**/api/search*', r => r.fulfill({ json: { results: [] } }));
  await page.route('**fonts.googleapis.com**', r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1400);

  // Réduire le corps du libellé ne doit jamais rétrécir la zone tactile :
  // 44px de haut minimum, sur le plus étroit des gabarits visés (§13).
  for (const id of [...ONGLETS, 'nav-rating']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.height, `${id} : hauteur tactile`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${id} : largeur tactile`).toBeGreaterThanOrEqual(44);
  }
});
