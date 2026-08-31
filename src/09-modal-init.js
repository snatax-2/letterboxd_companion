// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════

// Une pile est nécessaire : certaines modales (confirmation, fiche personne)
// s'ouvrent depuis une autre modale. Une seule variable globale de focus
// restaurait alors le mauvais élément et laissait parfois une modale fermée
// accessible au clavier.
const modalStack = [];

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.disabled && el.offsetParent !== null);
}

// Piège le focus (Tab / Shift+Tab) à l'intérieur d'une modale ouverte, pour ne
// pas laisser un utilisateur au clavier "sortir" vers le contenu masqué derrière.
function trapFocus(e) {
  const openModalEl = getTopOpenModal();
  if (!openModalEl || e.key !== 'Tab') return;
  const focusable = getFocusableElements(openModalEl);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function setModalAccessibilityState(modalEl, isOpen) {
  modalEl.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) modalEl.removeAttribute('inert');
  else modalEl.setAttribute('inert', '');
}

function getTopOpenModal() {
  for (let i = modalStack.length - 1; i >= 0; i--) {
    if (modalStack[i].modalEl.classList.contains('open')) return modalStack[i].modalEl;
  }
  const open = document.querySelectorAll('.modal-overlay.open');
  return open.length ? open[open.length - 1] : null;
}

function openModalElement(modalEl, options = {}) {
  if (!modalEl) return;
  const { initialFocus = null, returnFocus = document.activeElement } = options;
  const previousTop = getTopOpenModal();
  if (previousTop && previousTop !== modalEl) setModalAccessibilityState(previousTop, false);
  const existingIndex = modalStack.findIndex(entry => entry.modalEl === modalEl);
  if (existingIndex >= 0) modalStack.splice(existingIndex, 1);
  modalStack.push({ modalEl, returnFocus });

  setModalAccessibilityState(modalEl, true);
  modalEl.classList.add('open');
  const target = initialFocus || getFocusableElements(modalEl)[0];
  if (target && typeof target.focus === 'function') target.focus();
}

function closeModal(modalEl, options = {}) {
  if (!modalEl) return;
  const { restoreFocus = true } = options;
  const stackIndex = modalStack.map(entry => entry.modalEl).lastIndexOf(modalEl);
  const wasTop = stackIndex === modalStack.length - 1;
  const entry = stackIndex >= 0 ? modalStack.splice(stackIndex, 1)[0] : null;

  modalEl.classList.remove('open');
  setModalAccessibilityState(modalEl, false);
  modalEl.dispatchEvent(new Event('modalclosed'));
  if (modalEl.id === 'modal') pendingAction = null;

  if (wasTop) {
    const previousModal = getTopOpenModal();
    if (previousModal) setModalAccessibilityState(previousModal, true);
  }

  if (restoreFocus && wasTop && entry?.returnFocus?.isConnected && typeof entry.returnFocus.focus === 'function') {
    entry.returnFocus.focus();
  }
}

function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  // Focus sur "Annuler" par défaut : plus sûr pour une action destructive
  // (Entrée pressée par réflexe n'active pas la suppression).
  openModalElement(document.getElementById('modal'), {
    initialFocus: document.getElementById('modal-cancel'),
  });
}

document.getElementById('modal-confirm').addEventListener('click', async () => {
  const action = pendingAction;
  pendingAction = null;
  closeModal(document.getElementById('modal'));
  try { if (action) await action(); }
  catch (error) { showToast(error.message || 'Action non enregistrée. Réessaie.'); }
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('modal'));
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  // Défense en profondeur : même si le HTML est modifié, une modale fermée
  // reste hors de l'arbre d'accessibilité et de l'ordre de tabulation.
  setModalAccessibilityState(modal, modal.classList.contains('open'));
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// Échap ferme la modale actuellement ouverte, où que soit le focus.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const openModalEl = getTopOpenModal();
    if (openModalEl) closeModal(openModalEl);
  } else if (e.key === 'Tab') {
    trapFocus(e);
  }
});

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
updateWeightBadges();
calculateScore();
updateAllSliders();
renderCriteriaAverageMarkers();

// ─── Écran de démarrage (splash) ─────────────────────────────────────────────
// Masqué dès que l'initialisation synchrone est terminée. Une courte fenêtre
// évite un flash, sans imposer 1,2 seconde d'attente artificielle à chaque
// ouverture de l'application.
(function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const MIN_DISPLAY_MS = 150;
  const elapsed = performance.now();
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 450); // laisse le temps au fondu de finir avant de retirer le nœud
  }, remaining);
})();

// ═══════════════════════════════════════════
//  ACCUEIL POUR UN NOUVEL UTILISATEUR
// ═══════════════════════════════════════════
// Affiché uniquement à un VRAI nouvel utilisateur (historique et watchlists
// vides) — quelqu'un qui a déjà des données (import, synchro restaurée...)
// n'a pas besoin qu'on lui explique l'app depuis le début.
(function initOnboarding() {
  const ONBOARDING_SEEN_KEY = 'lbx_onboarding_seen';
  if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return;

  const hasHistory = loadHistory().length > 0;
  const hasWatchlistItems = loadWatchlistsMeta().some(meta => {
    return readJsonStorage(`lbx_watchlist_${meta.id}`, [], Array.isArray).length > 0;
  });
  if (hasHistory || hasWatchlistItems) {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); // a déjà des données, pas besoin de cet accueil
    return;
  }

  const modal = document.getElementById('onboarding-modal');
  if (!modal) return;
  const slides = Array.from(modal.querySelectorAll('.onboarding-slide'));
  const dots = Array.from(modal.querySelectorAll('.onboarding-dot'));
  const nextBtn = document.getElementById('onboarding-next-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  let current = 0;

  function showSlide(idx) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('leaving-left', i < idx);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    nextBtn.textContent = idx === slides.length - 1 ? 'Commencer' : 'Suivant';
  }

  function dismiss() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    closeModal(modal);
  }

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { dismiss(); return; }
    current++;
    showSlide(current);
  });
  skipBtn.addEventListener('click', dismiss);

  // Après le début du fondu du splash, pas avant.
  setTimeout(() => {
    openModalElement(modal, { initialFocus: nextBtn });
  }, 350);
})();
