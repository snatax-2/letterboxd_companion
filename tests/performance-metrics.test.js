const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppInJsdom } = require('./helpers/load-app-in-jsdom.js');

test('renderAll publie uniquement des mesures numériques locales', (t) => {
  const window = loadAppInJsdom(t);

  window.renderAll();
  window.renderAll();
  const summary = window.getLudexPerformanceSummary();

  assert.ok(summary.renderAll.count >= 2);
  assert.ok(Number.isFinite(summary.renderAll.averageMs));
  assert.ok(Number.isFinite(summary.renderAll.p95Ms));
  assert.deepEqual(Object.keys(summary.renderAll).sort(), ['averageMs', 'count', 'lastMs', 'maxMs', 'p95Ms']);
});
