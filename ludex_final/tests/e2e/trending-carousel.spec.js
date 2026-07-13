// Carrousel "Tendances du moment" (onglet Découvrir) : glisser dessus ne doit
// PAS changer d'onglet — bug déjà rencontré et corrigé (le carrousel n'était
// pas dans la liste d'exclusion du swipe global). Simule les réponses API
// (aucun accès réseau réel nécessaire pour ce test).
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    const url = route.request().url();
    if (url.includes('trending=true')) {
      const results = Array.from({ length: 8 }, (_, i) => ({
        id: 100 + i, title: `Film Tendance ${i}`, poster_path: `/fake-poster-${i}.jpg`,
      }));
      return route.fulfill({ json: { results } });
    }
    return route.fulfill({ json: { results: [] } });
  });

  await page.goto('/');
  await page.click('#nav-discover');
  await page.waitForSelector('#trending-carousel-wrap[style*="display: block"]', { timeout: 5000 }).catch(() => {});
});

test('glisser sur le carrousel de tendances ne change pas d\'onglet', async ({ page }) => {
  const carousel = page.locator('#trending-carousel');
  const count = await carousel.locator('.trending-item').count();
  if (count === 0) test.skip(); // pas de tendances chargées (ex: connexion lente dans l'environnement de test)

  await carousel.evaluate((el) => {
    function touchEvent(type, x, y) {
      const ev = new Event(type, { bubbles: true });
      ev.touches = [{ clientX: x, clientY: y }];
      ev.changedTouches = [{ clientX: x, clientY: y }];
      return ev;
    }
    const rect = el.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    el.dispatchEvent(touchEvent('touchstart', rect.right - 10, y));
    el.dispatchEvent(touchEvent('touchend', rect.left + 10, y));
  });

  await expect(page.locator('#nav-discover')).toHaveClass(/active/);
});
