const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

async function motionHarness(t, reduced = false) {
  const window = loadAppInJsdom(t);
  await new Promise(resolve => setImmediate(resolve));
  const media = new window.EventTarget();
  media.matches = reduced;
  window.matchMedia = () => media;
  let now = 0;
  let nextId = 1;
  const frames = new Map();
  window.performance.now = () => now;
  window.requestAnimationFrame = callback => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = id => frames.delete(id);
  const sheet = window.document.createElement('div');
  sheet.className = 'open';
  sheet.setAttribute('aria-hidden', 'false');
  sheet.innerHTML = '<div class="carousel"><div class="mds-cast-track"><button>Acteur</button></div></div>';
  window.document.body.appendChild(sheet);
  const outer = sheet.firstElementChild;
  Object.defineProperty(outer, 'clientWidth', { value: 300 });
  Object.defineProperty(outer.firstElementChild, 'scrollWidth', { value: 1200 });
  return {
    window, sheet, outer, media, frames,
    step(time) {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
    setReduced(value) { media.matches = value; media.dispatchEvent(new window.Event('change')); },
  };
}

test('casting immobile avec réduction des animations, mais toujours consultable', async t => {
  const h = await motionHarness(t, true);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  assert.equal(h.frames.size, 0);
  h.outer.scrollLeft = 120;
  h.outer.dispatchEvent(new h.window.Event('scroll'));
  assert.equal(h.outer.scrollLeft, 120);
  assert.ok(h.outer.querySelector('button'));
});

test('la préférence système arrête et relance le casting en direct', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.step(0); h.step(16);
  assert.ok(h.outer.scrollLeft > 0);
  h.setReduced(true);
  assert.equal(h.frames.size, 0);
  const position = h.outer.scrollLeft;
  h.step(32);
  assert.equal(h.outer.scrollLeft, position);
  h.setReduced(false);
  assert.equal(h.frames.size, 1);
  h.step(40); h.step(56);
  assert.ok(h.outer.scrollLeft > position);
});

test('le scroll automatique ne déclenche pas sa propre pause', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.step(0); h.step(16);
  h.outer.dispatchEvent(new h.window.Event('scroll'));
  const position = h.outer.scrollLeft;
  h.step(32);
  assert.ok(h.outer.scrollLeft > position);
});

test('survol et focus suspendent le casting pour lire et choisir un acteur', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.step(0); h.step(16);
  h.outer.dispatchEvent(new h.window.Event('mouseenter'));
  const position = h.outer.scrollLeft;
  h.step(32);
  assert.equal(h.outer.scrollLeft, position);
  h.outer.dispatchEvent(new h.window.Event('mouseleave'));
  h.step(3100);
  assert.ok(h.outer.scrollLeft > position);
  h.outer.querySelector('button').focus();
  const focusedPosition = h.outer.scrollLeft;
  h.step(3200);
  assert.equal(h.outer.scrollLeft, focusedPosition);
});

test('un geste manuel suspend le casting et ne déclenche pas le glissement de la fiche', async t => {
  const h = await motionHarness(t);
  let sheetTouches = 0;
  h.sheet.addEventListener('touchstart', () => sheetTouches++);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.step(0); h.step(16);
  h.outer.dispatchEvent(new h.window.Event('touchstart', { bubbles: true }));
  const position = h.outer.scrollLeft;
  h.step(32);
  assert.equal(h.outer.scrollLeft, position);
  assert.equal(sheetTouches, 0);
  h.step(3100);
  assert.ok(h.outer.scrollLeft > position);
});

test('fermer la fiche annule la boucle et retire le suivi des préférences', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.sheet.classList.remove('open');
  h.sheet.dispatchEvent(new h.window.Event('modalclosed'));
  assert.equal(h.frames.size, 0);
  h.sheet.classList.add('open');
  h.setReduced(false);
  assert.equal(h.frames.size, 0);
});

test('remplacer le contenu ne laisse pas une ancienne boucle active', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  assert.equal(h.frames.size, 1);
  h.outer.remove();
  h.step(16);
  assert.equal(h.frames.size, 0);
});

test('le casting sous une autre modale ne défile pas', async t => {
  const h = await motionHarness(t);
  h.window.setupDetailCastMotion(h.outer, h.sheet);
  h.step(0);
  h.sheet.setAttribute('aria-hidden', 'true');
  h.step(16);
  assert.equal(h.outer.scrollLeft, 0);
  h.sheet.setAttribute('aria-hidden', 'false');
  h.step(32);
  assert.ok(h.outer.scrollLeft > 0);
});

test('la vitesse est identique sur des écrans à 60 et 120 Hz', async t => {
  const a = await motionHarness(t);
  const b = await motionHarness(t);
  a.window.setupDetailCastMotion(a.outer, a.sheet);
  b.window.setupDetailCastMotion(b.outer, b.sheet);
  for (let i = 0; i <= 60; i++) a.step(i * 1000 / 60);
  for (let i = 0; i <= 120; i++) b.step(i * 1000 / 120);
  assert.ok(Math.abs(a.outer.scrollLeft - b.outer.scrollLeft) < 0.001);
});

test('une nouvelle note immédiate annule bien le comptage précédent', async t => {
  const h = await motionHarness(t);
  const score = h.window.document.createElement('span');
  score.textContent = '5.0';
  h.window.animateValueTowards(score, 8);
  assert.equal(h.frames.size, 1);
  h.window.animateValueTowards(score, 5);
  assert.equal(h.frames.size, 0);
  assert.equal(score.textContent, '5.0');
  h.window.animateValueTowards(score, 8);
  h.setReduced(true);
  h.window.animateValueTowards(score, 7);
  assert.equal(h.frames.size, 0);
  assert.equal(score.textContent, '7.0');
});
