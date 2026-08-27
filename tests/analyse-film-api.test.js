const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadHandler() {
  return (await import('../api/analyse-film.js')).default;
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function withGemini(testFn) {
  return async () => {
    const savedKey = process.env.GEMINI_API_KEY;
    const savedFetch = global.fetch;
    process.env.GEMINI_API_KEY = 'test-key';
    try { await testFn(); } finally {
      if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = savedKey;
      global.fetch = savedFetch;
    }
  };
}

function request(body, suffix) {
  return {
    method: 'POST',
    headers: { 'x-real-ip': `192.0.2.${suffix}` },
    body,
  };
}

describe('api/analyse-film.js — validation du contrat', () => {
  test('refuse les entrées trop longues avant tout appel Gemini', withGemini(async () => {
    const handler = await loadHandler();
    let called = false;
    global.fetch = async () => { called = true; throw new Error('ne doit pas être appelé'); };
    const res = makeRes();
    await handler(request({ titre: 'Heat', technique: 'x'.repeat(5_001), theme: '' }, 1), res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /trop longue/i);
    assert.equal(called, false);
  }));

  test('normalise et borne la réponse structurée du modèle', withGemini(async () => {
    const handler = await loadHandler();
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        synthese: '  Lecture précise du montage.  ',
        pointsForts: ['  Exemple concret  ', 'Rythme', 'Son', 'élément surnuméraire'],
        anglesMorts: ['Lumière'],
        questions: ['Pourquoi ce raccord ?'],
        champInjecte: 'ignoré',
      }) }] } }] }),
    });
    const res = makeRes();
    await handler(request({ titre: 'Heat', technique: 'Le montage alterne les regards.', theme: '' }, 2), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.retour, {
      synthese: 'Lecture précise du montage.',
      pointsForts: ['Exemple concret', 'Rythme', 'Son'],
      anglesMorts: ['Lumière'],
      questions: ['Pourquoi ce raccord ?'],
    });
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }));

  test('ne révèle pas le détail d erreur du fournisseur', withGemini(async () => {
    const handler = await loadHandler();
    global.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'clé interne et identifiant sensible' } }),
    });
    const res = makeRes();
    await handler(request({ titre: 'Heat', technique: 'Analyse', theme: '' }, 3), res);
    assert.equal(res.statusCode, 502);
    assert.doesNotMatch(res.body.error, /clé interne|identifiant sensible/i);
  }));
});
