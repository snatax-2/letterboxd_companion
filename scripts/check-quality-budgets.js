// Garde-fous mesurables issus de l'audit : poids gzip du cœur et taille du
// DOM initial. La minification est faite en mémoire, sans modifier les fichiers.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const KIB = 1024;
const BUDGETS = Object.freeze({
  javascriptGzip: 90 * KIB,
  cssGzip: 45 * KIB,
  htmlGzip: 25 * KIB,
  coreGzip: 150 * KIB,
  initialDomNodes: 1_200,
});

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function gzipSize(content) {
  return zlib.gzipSync(content, { level: 9 }).byteLength;
}

function kib(bytes) {
  return `${(bytes / KIB).toFixed(1)} KiB`;
}

async function run() {
  const jsResult = await minify(read('app.js'), {
    compress: true,
    mangle: true,
    format: { comments: false },
  });
  if (jsResult.error || typeof jsResult.code !== 'string') throw jsResult.error || new Error('Minification JavaScript vide');

  const cssResult = new CleanCSS({ level: 2 }).minify(read('styles.css'));
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('\n'));

  const html = read('index.html');
  const dom = new JSDOM(html);
  const initialDomNodes = dom.window.document.querySelectorAll('*').length;
  dom.window.close();

  const measurements = {
    javascriptGzip: gzipSize(jsResult.code),
    cssGzip: gzipSize(cssResult.styles),
    htmlGzip: gzipSize(html),
    initialDomNodes,
  };
  measurements.coreGzip = measurements.javascriptGzip + measurements.cssGzip + measurements.htmlGzip;

  const labels = {
    javascriptGzip: 'JavaScript gzip',
    cssGzip: 'CSS gzip',
    htmlGzip: 'HTML gzip',
    coreGzip: 'Cœur total gzip',
    initialDomNodes: 'Nœuds DOM initiaux',
  };
  const failures = [];
  for (const [name, value] of Object.entries(measurements)) {
    const limit = BUDGETS[name];
    const format = name === 'initialDomNodes' ? String : kib;
    console.log(`[quality-budget] ${labels[name]} : ${format(value)} / ${format(limit)}`);
    if (value > limit) failures.push(`${labels[name]} dépasse le budget (${format(value)} > ${format(limit)})`);
  }

  if (failures.length) {
    for (const failure of failures) console.error(`[quality-budget] ÉCHEC : ${failure}`);
    process.exitCode = 1;
  }
}

run().catch(error => {
  console.error('[quality-budget] mesure impossible :', error);
  process.exit(1);
});
