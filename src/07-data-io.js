// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
const LAST_EXPORT_KEY = 'lbx_last_export_at';

document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  const tvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  if (!history.length && !tvShows.length) { showToast('Rien à exporter.'); return; }
  const payload = { history, tvShows };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  const banner = document.getElementById('backup-reminder');
  if (banner) banner.remove();
  const parts = [];
  if (history.length) parts.push(`${history.length} film${history.length > 1 ? 's' : ''}`);
  if (tvShows.length) parts.push(`${tvShows.length} série${tvShows.length > 1 ? 's' : ''}`);
  showToast(`${parts.join(' · ')} exporté${(history.length + tvShows.length) > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

function importLudexJson(text) {
  const data = JSON.parse(text);
  let history, tvShows;
  if (Array.isArray(data)) {
    // Ancienne sauvegarde (avant l'ajout du support séries) : un simple
    // tableau de films, sans enveloppe — toujours acceptée telle quelle.
    history = data;
    tvShows = [];
  } else if (data && typeof data === 'object' && (Array.isArray(data.history) || Array.isArray(data.tvShows))) {
    history = Array.isArray(data.history) ? data.history : [];
    tvShows = Array.isArray(data.tvShows) ? data.tvShows : [];
  } else {
    throw new Error('Format invalide');
  }

  const parts = [];
  if (history.length) parts.push(`${history.length} film${history.length > 1 ? 's' : ''}`);
  if (tvShows.length) parts.push(`${tvShows.length} série${tvShows.length > 1 ? 's' : ''}`);
  if (parts.length === 0) { showToast('Sauvegarde vide, rien à importer.'); return; }

  openModal(
    "Importer la sauvegarde",
    `Importer ${parts.join(' et ')} ? Cela fusionnera avec vos données actuelles (les doublons seront ignorés).`,
    async () => {
      let addedFilms = 0, addedShows = 0, addedSeasons = 0;

      if (history.length) {
        const existing = loadHistory();
        const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
        // Normalisation au passage : une vieille sauvegarde réimportée porte
        // l'ancienne forme du schéma — même fonction que la migration v2.
        const toAdd = history.filter(d => !existingKeys.has((String(d.title ?? '') + '|' + (d.year||'')).toLowerCase())).map(normalizeHistoryItemV2);
        addedFilms = toAdd.length;
        saveHistory([...toAdd, ...existing]);
      }

      if (tvShows.length && typeof loadTvShows === 'function') {
        // Ludex 2.0 : passe par mutateTvShows() (voir 18-tv-shows.js) plutôt
        // qu'un load/save direct — un import qui tomberait pile pendant
        // qu'une autre écriture séries est en vol (widget "En cours" par
        // exemple) écraserait sinon cette dernière avec une copie périmée.
        const counts = await mutateTvShows(existingShows => {
          let localAddedShows = 0, localAddedSeasons = 0;
          tvShows.forEach(importedShow => {
            let localShow = existingShows.find(s => String(s.tmdbTvId) === String(importedShow.tmdbTvId));
            if (!localShow) {
              localShow = { tmdbTvId: importedShow.tmdbTvId, title: importedShow.title, poster_path: importedShow.poster_path, genre: importedShow.genre, seasons: {} };
              existingShows.push(localShow);
              localAddedShows++;
            }
            // Par saison : n'ajoute que celles absentes localement — même
            // philosophie "doublons ignorés" que les films, plutôt que
            // d'inventer une règle de fusion (plus regardée / plus récente)
            // qui n'a pas d'équivalent côté films.
            Object.entries(importedShow.seasons || {}).forEach(([key, season]) => {
              if (!localShow.seasons[key]) {
                localShow.seasons[key] = season;
                localAddedSeasons++;
              }
            });
          });
          return { addedShows: localAddedShows, addedSeasons: localAddedSeasons };
        });
        addedShows = counts.addedShows;
        addedSeasons = counts.addedSeasons;
      }

      renderAll();
      if (typeof renderTvHistory === 'function' && document.getElementById('hist-tab-tv')?.classList.contains('active')) renderTvHistory();
      if (typeof statsDirty !== 'undefined') statsDirty = true;

      const resultParts = [];
      if (addedFilms) resultParts.push(`${addedFilms} film${addedFilms > 1 ? 's' : ''}`);
      if (addedShows) resultParts.push(`${addedShows} série${addedShows > 1 ? 's' : ''}`);
      if (addedSeasons > addedShows) resultParts.push(`${addedSeasons} saison${addedSeasons > 1 ? 's' : ''} au total`);
      showToast(resultParts.length ? `${resultParts.join(' · ')} importé${(addedFilms + addedSeasons) > 1 ? 's' : ''}` : 'Rien de nouveau à importer (déjà présent)');
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
  const tvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  if (history.length + tvShows.length < 10) return;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  const days = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86400000 : Infinity;
  if (days < 30) return;

  const snoozed = localStorage.getItem(BACKUP_SNOOZE_KEY);
  if (snoozed && (Date.now() - new Date(snoozed).getTime()) / 86400000 < 7) return;

  const banner = document.createElement('div');
  banner.id = 'backup-reminder';
  banner.className = 'backup-reminder';
  banner.innerHTML = `
    <span class="backup-reminder-text">${lastExport ? 'Dernière sauvegarde il y a plus de 30 jours.' : `${history.length + tvShows.length} élément${(history.length + tvShows.length) > 1 ? 's' : ''} noté${(history.length + tvShows.length) > 1 ? 's' : ''}, aucune sauvegarde.`}</span>
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
