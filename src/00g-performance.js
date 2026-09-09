// ═══════════════════════════════════════════
//  MESURES DE PERFORMANCE LOCALES
// ═══════════════════════════════════════════
// Aucune télémétrie ne quitte le navigateur. Ces mesures servent uniquement
// à vérifier les vrais coûts avant d'optimiser renderAll() ou les statistiques.

const LUDEX_PERFORMANCE_SAMPLE_LIMIT = 50;
const ludexPerformanceSamples = new Map();

function ludexNow() {
  return typeof performance?.now === 'function' ? performance.now() : Date.now();
}

function recordLudexPerformance(name, duration) {
  if (!Number.isFinite(duration) || duration < 0) return;
  const samples = ludexPerformanceSamples.get(name) || [];
  samples.push(duration);
  if (samples.length > LUDEX_PERFORMANCE_SAMPLE_LIMIT) samples.shift();
  ludexPerformanceSamples.set(name, samples);
}

function measureLudexPerformance(name, callback) {
  const startedAt = ludexNow();
  try {
    return callback();
  } finally {
    recordLudexPerformance(name, ludexNow() - startedAt);
  }
}

function getLudexPerformanceSummary() {
  return Object.fromEntries([...ludexPerformanceSamples.entries()].map(([name, samples]) => {
    const sorted = [...samples].sort((a, b) => a - b);
    const total = samples.reduce((sum, value) => sum + value, 0);
    const percentileIndex = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return [name, {
      count: samples.length,
      averageMs: Number((total / samples.length).toFixed(2)),
      p95Ms: Number(sorted[percentileIndex].toFixed(2)),
      maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
      lastMs: Number(samples[samples.length - 1].toFixed(2)),
    }];
  }));
}

window.getLudexPerformanceSummary = getLudexPerformanceSummary;
