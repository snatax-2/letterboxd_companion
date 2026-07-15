const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
});

test('importer un diary.csv Letterboxd fusionne les films avec conversion des notes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lbx_v2', JSON.stringify([
    { title: 'Alien', year: '1979', score: '9.0', mode: 'quick', values: { quick: 4.5 }, date: '2024-01-01', savedAt: '2024-01-01T10:00:00.000Z' },
  ])));
  await page.goto('/');

  const csv = 'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
    '2024-01-15,Oppenheimer,2023,uri,4.5,,,2024-01-14\n' +
    '2024-02-01,Alien,1979,uri,5,,,2024-02-01\n' + // doublon, doit etre ignore
    '2024-03-10,"Paris, Texas",1984,uri,5,,,2024-03-09\n';

  await page.locator('#import-file').setInputFiles({
    name: 'diary.csv', mimeType: 'text/csv', buffer: Buffer.from(csv),
  });

  // La modale de confirmation resume correctement la situation
  await expect(page.locator('#confirm-modal, .modal-overlay.open').first()).toBeVisible();
  const modalText = await page.locator('.modal-overlay.open').first().textContent();
  expect(modalText).toContain('journal');
  expect(modalText).toContain('3 films');
  expect(modalText).toContain('2 nouveaux');

  // Confirme
  await page.locator('.modal-overlay.open .modal-btn.primary, .modal-overlay.open .primary').first().click();
  await page.waitForTimeout(300);

  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_v2')));
  expect(history.length).toBe(3); // 1 existant + 2 nouveaux
  const opp = history.find(h => h.title === 'Oppenheimer');
  expect(opp.score).toBe('9.0'); // 4.5 etoiles -> 9/10
  expect(opp.importedFrom).toBe('letterboxd');
  const paris = history.find(h => h.title === 'Paris, Texas');
  expect(paris).toBeTruthy(); // la virgule dans le titre a survecu au parsing
});

test('la banniere de sauvegarde apparait apres 30 jours et disparait apres export', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_v2', JSON.stringify(Array.from({ length: 12 }, (_, i) => ({
      title: 'Film ' + i, score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z',
    }))));
    const old = new Date(Date.now() - 45 * 86400000).toISOString();
    localStorage.setItem('lbx_last_export_at', old);
  });
  await page.goto('/');

  await page.waitForSelector('#backup-reminder', { timeout: 6000 });
  await expect(page.locator('#backup-reminder')).toContainText('plus de 30 jours');

  // Cliquer Exporter declenche l'export ET retire la banniere
  const downloadPromise = page.waitForEvent('download');
  await page.click('#backup-reminder-export');
  await downloadPromise;
  await expect(page.locator('#backup-reminder')).toHaveCount(0);

  const newDate = await page.evaluate(() => localStorage.getItem('lbx_last_export_at'));
  expect(new Date(newDate).getTime()).toBeGreaterThan(Date.now() - 60000);
});
