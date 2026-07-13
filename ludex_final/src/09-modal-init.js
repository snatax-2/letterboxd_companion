// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════

// Mémorise l'élément qui avait le focus avant l'ouverture d'une modale, pour lui
// rendre le focus à la fermeture (bonne pratique d'accessibilité au clavier).
let lastFocusedBeforeModal = null;

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.disabled && el.offsetParent !== null);
}

// Piège le focus (Tab / Shift+Tab) à l'intérieur d'une modale ouverte, pour ne
// pas laisser un utilisateur au clavier "sortir" vers le contenu masqué derrière.
function trapFocus(e) {
  const openModalEl = document.querySelector('.modal-overlay.open');
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

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  if (modalEl.id === 'modal') pendingAction = null;
  if (lastFocusedBeforeModal) {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
}

function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('modal').classList.add('open');
  // Focus sur "Annuler" par défaut : plus sûr pour une action destructive
  // (Entrée pressée par réflexe n'active pas la suppression).
  document.getElementById('modal-cancel').focus();
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  closeModal(document.getElementById('modal'));
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('modal'));
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// Échap ferme la modale actuellement ouverte, où que soit le focus.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const openModalEl = document.querySelector('.modal-overlay.open');
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
// Masqué une fois l'app initialisée, avec une durée minimale d'affichage pour
// que ce soit perçu comme un vrai temps de chargement plutôt qu'un flash
// imperceptible (notamment quand tout est déjà en cache et charge quasi
// instantanément).
(function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const MIN_DISPLAY_MS = 1200;
  const elapsed = performance.now();
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500); // laisse le temps au fondu de finir avant de retirer le nœud
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
    try { return (JSON.parse(localStorage.getItem(`lbx_watchlist_${meta.id}`)) || []).length > 0; } catch { return false; }
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

  // Après la disparition de l'écran de démarrage (1200ms + marge), pas avant.
  setTimeout(() => {
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    nextBtn.focus();
  }, 1400);
})();
