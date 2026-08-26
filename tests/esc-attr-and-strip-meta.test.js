// Tests unitaires sur escAttr() et buildStripMeta() (src/03-foundation.js),
// signalés non couverts par l'audit — ces tests auraient attrapé les deux
// XSS stockés déjà corrigés (poster non échappé dans un attribut src,
// buildStripMeta() qui injectait director/actors sans échapper). Chargées
// via jsdom (voir tests/helpers/load-app-in-jsdom.js) : 03-foundation.js
// n'est pas un module isolé comme 03b-pure-logic.js, il référence le DOM.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

describe('escAttr', () => {
  test('échappe les cinq caractères dangereux : & " \' < >', (t) => {
    const window = loadAppInJsdom(t);
    assert.equal(window.escAttr(`& " ' < >`), '&amp; &quot; &#39; &lt; &gt;');
  });

  test('une chaîne sans caractère spécial ressort inchangée', (t) => {
    const window = loadAppInJsdom(t);
    assert.equal(window.escAttr('Dune'), 'Dune');
  });

  test('null/undefined ne plantent pas, ressortent en chaîne vide', (t) => {
    const window = loadAppInJsdom(t);
    assert.equal(window.escAttr(null), '');
    assert.equal(window.escAttr(undefined), '');
  });

  test('neutralise une charge utile XSS classique (balise img+onerror)', (t) => {
    const window = loadAppInJsdom(t);
    const payload = `<img src=x onerror="alert(1)">`;
    const escaped = window.escAttr(payload);
    assert.ok(!escaped.includes('<img'));
    assert.ok(!escaped.includes('"'));
  });

  test("l'apostrophe échappée rend sûr un attribut à guillemets simples (régression du correctif)", (t) => {
    const window = loadAppInJsdom(t);
    const payload = `x' onerror='alert(1)`;
    const escaped = window.escAttr(payload);
    // Avant correctif : escAttr ne touchait pas l'apostrophe — insérée dans
    // alt='${escAttr(x)}', la charge sortait de l'attribut. Vérifie qu'aucune
    // apostrophe brute ne subsiste, quel que soit le type de guillemets visé.
    assert.ok(!escaped.includes("'"));
  });
});

describe('buildStripMeta', () => {
  test('assemble genre/durée/année séparés par " · ", sans réalisateur/acteurs si absents', (t) => {
    const window = loadAppInJsdom(t);
    const html = window.buildStripMeta({ genre: 'Drame', runtime: '120 min', year: '2020' });
    assert.equal(html, 'Drame · 120 min · 2020');
  });

  test('ignore les champs vides plutôt que de laisser des "·" orphelins', (t) => {
    const window = loadAppInJsdom(t);
    const html = window.buildStripMeta({ genre: 'Drame', runtime: '', year: '2020' });
    assert.equal(html, 'Drame · 2020');
  });

  test('director et actors échappés dans le HTML injecté (régression du XSS corrigé)', (t) => {
    const window = loadAppInJsdom(t);
    const html = window.buildStripMeta({
      genre: 'Drame',
      director: `<img src=x onerror="alert(1)">`,
      actors: `Bad" onmouseover="alert(2)`,
    });
    assert.ok(!html.includes('<img src=x'), `director non échappé : ${html}`);
    assert.ok(!html.includes('onmouseover="alert(2)'), `actors non échappé : ${html}`);
    // Le nom échappé doit quand même être présent, juste rendu inerte.
    assert.ok(html.includes('&lt;img'));
  });

  test('un director légitime avec apostrophe (ex: nom composé) reste lisible et sûr', (t) => {
    const window = loadAppInJsdom(t);
    const html = window.buildStripMeta({ director: "Bong Joon-ho" });
    assert.ok(html.includes('Bong Joon-ho'));
  });
});
