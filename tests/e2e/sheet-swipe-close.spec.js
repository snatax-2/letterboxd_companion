// Glisser vers le bas pour fermer la fiche film — vérifie le seuil (glissement
// suffisant ferme, insuffisant ne ferme pas) dans un vrai navigateur, avec de
// vrais événements tactiles et le vrai calcul de transform/scroll.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    return route.fulfill({
      json: {
        id: 500, title: 'Film Test', release_date: '2020-01-01', poster_path: '/x.jpg',
        genres: [], credits: { crew: [], cast: [] }, videos: { results: [] },
      },
    });
  });
  await page.goto('/');
  await page.evaluate(() => window.openMovieDetailSheet('500'));
  await page.waitForSelector('#movie-detail-sheet.open');
  await page.waitForTimeout(300); // laisse l'animation d'ouverture se terminer
});

async function swipeDownOnSheet(page, distance) {
  await page.evaluate((distance) => {
    const box = document.querySelector('#movie-detail-sheet .mds-box');
    function touchEvent(type, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientY: y }];
      return ev;
    }
    box.dispatchEvent(touchEvent('touchstart', 100));
    box.dispatchEvent(touchEvent('touchmove', 100 + distance));
    box.dispatchEvent(new Event('touchend'));
  }, distance);
}

test('glissement suffisant vers le bas ferme la fiche', async ({ page }) => {
  await swipeDownOnSheet(page, 150);
  await page.waitForTimeout(300); // laisse l'animation de fermeture se terminer
  await expect(page.locator('#movie-detail-sheet')).not.toHaveClass(/open/);
});

test('glissement insuffisant laisse la fiche ouverte', async ({ page }) => {
  await swipeDownOnSheet(page, 40);
  await page.waitForTimeout(300);
  await expect(page.locator('#movie-detail-sheet')).toHaveClass(/open/);
});

test('la croix de fermeture fonctionne toujours (accessibilité)', async ({ page }) => {
  await page.click('.mds-close');
  await expect(page.locator('#movie-detail-sheet')).not.toHaveClass(/open/);
});
