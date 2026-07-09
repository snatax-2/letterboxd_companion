// Tests du rate limiting de l'API (/api/search, /api/sync).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function fakeReqRes(ip) {
  const headers = {};
  const req = { headers: { 'x-forwarded-for': ip }, query: {} };
  const res = { setHeader: (k, v) => { headers[k] = v; }, headers };
  return { req, res };
}

describe('rateLimit', async () => {
  const { rateLimit } = await import('../api/_rateLimit.js');

  test('autorise les requêtes sous la limite', () => {
    const { req, res } = fakeReqRes('1.1.1.1');
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimit(req, res, { name: 'test-under', limit: 10, windowMs: 60000 }), true);
    }
  });

  test('bloque au-delà de la limite, sur la même fenêtre de temps', () => {
    const { req, res } = fakeReqRes('2.2.2.2');
    let allowed = 0, blocked = 0;
    for (let i = 0; i < 15; i++) {
      const ok = rateLimit(req, res, { name: 'test-over', limit: 10, windowMs: 60000 });
      ok ? allowed++ : blocked++;
    }
    assert.equal(allowed, 10);
    assert.equal(blocked, 5);
  });

  test('pose un en-tête Retry-After une fois bloqué', () => {
    const { req, res } = fakeReqRes('3.3.3.3');
    for (let i = 0; i < 5; i++) rateLimit(req, res, { name: 'test-retry', limit: 3, windowMs: 60000 });
    assert.ok(Number(res.headers['Retry-After']) > 0);
  });

  test('deux IP différentes ont des compteurs indépendants', () => {
    const a = fakeReqRes('4.4.4.4');
    const b = fakeReqRes('5.5.5.5');
    for (let i = 0; i < 10; i++) rateLimit(a.req, a.res, { name: 'test-ip-a', limit: 10, windowMs: 60000 });
    const stillOk = rateLimit(b.req, b.res, { name: 'test-ip-a', limit: 10, windowMs: 60000 });
    assert.equal(stillOk, true);
  });

  test('un identifiant explicite (ex: code de sync) prime sur l\'IP', () => {
    const reqA = fakeReqRes('6.6.6.6').req;
    const reqB = fakeReqRes('7.7.7.7').req;
    const { res: resA } = fakeReqRes('6.6.6.6');
    const { res: resB } = fakeReqRes('7.7.7.7');
    for (let i = 0; i < 5; i++) rateLimit(reqA, resA, { name: 'test-code', limit: 5, windowMs: 60000, identifier: 'code-partage' });
    const blocked = rateLimit(reqB, resB, { name: 'test-code', limit: 5, windowMs: 60000, identifier: 'code-partage' });
    assert.equal(blocked, false);
  });

  test('deux noms de limite différents ne se marchent pas dessus', () => {
    const { req, res } = fakeReqRes('8.8.8.8');
    for (let i = 0; i < 10; i++) rateLimit(req, res, { name: 'search', limit: 10, windowMs: 60000 });
    const stillOk = rateLimit(req, res, { name: 'sync-ip', limit: 10, windowMs: 60000 });
    assert.equal(stillOk, true);
  });
});
