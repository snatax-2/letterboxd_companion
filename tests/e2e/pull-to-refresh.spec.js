// Tirer vers le bas pour rafraîchir — vérifie le seuil et l'absence
// d'interférence quand la page n'est pas tout en haut.
const { test, expect } = require('@playwright/test');

async function touchPullPartial(page, distance) {
  await page.evaluate(() => {
    const ev = new Event('touchstart', { bubbles: true });
    ev.touches = [{ clientY: 100 }];
    document.body.dispatchEvent(ev);
  });
  await page.waitForTimeout(50);
  await page.evaluate((distance) => {
    const ev = new Event('touchmove', { bubbles: true });
    ev.touches = [{ clientY: 100 + distance }];
    document.body.dispatchEvent(ev);
  }, distance);
}

async function touchPull(page, distance) {
  await touchPullPartial(page, distance);
  await page.waitForTimeout(50);
  await page.evaluate((distance) => {
    const ev = new Event('touchend', { bubbles: true });
    ev.changedTouches = [{ clientY: 100 + distance }];
    document.body.dispatchEvent(ev);
  }, distance);
}

test('tirer suffisamment vers le bas (en haut de page) déclenche le rafraîchissement', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 0));
  await touchPullPartial(page, 100); // au-delà du seuil (70px), avant relâchement
  const indicator = page.locator('#ptr-indicator');
  const hadFeedback = await indicator.evaluate(el =>
    el.classList.contains('ptr-ready') || parseFloat(el.style.opacity || '0') > 0
  );
  expect(hadFeedback).toBe(true);
});

test('tirer vers le bas quand la page est déjà scrollée ne fait rien', async ({ page }) => {
  // L'onboarding est une modale PLEIN ÉCRAN : sans ça, elle intercepte le
  // premier clic du test (page.click part alors en timeout de 30 s).
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 300));
  await touchPull(page, 100);
  const indicator = page.locator('#ptr-indicator');
  const opacity = await indicator.evaluate(el => parseFloat(el.style.opacity || '0'));
  expect(opacity).toBe(0);
});
