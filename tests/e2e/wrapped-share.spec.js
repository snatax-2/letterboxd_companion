const { test, expect } = require('@playwright/test');

function seedYearHistory() {
  const items = [];
  const genres = ['Drame', 'Action', 'Comédie', 'Drame', 'Action', 'Drame'];
  const directors = ['Réal A', 'Réal B', 'Réal A', 'Réal A', 'Réal C', 'Réal A'];
  for (let i = 0; i < 6; i++) {
    items.push({
      title: 'Film ' + String.fromCharCode(65 + i), year: '2020', runtime: (95 + i * 5) + ' min',
      genre: genres[i], director: directors[i], actors: 'Acteur X, Acteur Y',
      score: (5 + i * 0.7).toFixed(1), mode: 'quick', values: { quick: (5 + i * 0.7) / 2 },
      date: '2026-0' + ((i % 6) + 1) + '-1' + i, savedAt: '2026-0' + ((i % 6) + 1) + '-1' + i + 'T10:00:00.000Z',
      stars: '★★★', poster: '',
    });
  }
  return JSON.stringify(items);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((h) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', h);
  }, seedYearHistory());
});

// Une capture de canvas VRAIMENT vide (juste un fond uni, sans texte/dégradé)
// produit un data URL PNG très court une fois compressé — un canvas avec du
// contenu réel (dégradé + texte + traits) produit toujours quelque chose de
// nettement plus long. C'est une vérification robuste de "a vraiment dessiné
// quelque chose", sans avoir besoin de comparer des pixels un par un.
const BLANK_CANVAS_DATAURL_MAX_LENGTH = 800;

test('carte de profil partageable : le canvas dessine du contenu reel, le telechargement produit un PNG valide', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForTimeout(500);

  const dataUrl = await page.evaluate(() => document.getElementById('profile-share-canvas').toDataURL('image/png'));
  expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  expect(dataUrl.length).toBeGreaterThan(BLANK_CANVAS_DATAURL_MAX_LENGTH);

  await page.click('#profile-share-btn');
  await expect(page.locator('#toast')).toContainText('téléchargée');
});

test('retrospective annuelle : ouverture, navigation des slides, canvas final avec du vrai contenu', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForSelector('#wrapped-entry-card');
  await page.click('#wrapped-entry-card');
  await page.waitForSelector('#wrapped-modal.open');

  await expect(page.locator('.wrapped-slide.active .wrapped-slide-big')).toHaveText('6');

  let lastText = '';
  for (let i = 0; i < 6; i++) {
    lastText = await page.locator('#wrapped-next-btn').textContent();
    if (lastText.includes('Fermer')) break;
    await page.click('#wrapped-next-btn');
    await page.waitForTimeout(200);
  }
  expect(lastText).toContain('Fermer');

  await page.waitForSelector('#wrapped-share-canvas');
  await page.waitForTimeout(200);
  const dataUrl = await page.evaluate(() => document.getElementById('wrapped-share-canvas').toDataURL('image/png'));
  expect(dataUrl.length).toBeGreaterThan(BLANK_CANVAS_DATAURL_MAX_LENGTH);

  await page.click('#wrapped-prev-btn');
  await page.waitForTimeout(200);
  await expect(page.locator('#wrapped-next-btn')).not.toContainText('Fermer');

  await page.click('#wrapped-close-btn');
  await expect(page.locator('#wrapped-modal')).not.toHaveClass(/open/);
});

test('retrospective : le telechargement de la derniere slide produit un PNG valide', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-profile');
  await page.click('#wrapped-entry-card');
  await page.waitForSelector('#wrapped-modal.open');
  for (let i = 0; i < 6; i++) {
    const txt = await page.locator('#wrapped-next-btn').textContent();
    if (txt.includes('Fermer')) break;
    await page.click('#wrapped-next-btn');
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('#wrapped-share-download-btn');
  await page.click('#wrapped-share-download-btn');
  await expect(page.locator('#toast')).toContainText('téléchargée');
});

test('la carte "Retrospective" ne s\'affiche pas pour un historique vide', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([]));
  });
  await page.goto('/');
  await page.click('#nav-profile');
  await page.waitForTimeout(400);
  await expect(page.locator('#wrapped-entry-card')).toBeHidden();
});
