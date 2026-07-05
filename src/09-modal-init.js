// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════
function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  document.getElementById('modal').classList.add('open');
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  document.getElementById('modal').classList.remove('open');
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  pendingAction = null;
  document.getElementById('modal').classList.remove('open');
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.remove('open');
      if (modal.id === 'modal') pendingAction = null;
    }
  });
});

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
updateWeightBadges();
calculateScore();
updateAllSliders();
