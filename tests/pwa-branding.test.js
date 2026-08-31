const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

for (const [file, size] of [
  ['favicon.png', 64], ['apple-touch-icon.png', 180],
  ['icon-192.png', 192], ['icon-512.png', 512],
  ['icon-maskable-192.png', 192], ['icon-maskable-512.png', 512],
]) {
  test(`${file} : PNG opaque aux dimensions attendues`, () => {
    const png = fs.readFileSync(path.join(root, file));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[24], 8);
    assert.equal(png[25], 2, 'RGB sans canal alpha');
    let offset = 8;
    while (offset < png.length) {
      const length = png.readUInt32BE(offset);
      assert.notEqual(png.toString('ascii', offset + 4, offset + 8), 'tRNS', 'Pas de transparence');
      offset += length + 12;
    }
  });
}

test('manifest : icônes ordinaires et adaptables distinctes, identité préservée', () => {
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.short_name, 'Ludex');
  for (const size of [192, 512]) {
    const normal = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'any');
    const maskable = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'maskable');
    assert.ok(normal && maskable);
    assert.notEqual(normal.src, maskable.src);
    for (const icon of [normal, maskable]) {
      const url = new URL(icon.src, 'https://example.com/');
      assert.equal(url.searchParams.get('v'), 'ludex-l1');
      assert.ok(fs.existsSync(path.join(root, url.pathname)));
    }
  }
});

test('favicon, iPhone et écran de démarrage référencent les nouvelles icônes', () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.equal(doc.querySelector('link[rel="icon"]').getAttribute('sizes'), '64x64');
  assert.equal(doc.querySelector('link[rel="apple-touch-icon"]').getAttribute('sizes'), '180x180');
  assert.equal(doc.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'), 'apple-touch-icon.png?v=ludex-l1');
  assert.equal(doc.querySelector('#app-splash img').getAttribute('src'), 'icon-192.png?v=ludex-l1');
  dom.window.close();
});

test('le cache hors ligne inclut toutes les icônes avec les mêmes URLs que le HTML et le manifest', async () => {
  const handlers = {};
  let cached = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self: { addEventListener: (name, callback) => { handlers[name] = callback; }, skipWaiting: async () => {} },
    caches: { open: async () => ({ addAll: async urls => { cached = Array.from(urls); } }) },
  });
  let installation;
  handlers.install({ waitUntil: promise => { installation = promise; } });
  await installation;
  const dom = new JSDOM(html);
  const urls = manifest.icons.map(icon => icon.src);
  for (const selector of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    urls.push(dom.window.document.querySelector(selector).getAttribute('href'));
  }
  urls.push(dom.window.document.querySelector('#app-splash img').getAttribute('src'));
  for (const url of urls) assert.ok(cached.includes('/' + url), `URL absente du cache : ${url}`);
  dom.window.close();

  const hashScript = fs.readFileSync(path.join(root, 'scripts/generate-sw-cache.js'), 'utf8');
  const files = vm.runInNewContext(hashScript.match(/const APP_SHELL_FILES = (\[[\s\S]*?\]);/)[1]);
  const cachedFiles = [...new Set(cached.map(url => new URL(url, 'https://example.com/').pathname.slice(1) || 'index.html'))].sort();
  assert.deepEqual(Array.from(files).sort(), cachedFiles, 'Les icônes doivent aussi participer au hash de mise à jour');
});
