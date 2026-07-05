// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) { showToast('Aucun film à exporter.'); return; }
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`${history.length} film${history.length > 1 ? 's' : ''} exporté${history.length > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
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
    } catch {
      showToast('Fichier JSON invalide.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

