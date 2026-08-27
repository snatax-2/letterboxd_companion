// Tests de l'authentification de la synchronisation cloud (api/sync.js).
//
// Ce qui est vérifié ici est précisément ce qui manquait avant : le code de
// synchronisation servait à la fois d'identifiant et de mot de passe, était
// accepté à partir de 4 caractères, et était stocké en clair. Quiconque
// devinait "dario" lisait — et écrasait — tout l'historique de quelqu'un.
//
// On teste le handler en lui injectant un faux `fetch` : pas de Supabase, pas
// de réseau, mais toutes les URLs et tous les corps envoyés sont observés.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// api/ est en ESM ("type": "module" dans api/package.json) : import dynamique.
async function loadHandler() {
  const mod = await import('../api/sync.js');
  return mod.default;
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

// `rows` : ce que la fausse base renvoie, indexé par la valeur de sync_code
// demandée. Tout appel sortant est enregistré dans `calls`.
function installFakeSupabase(rows) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body, headers: options.headers || {}, signal: options.signal });
    const method = options.method || 'GET';
    if (method === 'GET') {
      const match = String(url).match(/sync_code=eq\.([^&]+)/);
      const key = match ? decodeURIComponent(match[1]) : '';
      return { ok: true, json: async () => (rows[key] ? [rows[key]] : []) };
    }
    return { ok: true, json: async () => ({}), text: async () => '' };
  };
  return calls;
}

function withEnv(fn) {
  return async () => {
    const saved = { ...process.env };
    const savedFetch = global.fetch;
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';
    try { await fn(); } finally { process.env = saved; global.fetch = savedFetch; }
  };
}

