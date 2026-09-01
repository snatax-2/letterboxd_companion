const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadHandler() {
  return (await import('../api/monthly-selection.js')).default;
}

function makeRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(ip) {
  return { query: { month: '2026-09' }, headers: { 'x-real-ip': `198.51.100.${ip}` } };
}

function withEnv(testFn) {
  return async () => {
    const oldTmdb = process.env.TMDB_KEY;
    const oldGemini = process.env.GEMINI_API_KEY;
    const oldFetch = global.fetch;
    process.env.TMDB_KEY = 'tmdb-test-key';
    try { await testFn(); } finally {
      if (oldTmdb === undefined) delete process.env.TMDB_KEY; else process.env.TMDB_KEY = oldTmdb;
      if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
      global.fetch = oldFetch;
    }
  };
}

describe('api/monthly-selection.js — sélection mensuelle', () => {
  test('renvoie 1 film US et 3 films de pays étrangers distincts, sans appel Gemini', withEnv(async () => {
    const handler = await loadHandler();
    const countryCodes = [];
    global.fetch = async url => {
      const address = String(url);
      const code = new URL(address).searchParams.get('with_origin_country');
      countryCodes.push(code);
      return { ok: true, json: async () => ({ results: Array.from({ length: 8 }, (_, index) => ({
        id: `${code}-${index + 1}`, title: `${code} Film ${index + 1}`, poster_path: '/poster.jpg', vote_average: 8,
        overview: 'Synopsis de test.', release_date: '2020-01-01',
      })) }) };
    };
    const res = makeRes();
    await handler(request(81), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.editorial, null);
    assert.equal(res.body.films.filter(film => film.countryCode === 'US').length, 1);
    assert.equal(new Set(res.body.films.filter(film => film.countryCode !== 'US').map(film => film.countryCode)).size, 3);
    assert.match(res.headers['Cache-Control'], /s-maxage=2592000/);
  }));

  test('retombe sur une sélection contrôlée même si GEMINI_API_KEY existe', withEnv(async () => {
    const handler = await loadHandler();
    process.env.GEMINI_API_KEY = 'gemini-ne-doit-pas-etre-utilisee';
    global.fetch = async url => {
      assert.doesNotMatch(String(url), /generativelanguage\.googleapis\.com/);
      const code = new URL(String(url)).searchParams.get('with_origin_country');
      return { ok: true, json: async () => ({ results: [{
        id: `${code}-1`, title: `${code} Film`, poster_path: '/poster.jpg', vote_average: 8,
      }] }) };
    };
    const res = makeRes();
    await handler(request(82), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.editorial, null);
    assert.equal(res.body.films.filter(film => film.countryCode === 'US').length, 1);
    assert.equal(new Set(res.body.films.filter(film => film.countryCode !== 'US').map(film => film.countryCode)).size, 3);
  }));
});
