const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadHandler() {
  return (await import('../api/streaming-links.js')).default;
}

function makeRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(query, ip = 90) {
  return { query, headers: { 'x-real-ip': `198.51.100.${ip}` } };
}

function withEnv(testFn) {
  return async () => {
    const oldKey = process.env.WATCHMODE_API_KEY;
    const oldFetch = global.fetch;
    process.env.WATCHMODE_API_KEY = 'watchmode-test-key';
    try { await testFn(); } finally {
      if (oldKey === undefined) delete process.env.WATCHMODE_API_KEY;
      else process.env.WATCHMODE_API_KEY = oldKey;
      global.fetch = oldFetch;
    }
  };
}

describe('api/streaming-links.js — destinations Watchmode', () => {
  test('ne divulgue jamais la clé et ne retourne que des destinations HTTPS belges', withEnv(async () => {
    const handler = await loadHandler();
    let url = '';
    let headers = {};
    global.fetch = async (requestedUrl, options) => {
      url = String(requestedUrl);
      headers = options.headers;
      return { ok: true, json: async () => ([
        { name: 'Netflix', type: 'sub', region: 'BE', web_url: 'https://www.netflix.com/title/1' },
        { name: 'Invalide', type: 'sub', region: 'BE', web_url: 'javascript:alert(1)' },
        { name: 'France', type: 'sub', region: 'FR', web_url: 'https://example.com/fr' },
      ]) };
    };
    const res = makeRes();
    await handler(request({ id: '278', mediaType: 'movie', region: 'BE' }), res);
    assert.equal(res.statusCode, 200);
    assert.match(url, /\/title\/movie-278\/sources\/\?regions=BE$/);
    assert.equal(headers['X-API-Key'], 'watchmode-test-key');
    assert.equal(url.includes('watchmode-test-key'), false);
    assert.deepEqual(res.body.links, [{ name: 'Netflix', type: 'sub', url: 'https://www.netflix.com/title/1' }]);
    assert.match(res.headers['Cache-Control'], /s-maxage=2592000/);
  }));

  test('refuse les paramètres qui ne correspondent pas au périmètre belge', withEnv(async () => {
    const handler = await loadHandler();
    let called = false;
    global.fetch = async () => { called = true; };
    const res = makeRes();
    await handler(request({ id: 'not-an-id', mediaType: 'person', region: 'US' }, 91), res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
  }));
});