describe('api/sync.js — authentification', () => {
  test('la lecture interroge d\'abord la forme hachée', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const calls = installFakeSupabase({});
    const res = makeRes();
    await handler({ method: 'GET', headers: { 'x-sync-code': code }, query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.ok(calls[0].url.includes(sha256(code)), 'la PREMIÈRE recherche doit porter sur sha256(code)');
    assert.ok(calls.every(call => call.signal instanceof AbortSignal), 'chaque appel Supabase doit avoir un délai maximal');
    // Le second appel interroge le code en clair : c'est le repli hérité,
    // volontaire (voir fetchRow dans api/sync.js). Il ne concerne que la
    // LECTURE d'une ligne créée avant ce changement — jamais une écriture.
  }));

  test('le code en clair n\'est jamais écrit en base', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const calls = installFakeSupabase({});
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': code }, query: {}, body: { history: [] } }, res);

    assert.equal(res.statusCode, 200);
    const ecritures = calls.filter(c => c.method === 'POST');
    assert.equal(ecritures.length, 1);
    const stocke = JSON.parse(ecritures[0].body).sync_code;
    assert.equal(stocke, sha256(code));
    assert.notEqual(stocke, code, 'une fuite de la base ne doit révéler aucun code utilisable');
  }));

  test('une ligne héritée (code en clair) reste lisible', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'dario'; // code court d'avant le changement
    installFakeSupabase({ [code]: { payload: { history: [{ title: 'Heat' }] }, updated_at: '2026-08-01T00:00:00Z' } });
    const res = makeRes();
    await handler({ method: 'GET', headers: { 'x-sync-code': code }, query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.found, true, 'les données déjà en base ne doivent pas devenir inaccessibles');
    assert.equal(res.body.payload.history[0].title, 'Heat');
  }));

  test('écrire sur un code hérité migre vers la forme hachée ET supprime la ligne en clair', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'dario';
    const calls = installFakeSupabase({ [code]: { payload: {}, updated_at: '2026-08-01T00:00:00Z' } });
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': code }, query: {}, body: { history: [] } }, res);

    assert.equal(res.statusCode, 200);
    const post = calls.find(c => c.method === 'POST');
    assert.ok(post, 'une écriture doit avoir lieu');
    assert.equal(JSON.parse(post.body).sync_code, sha256(code), 'la ligne doit être écrite sous sa forme hachée');

    const del = calls.find(c => c.method === 'DELETE');
    assert.ok(del, 'la ligne héritée doit être supprimée');
    assert.ok(del.url.includes(`sync_code=eq.${code}`), 'la suppression doit viser la ligne en clair');
  }));

  test('un code NEUF trop court est refusé', withEnv(async () => {
    const handler = await loadHandler();
    const calls = installFakeSupabase({}); // rien en base : le code est neuf
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': 'films' }, query: {}, body: { history: [] } }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /trop court/i);
    assert.equal(calls.filter(c => c.method === 'POST').length, 0, 'rien ne doit être écrit');
  }));

  test('un code NEUF suffisamment long est accepté', withEnv(async () => {
    const handler = await loadHandler();
    const calls = installFakeSupabase({});
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': 'Kx7mQp2rVn9tLb4wZc6dHy' }, query: {}, body: { history: [] } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
  }));

  test('le paramètre ?code= reste accepté en repli (anciens clients en cache)', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const calls = installFakeSupabase({});
    const res = makeRes();
    await handler({ method: 'GET', headers: {}, query: { code } }, res);

    assert.equal(res.statusCode, 200);
    assert.ok(calls.map(c => c.url).join(' ').includes(sha256(code)));
  }));

  test('un code au format invalide est refusé avant tout appel réseau', withEnv(async () => {
    const handler = await loadHandler();
    const calls = installFakeSupabase({});
    for (const mauvais of ['', 'ab', 'a'.repeat(65), 'code avec espace', '../../etc']) {
      const res = makeRes();
      await handler({ method: 'GET', headers: { 'x-sync-code': mauvais }, query: {} }, res);
      assert.equal(res.statusCode, 400, `attendu 400 pour ${JSON.stringify(mauvais)}`);
    }
    assert.equal(calls.length, 0, 'aucun appel Supabase ne doit partir sur un code invalide');
  }));

  test('un payload inconnu ou trop volumineux est refusé avant écriture', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const calls = installFakeSupabase({});

    const unknownRes = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': code }, query: {}, body: { history: [], secretUnexpected: true } }, unknownRes);
    assert.equal(unknownRes.statusCode, 400);
    assert.match(unknownRes.body.error, /inconnu/i);

    const hugeRes = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': code }, query: {}, body: { history: [{ title: 'x'.repeat(1_500_001) }] } }, hugeRes);
    assert.equal(hugeRes.statusCode, 400);
    assert.match(hugeRes.body.error, /volumineuse/i);
    assert.equal(calls.filter(call => call.method === 'POST').length, 0);
  }));

  test('une révision périmée produit 409 sans écraser la sauvegarde récente', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const latest = { payload: { history: [{ title: 'Récent' }] }, updated_at: '2026-08-27T12:00:00.000Z' };
    const calls = installFakeSupabase({ [sha256(code)]: latest });
    const res = makeRes();
    await handler({
      method: 'POST',
      headers: { 'x-sync-code': code, 'if-match': '2026-08-27T11:00:00.000Z' },
      query: {},
      body: { history: [{ title: 'Ancien' }] },
    }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.payload.history[0].title, 'Récent');
    assert.equal(res.body.revision, latest.updated_at);
    assert.equal(calls.filter(call => ['POST', 'PATCH'].includes(call.method)).length, 0);
  }));

  test('une révision courante utilise une mise à jour atomique', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    const revision = '2026-08-27T12:00:00.000Z';
    const calls = installFakeSupabase({ [sha256(code)]: { payload: { history: [] }, updated_at: revision } });
    const res = makeRes();
    await handler({
      method: 'POST',
      headers: { 'x-sync-code': code, 'if-match': revision },
      query: {},
      body: { history: [{ title: 'Heat' }] },
    }, res);

    assert.equal(res.statusCode, 200);
    const patchCall = calls.find(call => call.method === 'PATCH');
    assert.ok(patchCall, 'une mise à jour avec révision doit être atomique');
    assert.match(patchCall.url, /updated_at=eq\./);
  }));

  test('une écriture Supabase bloquée retourne une erreur de passerelle', withEnv(async () => {
    const handler = await loadHandler();
    const code = 'UnCodeSuffisammentLong123';
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      if (callCount <= 2) return { ok: true, json: async () => [] };
      throw new DOMException('Timeout', 'TimeoutError');
    };
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-sync-code': code }, query: {}, body: { history: [] } }, res);

    assert.equal(res.statusCode, 502);
    assert.match(res.body.error, /écriture cloud/i);
  }));
});

// Robustesse : le handler ne doit pas planter si la plateforme ne fournit pas
// req.query (le cas hors Vercel, ou sur un runtime différent).
test('un req sans query ne fait pas planter le handler', async () => {
  const saved = { ...process.env };
  const savedFetch = global.fetch;
  process.env.SUPABASE_URL = 'https://fake.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'k';
  installFakeSupabase({});
  try {
    const handler = await loadHandler();
    const res = makeRes();
    await handler({ method: 'GET', headers: { 'x-sync-code': 'UnCodeSuffisammentLong123' } }, res);
    assert.equal(res.statusCode, 200);
  } finally { process.env = saved; global.fetch = savedFetch; }
});
