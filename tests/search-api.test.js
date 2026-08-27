const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadHandler() {
  return (await import('../api/search.js')).default;
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
    send(body) { this.body = body; return this; },
  };
}

function request(query, ip) {
  return { query, headers: { 'x-real-ip': `198.51.100.${ip}` } };
}

function withEnv(testFn) {
  return async () => {
    const savedKey = process.env.TMDB_KEY;
    const savedFetch = global.fetch;
    process.env.TMDB_KEY = 'tmdb-test-key';
    try { await testFn(); } finally {
      if (savedKey === undefined) delete process.env.TMDB_KEY;
      else process.env.TMDB_KEY = savedKey;
      global.fetch = savedFetch;
    }
  };
}

describe('api/search.js — contrat TMDb', () => {
  test('refuse une recherche vide sans appeler TMDb', withEnv(async () => {
    const handler = await loadHandler();
    let called = false;
    global.fetch = async () => { called = true; };
    const res = makeRes();
    await handler(request({}, 1), res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
  }));

  test('convertit un statut TMDb en erreur de passerelle non mise en cache', withEnv(async () => {
    const handler = await loadHandler();
    global.fetch = async () => ({ ok: false, status: 503 });
    const res = makeRes();
    await handler(request({ query: 'Heat' }, 2), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.match(res.body.error, /indisponible/i);
  }));

  test('renvoie et met en cache une réponse TMDb valide', withEnv(async () => {
    const handler = await loadHandler();
    global.fetch = async () => ({ ok: true, json: async () => ({ results: [{ id: 949, title: 'Heat' }] }) });
    const res = makeRes();
    await handler(request({ query: 'Heat' }, 3), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.results[0].title, 'Heat');
    assert.match(res.headers['Cache-Control'], /s-maxage=3600/);
  }));

  test('le proxy image rejette les faux sous-domaines TMDb', withEnv(async () => {
    const handler = await loadHandler();
    let called = false;
    global.fetch = async () => { called = true; };
    const res = makeRes();
    await handler(request({ img: 'https://image.tmdb.org.example.com/evil.jpg' }, 4), res);
    assert.equal(res.statusCode, 403);
    assert.equal(called, false);
  }));
});
