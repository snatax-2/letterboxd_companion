const { test, expect } = require('@playwright/test');

// Le code de synchronisation est un JETON PORTEUR : le connaître suffit à lire
// et à écraser tout l'historique. Ces tests verrouillent les trois propriétés
// qui le rendent tenable — un code fort disponible en un clic, un
// avertissement tant qu'un code faible est en place, et un transport qui ne
// laisse pas le code dans l'URL.

async function openSettings(page) {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.click('#settings-btn');
  await page.waitForTimeout(400);
}

test('le bouton genere un code long et aleatoire', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await openSettings(page);

  await page.click('#sync-generate-btn');
  const premier = await page.inputValue('#setting-sync-code');
  expect(premier.length).toBeGreaterThanOrEqual(16);
  expect(premier).toMatch(/^[A-Za-z2-9]+$/); // alphabet sans caracteres ambigus

  // Le code doit être persisté immédiatement, pas seulement affiché.
  expect(await page.evaluate(() => localStorage.getItem('lbx_sync_code'))).toBe(premier);

  // Deux générations ne doivent jamais donner le même code. Un code déjà
  // présent demande confirmation : on la donne.
  await page.click('#sync-generate-btn');
  await page.waitForTimeout(300);
  await page.click('#modal-confirm');
  await page.waitForTimeout(300);
  const second = await page.inputValue('#setting-sync-code');
  expect(second).not.toBe(premier);
});

test('un code faible declenche un avertissement visible', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_sync_code', 'dario'); // code court d'avant le changement
  });
  await openSettings(page);

  const warn = page.locator('#sync-code-warning');
  await expect(warn).toBeVisible();
  await expect(warn).toContainText(/deviner/i);

  // L'avertissement disparaît dès qu'un code sûr est saisi.
  await page.fill('#setting-sync-code', 'Kx7mQp2rVn9tLb4wZc6dHy');
  await page.waitForTimeout(200);
  await expect(warn).toBeHidden();
});

test('le code part dans un en-tete, jamais dans l\'URL', async ({ page }) => {
  const CODE = 'Kx7mQp2rVn9tLb4wZc6dHy';
  const vues = [];
  await page.route('**/api/sync**', (route) => {
    const req = route.request();
    vues.push({ url: req.url(), entete: req.headers()['x-sync-code'] });
    route.fulfill({ json: { found: false } });
  });
  await page.addInitScript((c) => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_sync_code', c);
  }, CODE);
  await openSettings(page);

  await page.click('#sync-restore-btn');
  await page.waitForTimeout(800);

  expect(vues.length).toBeGreaterThan(0);
  for (const v of vues) {
    expect(v.entete, 'le code doit voyager dans X-Sync-Code').toBe(CODE);
    expect(v.url, 'le code ne doit pas apparaitre dans l\'URL').not.toContain(CODE);
  }
});
