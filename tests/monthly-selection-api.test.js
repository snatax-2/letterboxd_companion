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
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    try { await testFn(); } finally {
      if (oldTmdb === undefined) delete process.env.TMDB_KEY; else process.env.TMDB_KEY = oldTmdb;
      if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
      global.fetch = oldFetch;
    }
  };
}

describe('api/monthly-selection.js — curation Gemini', () => {
  test('Gemini choisit dans le vivier et la contrainte 1 US + 3 pays étrangers est validée', withEnv(async () => {
    const handler = await loadHandler();
    const countryCodes = [];
    global.fetch = async url => {
      const address = String(url);
      if (address.includes('generativelanguage.googleapis.com')) {
        const foreign = countryCodes.filter(code => code !== 'US');
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
          title: 'Voyages intérieurs', intro: 'Quatre récits où le déplacement révèle une fracture intime.',
          filmIds: ['US-1', `${foreign[2]}-3`, `${foreign[1]}-2`, `${foreign[0]}-1`],
          reasons: { 'US-1': 'Point de départ.', [`${foreign[2]}-3`]: 'Écho sensible.' },
        }) }] } }] }) };
      }
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
    assert.equal(res.body.editorial.title, 'Voyages intérieurs');
    assert.equal(res.body.films.filter(film => film.countryCode === 'US').length, 1);
    assert.equal(new Set(res.body.films.filter(film => film.countryCode !== 'US').map(film => film.countryCode)).size, 3);
    assert.match(res.headers['Cache-Control'], /s-maxage=2592000/);
  }));

  test('une réponse Gemini invalide retombe sur une sélection contrôlée', withEnv(async () => {
    const handler = await loadHandler();
    global.fetch = async url => {
      if (String(url).includes('generativelanguage.googleapis.com')) {
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
          title: 'Choix invalide', intro: 'Ne doit pas être retenu.', filmIds: ['US-1', 'US-1', 'US-1', 'US-1'],
        }) }] } }] }) };
      }
      const code = new URL(String(url)).searchParams.get('with_origin_country');
      return { ok: true, json: async () => ({ results: [{
        id: `${code}-1`, title: `${code} Film`, poster_path: '/poster.jpg', vote_average: 8,
      }] }) };
    };
    const res = makeRes();
    await handler(request(82), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.editorial.title, 'Regards croisés');
    assert.equal(res.body.films.filter(film => film.countryCode === 'US').length, 1);
    assert.equal(new Set(res.body.films.filter(film => film.countryCode !== 'US').map(film => film.countryCode)).size, 3);
  }));
});
