// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + watchlist + réglages.
//
// - Sauvegarde (push) : automatique en arrière-plan dès qu'un changement est
//   détecté localement (toutes les 45s), + bouton manuel pour forcer/rassurer.
// - Restauration (pull) : TOUJOURS manuelle et avec confirmation, pour ne jamais
//   écraser des données locales sans que l'utilisateur l'ait explicitement demandé.

const SYNC_CODE_KEY = 'lbx_sync_code';
const SYNC_LAST_HASH_KEY = 'lbx_sync_last_hash';
const SYNC_LAST_TIME_KEY = 'lbx_sync_last_time';

const syncCodeInput = document.getElementById('setting-sync-code');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncRestoreBtn = document.getElementById('sync-restore-btn');
const syncStatusEl = document.getElementById('sync-status');

function getSyncCode() {
  return (localStorage.getItem(SYNC_CODE_KEY) || '').trim();
}

function setSyncCode(code) {
  localStorage.setItem(SYNC_CODE_KEY, code.trim());
}

function setSyncStatus(msg, isError = false) {
  syncStatusEl.textContent = msg;
  syncStatusEl.style.color = isError ? '#ff4040' : 'var(--text-mid)';
}

function buildSyncPayload() {
  return {
    history: loadHistory(),
    watchlist: loadWatchlist(),
    settings: JSON.parse(localStorage.getItem('lbx_settings') || 'null'),
  };
}

function applySyncPayload(payload) {
  if (Array.isArray(payload.history)) saveHistory(payload.history);
  if (Array.isArray(payload.watchlist)) saveWatchlist(payload.watchlist);
  if (payload.settings) localStorage.setItem('lbx_settings', JSON.stringify(payload.settings));
  applySettings(payload.settings || JSON.parse(localStorage.getItem('lbx_settings') || '{}'));
  renderAll();
  renderWatchlist();
}

// Hash simple (non cryptographique), juste pour détecter un changement de contenu
// sans avoir à ré-uploader à chaque tick si rien n'a bougé.
function hashPayload(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

async function pushToCloud(silent = false) {
  const code = getSyncCode();
  if (!code) {
    if (!silent) setSyncStatus('Renseigne un code de synchronisation avant de sauvegarder.', true);
    return false;
  }
  const payload = buildSyncPayload();
  if (!silent) setSyncStatus('Sauvegarde en cours…');
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('bad status');
    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(payload));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Sauvegardé dans le cloud ✓ (${formatDateTime(now)})`);
    return true;
  } catch {
    if (!silent) setSyncStatus('Échec de la sauvegarde cloud. Vérifie ta connexion.', true);
    return false;
  }
}

async function pullFromCloud() {
  const code = getSyncCode();
  if (!code) {
    setSyncStatus('Renseigne un code de synchronisation avant de restaurer.', true);
    return;
  }
  setSyncStatus('Vérification du cloud…');
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'bad status');
    if (!data.found) {
      setSyncStatus('Aucune sauvegarde trouvée pour ce code.', true);
      return;
    }
    const formatted = formatDateTime(data.updatedAt);
    openModal(
      'Restaurer depuis le cloud ?',
      `Ceci va remplacer ton historique, ta watchlist et tes réglages actuels par la sauvegarde cloud du ${formatted}. Pense à exporter tes données locales avant si tu veux les garder en plus.`,
      () => {
        applySyncPayload(data.payload);
        localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(data.payload));
        localStorage.setItem(SYNC_LAST_TIME_KEY, data.updatedAt);
        setSyncStatus(`Restauré depuis le cloud ✓ (sauvegarde du ${formatted})`);
        showToast('Données restaurées depuis le cloud.');
      },
      false
    );
  } catch {
    setSyncStatus('Échec de la restauration cloud. Vérifie ta connexion.', true);
  }
}

// Pré-remplit le champ code + affiche le statut à chaque ouverture de la modale réglages
document.getElementById('settings-btn').addEventListener('click', () => {
  syncCodeInput.value = getSyncCode();
  const lastTime = localStorage.getItem(SYNC_LAST_TIME_KEY);
  setSyncStatus(lastTime ? `Dernière synchronisation : ${formatDateTime(lastTime)}` : '');
});

syncCodeInput.addEventListener('change', () => setSyncCode(syncCodeInput.value));

syncSaveBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pushToCloud(false);
});

syncRestoreBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pullFromCloud();
});

// Auto-sauvegarde silencieuse : toutes les 45s, si un code est renseigné et que les
// données locales ont changé depuis la dernière synchro, on les pousse vers le cloud.
// Pas besoin d'y penser après chaque note ou ajout à la watchlist.
setInterval(() => {
  const code = getSyncCode();
  if (!code) return;
  const payload = buildSyncPayload();
  const currentHash = hashPayload(payload);
  if (currentHash !== localStorage.getItem(SYNC_LAST_HASH_KEY)) {
    pushToCloud(true);
  }
}, 45000);
