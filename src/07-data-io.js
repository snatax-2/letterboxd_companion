// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
const LAST_EXPORT_KEY = 'lbx_last_export_at';

document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) { showToast('Aucun film à exporter.'); return; }
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  const banner = document.getElementById('backup-reminder');
  if (banner) banner.remove();
  showToast(`${history.length} film${history.length > 1 ? 's' : ''} exporté${history.length > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

function importLudexJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Format invalide');
  openModal(
    "Importer l'historique",
    `Importer ${data.length} film${data.length > 1 ? 's' : ''} ? Cela fusionnera avec votre historique actuel (les doublons seront ignorés).`,
    () => {
      const existing = loadHistory();
      const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
      const toAdd = data.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
      const merged = [...toAdd, ...existing];
      saveHistory(merged);
      renderAll();
      showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''}`);
    }
  );
}

// Import Letterboxd : accepte diary.csv, ratings.csv ou watched.csv de
// l'export officiel Letterboxd (Réglages -> Import & Export). Le parsing et
// le mapping (note /5 -> /10, colonnes détectées par l'en-tête) sont des
// fonctions pures testées dans tests/letterboxd-import.test.js.
function importLetterboxdCsv(text) {
  const rows = parseCsv(text);
  const { items, kind } = mapLetterboxdCsv(rows);
  if (!kind) { showToast('CSV non reconnu — attendu : un export Letterboxd (diary, ratings ou watched).'); return; }
  if (items.length === 0) { showToast('Aucun film trouvé dans ce fichier.'); return; }

  const existing = loadHistory();
  const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
  const toAdd = items.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
  const dupes = items.length - toAdd.length;

  const kindLabel = { diary: 'journal', ratings: 'notes', watched: 'films vus' }[kind];
  openModal(
    'Import Letterboxd',
    `Fichier ${kindLabel} détecté : ${items.length} film${items.length > 1 ? 's' : ''}, dont ${toAdd.length} nouveau${toAdd.length > 1 ? 'x' : ''}${dupes > 0 ? ` (${dupes} déjà présent${dupes > 1 ? 's' : ''}, ignorés)` : ''}. Importer ?`,
    () => {
      const merged = [...toAdd, ...loadHistory()];
      saveHistory(merged);
      renderAll();
      showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''} depuis Letterboxd 🎬`);
    }
  );
}

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    try {
      // Détection automatique du format : un JSON valide commence par [ ou {,
      // sinon on tente le chemin CSV Letterboxd. Le nom du fichier n'est pas
      // fiable (téléchargements renommés), le contenu l'est.
      const trimmed = text.trimStart();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        importLudexJson(text);
      } else {
        importLetterboxdCsv(text);
      }
    } catch {
      showToast('Fichier non reconnu (attendu : sauvegarde Ludex .json ou export Letterboxd .csv).');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── Rappel de sauvegarde ──
// localStorage peut être effacé par le navigateur (nettoyage de stockage,
// réinstallation...). Si la dernière sauvegarde date de plus de 30 jours (ou
// n'a jamais eu lieu) et qu'il y a au moins 10 films en jeu, une bannière
// discrète le rappelle — fermable, et re-proposée au plus tous les 7 jours.
const BACKUP_SNOOZE_KEY = 'lbx_backup_snoozed_at';
function maybeShowBackupReminder() {
  const history = loadHistory();
  if (history.length < 10) return;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  const days = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86400000 : Infinity;
  if (days < 30) return;

  const snoozed = localStorage.getItem(BACKUP_SNOOZE_KEY);
  if (snoozed && (Date.now() - new Date(snoozed).getTime()) / 86400000 < 7) return;

  const banner = document.createElement('div');
  banner.id = 'backup-reminder';
  banner.className = 'backup-reminder';
  banner.innerHTML = `
    <span class="backup-reminder-text">${lastExport ? 'Dernière sauvegarde il y a plus de 30 jours.' : `${history.length} films notés, aucune sauvegarde.`}</span>
    <button type="button" class="backup-reminder-btn" id="backup-reminder-export">Exporter</button>
    <button type="button" class="backup-reminder-close" id="backup-reminder-close" aria-label="Plus tard">✕</button>
  `;
  document.body.appendChild(banner);
  document.getElementById('backup-reminder-export').addEventListener('click', () => {
    document.getElementById('export-btn').click();
  });
  document.getElementById('backup-reminder-close').addEventListener('click', () => {
    localStorage.setItem(BACKUP_SNOOZE_KEY, new Date().toISOString());
    banner.remove();
  });
}
// Différé pour ne pas gêner le premier rendu (et laisser l'onboarding passer devant)
setTimeout(maybeShowBackupReminder, 2500);
