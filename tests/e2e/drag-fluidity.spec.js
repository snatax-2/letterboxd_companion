const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_onboarding_seen', '1');
    localStorage.setItem('lbx_swipe_hint_seen', '1');
    localStorage.setItem('lbx_v2', JSON.stringify([
      { title: 'Film Un', year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 }, date: '2026-07-01', savedAt: '2026-07-01T10:00:00.000Z' },
    ]));
  });
});

test('la transition CSS est desactivee pendant le glissement actif, restauree au relachement', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-history');
  await page.waitForSelector('.hist-item');
  const item = page.locator('.hist-item').first();
  const content = item.locator('.hist-item-content');

  // Avant tout geste : transition normale (suivant le systeme de mouvement)
  const before = await content.evaluate(el => getComputedStyle(el).transitionDuration);
  expect(before).not.toBe('0s');

  // Simule un glissement reel (TouchEvents), en verifiant l'etat MI-GESTE
  await item.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    function touch(type, x) {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }
    touch('touchstart', startX);
    touch('touchmove', startX - 30);
    touch('touchmove', startX - 60);
    window.__midGestureDragging = el.classList.contains('hist-dragging');
    window.__midGestureTransitionDuration = getComputedStyle(el.querySelector('.hist-item-content')).transitionDuration;
    touch('touchend', startX - 60);
  });

  const draggingDuringGesture = await page.evaluate(() => window.__midGestureDragging);
  const transitionDuringGesture = await page.evaluate(() => window.__midGestureTransitionDuration);
  expect(draggingDuringGesture).toBe(true);
  expect(transitionDuringGesture).toBe('0s'); // transition bien desactivee pendant le suivi du doigt

  // Apres relachement : la classe est retiree, la transition redevient normale
  await page.waitForTimeout(200);
  const draggingAfter = await item.evaluate(el => el.classList.contains('hist-dragging'));
  const transitionAfter = await content.evaluate(el => getComputedStyle(el).transitionDuration);
  expect(draggingAfter).toBe(false);
  expect(transitionAfter).not.toBe('0s');
});
