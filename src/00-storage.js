// ═══════════════════════════════════════════
//  PERSISTANCE LOCALE — GARDE-FOUS
// ═══════════════════════════════════════════
// Chargé avant les migrations : les données personnelles illisibles sont
// préservées avant tout repli, et les erreurs de quota deviennent visibles.

const STORAGE_RECOVERY_PREFIX = 'lbx_recovery_';
const storageWriteBlockedKeys = new Set();
const notifiedStorageIssues = new Set();

function isStorageObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const LUDEX_STORAGE_REGISTRY = Object.freeze({
  history: Object.freeze({ key: 'lbx_v2', version: 2, validate: Array.isArray, exportField: 'history', synchronized: true, label: 'historique' }),
  tvShows: Object.freeze({ key: 'lbx_tv_shows', version: 1, validate: Array.isArray, exportField: 'tvShows', synchronized: true, label: 'séries' }),
  analyses: Object.freeze({ key: 'lbx_analyses', version: 1, validate: Array.isArray, exportField: 'analyses', synchronized: true, label: 'analyses' }),
  duels: Object.freeze({ key: 'lbx_duels', version: 1, validate: isStorageObject, exportField: 'duels', synchronized: true, label: 'duels' }),
  settings: Object.freeze({ key: 'lbx_settings', version: 1, validate: isStorageObject, exportField: 'settings', synchronized: true, label: 'réglages' }),
  ownedProviders: Object.freeze({ key: 'lbx_owned_providers', version: 1, validate: Array.isArray, exportField: 'ownedProviders', synchronized: true, label: 'plateformes' }),
  watchlists: Object.freeze({ keyPrefix: 'lbx_watchlist_', version: 1, validate: Array.isArray, exportField: 'watchlists', synchronized: true, label: 'listes de films' }),
  tvWatchlists: Object.freeze({ keyPrefix: 'lbx_tv_watchlist_', version: 1, validate: Array.isArray, exportField: 'tvWatchlists', synchronized: true, label: 'listes de séries' }),
  tombstones: Object.freeze({ keyPattern: 'tombstone', version: 1, validate: Array.isArray, exportField: 'tombstones', synchronized: true, label: 'traces de suppression' }),
});

function storageLabel(key) {
  const fixed = Object.values(LUDEX_STORAGE_REGISTRY).find(entry => entry.key === key);
  if (fixed) return fixed.label;
  if (key.startsWith(LUDEX_STORAGE_REGISTRY.tvWatchlists.keyPrefix)) return LUDEX_STORAGE_REGISTRY.tvWatchlists.label;
  if (key.startsWith(LUDEX_STORAGE_REGISTRY.watchlists.keyPrefix)) return LUDEX_STORAGE_REGISTRY.watchlists.label;
  if (key.includes('tombstone')) return LUDEX_STORAGE_REGISTRY.tombstones.label;
  return key;
}

function notifyStorageIssue(kind, key, error) {
  const issueKey = `${kind}:${key}`;
  if (notifiedStorageIssues.has(issueKey)) return;
  notifiedStorageIssues.add(issueKey);
  console.warn(`[Ludex storage:${kind}] ${key}`, error || '');
  const label = storageLabel(key);
  const message = kind === 'corrupt'
    ? `Données locales illisibles (${label}) : une copie de récupération sera incluse au prochain export.`
    : kind === 'blocked'
      ? `Impossible de sécuriser ${label} : écriture bloquée pour préserver les données originales.`
      : `Stockage local plein ou indisponible (${label}) : exporte tes données avant de continuer.`;
  const notify = () => {
    if (typeof showToast === 'function') showToast(message);
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(notify);
  else setTimeout(notify, 0);
}

function storageRawHash(raw) {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function recoveryStorageKey(key, raw) {
  return `${STORAGE_RECOVERY_PREFIX}${encodeURIComponent(key)}_${storageRawHash(raw)}`;
}

function preserveCorruptStorage(key, raw, error) {
  const recoveryKey = recoveryStorageKey(key, raw);
  try {
    if (localStorage.getItem(recoveryKey) === null) {
      localStorage.setItem(recoveryKey, JSON.stringify({
        key,
        detectedAt: new Date().toISOString(),
        reason: error instanceof Error ? error.message.slice(0, 200) : 'JSON invalide',
        raw,
      }));
    }
    return true;
  } catch (backupError) {
    storageWriteBlockedKeys.add(key);
    notifyStorageIssue('blocked', key, backupError);
    return false;
  }
}

function readJsonStorage(key, fallback = null, validator = null) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    notifyStorageIssue('unavailable', key, error);
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw);
    if (validator && !validator(value)) throw new TypeError('Schéma local inattendu');
    return value ?? fallback;
  } catch (error) {
    preserveCorruptStorage(key, raw, error);
    notifyStorageIssue('corrupt', key, error);
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (storageWriteBlockedKeys.has(key)) {
    notifyStorageIssue('blocked', key);
    return false;
  }
  let serialized;
  try {
    serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('Valeur non sérialisable');
  } catch (error) {
    notifyStorageIssue('unavailable', key, error);
    return false;
  }
  try {
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    notifyStorageIssue('unavailable', key, error);
    return false;
  }
}

function writeTextStorage(key, value) {
  if (storageWriteBlockedKeys.has(key)) {
    notifyStorageIssue('blocked', key);
    return false;
  }
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    notifyStorageIssue('unavailable', key, error);
    return false;
  }
}

function readRegisteredStorage(name, fallback = null) {
  const entry = LUDEX_STORAGE_REGISTRY[name];
  if (!entry?.key) throw new Error(`Stockage Ludex inconnu : ${name}`);
  return readJsonStorage(entry.key, fallback, entry.validate);
}

function writeRegisteredStorage(name, value) {
  const entry = LUDEX_STORAGE_REGISTRY[name];
  if (!entry?.key) throw new Error(`Stockage Ludex inconnu : ${name}`);
  if (!entry.validate(value)) {
    notifyStorageIssue('unavailable', entry.key, new TypeError('Schéma local inattendu'));
    return false;
  }
  return writeJsonStorage(entry.key, value);
}

function collectStorageRecovery() {
  const recovered = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const recoveryKey = localStorage.key(i);
      if (!recoveryKey?.startsWith(STORAGE_RECOVERY_PREFIX)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(recoveryKey));
        if (value && typeof value.key === 'string' && typeof value.raw === 'string') {
          recovered.push({ ...value, recoveryKey });
        }
      } catch { /* une copie de récupération endommagée est ignorée, jamais réécrite */ }
    }
  } catch (error) {
    notifyStorageIssue('unavailable', 'récupération', error);
  }
  return recovered.sort((a, b) => String(a.detectedAt).localeCompare(String(b.detectedAt)));
}
