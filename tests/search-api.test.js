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

  test('la recherche multi normalise films, séries et personnes en un seul appel', withEnv(async () => {
    const handler = await loadHandler();
    let requestedUrl = '';
    global.fetch = async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          results: [
            { id: 1, media_type: 'movie', title: 'Heat', release_date: '1995-12-15', poster_path: '/heat.jpg' },
            { id: 2, media_type: 'tv', name: 'The Bear', first_air_date: '2022-06-23', poster_path: '/bear.jpg' },
            {
              id: 3, media_type: 'person', name: 'Michael Mann', profile_path: '/mann.jpg',
              known_for_department: 'Directing',
              known_for: [{ title: 'Heat' }, { title: 'Collateral' }, { title: 'Thief' }, { title: 'Manhunter' }],
            },
            { id: 4, media_type: 'collection', name: 'Résultat hors périmètre' },
          ],
        }),
      };
    };
    const res = makeRes();
    await handler(request({ multiQuery: 'Michael Mann' }, 5), res);

    assert.equal(res.statusCode, 200);
    assert.match(requestedUrl, /\/search\/multi\?/);
    assert.match(requestedUrl, /query=Michael%20Mann/);
    assert.equal(res.body.results.length, 3);
    assert.deepEqual(res.body.results.map(item => item.media_type), ['movie', 'tv', 'person']);
    assert.equal(res.body.results[1].title, 'The Bear');
    assert.equal(res.body.results[1].release_date, '2022-06-23');
    assert.deepEqual(res.body.results[2].known_for, ['Heat', 'Collateral', 'Thief']);
    assert.match(res.headers['Cache-Control'], /s-maxage=3600/);
  }));

  test('refuse une recherche multi composée uniquement d espaces', withEnv(async () => {
    const handler = await loadHandler();
    let called = false;
    global.fetch = async () => { called = true; };
    const res = makeRes();
    await handler(request({ multiQuery: '   ' }, 6), res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
    assert.match(res.headers['Cache-Control'], /no-store/);
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
