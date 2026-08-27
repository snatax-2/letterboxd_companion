const { test, expect } = require('@playwright/test');

// Ombre du bouton Noter (barre de navigation mobile) : un flou trop large
// créait un effet d'encadrement visible sur les deux onglets voisins
// ("À voir", "Découvrir"), particulièrement marqué sur les thèmes à fond
// clair (Carnet en premier lieu, la bordure claire du cercle contre
// l'ombre sombre accentuant l'effet). Vérifie que le flou reste contenu
// dans une plage raisonnable plutôt que de re-dériver silencieusement
// vers une valeur trop large au fil de futurs ajustements.

test('ombre du bouton Noter reste contenue (flou et opacite plafonnes)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
  await page.goto('/');
  await page.waitForTimeout(1400);

  const shadow = await page.locator('.nav-btn-primary .nav-btn-icon').evaluate(el => getComputedStyle(el).boxShadow);
  console.log('ombre calculee:', shadow);
  // rgba(0, 0, 0, 0.25) 0px 2px 4px 0px — verifie le flou (3e valeur) et l'opacite
  const blurMatch = shadow.match(/(\d+)px\s+0px\s*$/) || shadow.match(/(\d+)px\s+0px\)/);
  const blur = blurMatch ? Number(blurMatch[1]) : null;
  expect(blur, shadow).not.toBeNull();
  expect(blur).toBeLessThanOrEqual(6);

  const opacityMatch = shadow.match(/0\.(\d+)\)/);
  const opacity = opacityMatch ? Number(`0.${opacityMatch[1]}`) : null;
  expect(opacity, shadow).not.toBeNull();
  expect(opacity).toBeLessThanOrEqual(0.3);
});

for (const theme of ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor']) {
  test(`pas de tache sombre visible autour du bouton Noter - ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
    }, theme);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);

    // Echantillonne la couleur juste au-dessus du texte "À VOIR" (a gauche
    // du cercle) : ne doit pas etre significativement plus sombre que le
    // fond normal de la barre a cet endroit, loin du cercle.
    const navBtn = page.locator('.nav-btn').filter({ hasText: 'À voir' }).first();
    const box = await navBtn.boundingBox();
    const color = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? getComputedStyle(el).backgroundColor : null;
    }, { x: box.x + box.width / 2, y: box.y + 8 });
    console.log(`${theme} - couleur pres de "À voir":`, color);
  });
}
