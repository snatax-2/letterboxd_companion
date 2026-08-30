// Appui long À voir : le scroll reste natif, le tap court ouvre la fiche.
// Les menus utilisent la pile de modales existante (Échap, Retour, focus).
let watchlistMenuCloseTimer = null;
let watchlistMenuScrollTop = null;

function resetWatchlistMenuPresentation() {
  clearTimeout(watchlistMenuCloseTimer);
  actionSheetEl.classList.remove('watchlist-card-menu', 'watchlist-menu-anchored', 'watchlist-menu-preparing');
  actionSheetEl.querySelector('.watchlist-menu-preview')?.remove();
  const panel = actionSheetEl.querySelector('.action-sheet-box');
  ['left', 'top', 'width', 'max-height', 'transform-origin', '--menu-enter-y'].forEach(key => panel.style.removeProperty(key));
  if (watchlistMenuScrollTop !== null) {
    document.documentElement.style.overflow = watchlistMenuScrollTop;
    watchlistMenuScrollTop = null;
  }
}

function prepareWatchlistMenuPresentation(anchor) {
  if (!anchor?.isConnected) return;
  const poster = anchor.querySelector('.wl-poster');
  if (!poster) return;
  const rect = poster.getBoundingClientRect();
  const viewport = window.visualViewport;
  actionSheetEl.classList.add('watchlist-menu-anchored');
  const safe = getComputedStyle(actionSheetEl);
  const left = (viewport?.offsetLeft || 0) + parseFloat(safe.paddingLeft);
  const top = (viewport?.offsetTop || 0) + parseFloat(safe.paddingTop);
  const right = (viewport?.offsetLeft || 0) + (viewport?.width || window.innerWidth) - parseFloat(safe.paddingRight);
  let bottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - parseFloat(safe.paddingBottom);
  const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect();
  if (nav && nav.top > (top + bottom) / 2) bottom = Math.min(bottom, nav.top - 12);

  const panel = actionSheetEl.querySelector('.action-sheet-box');
  const width = Math.min(280, right - left);
  panel.style.width = `${width}px`;
  panel.style.maxHeight = `${bottom - top}px`;
  // offsetHeight n'inclut pas la transformation d'entrée du panneau fermé.
  const height = panel.offsetHeight;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  let previewHeight = Math.min(rect.height, Math.max(0, bottom - top - height - 12));
  const previewWidth = rect.height ? rect.width * previewHeight / rect.height : 0;
  let previewTop = clamp(rect.top, top, bottom - previewHeight);
  let menuTop;
  let above = false;
  if (rect.bottom + 12 + height <= bottom && rect.top >= top) {
    menuTop = rect.bottom + 12;
  } else if (rect.top - 12 - height >= top && rect.bottom <= bottom) {
    menuTop = rect.top - 12 - height;
    above = true;
  } else {
    // Près d'un bord : recentre l'ensemble affiche + menu sans le couper.
    previewTop = top + Math.max(0, (bottom - top - previewHeight - height - 12) / 2);
    menuTop = previewTop + previewHeight + 12;
  }
  if (previewHeight < 48) {
    previewHeight = 0; // écran très bas / clavier ouvert : priorité aux actions.
    menuTop = clamp(rect.top, top, bottom - height);
  }
  const menuLeft = clamp(rect.left, left, right - width);
  panel.style.left = `${menuLeft}px`;
  panel.style.top = `${menuTop}px`;
  panel.style.transformOrigin = `${clamp(rect.left + rect.width / 2 - menuLeft, 0, width)}px ${above ? '100%' : '0%'}`;
  // Recouvre légèrement le bord de l'affiche au départ, sans traverser
  // toute sa hauteur. L'affiche au-dessus du panneau masque ce bord.
  const slideDistance = previewHeight ? Math.min(72, previewHeight * .4) + 12 : 8;
  panel.style.setProperty('--menu-enter-y', `${above ? slideDistance : -slideDistance}px`);

  if (previewHeight) {
    const preview = document.createElement('div');
    preview.className = 'watchlist-menu-preview';
    preview.setAttribute('aria-hidden', 'true');
    const clone = poster.cloneNode(true);
    clone.querySelectorAll('img').forEach(img => { img.alt = ''; img.draggable = false; });
    preview.appendChild(clone);
    Object.assign(preview.style, {
      left: `${clamp(rect.left, left, right - previewWidth)}px`, top: `${previewTop}px`,
      width: `${previewWidth}px`, height: `${previewHeight}px`,
    });
    preview.style.setProperty('--preview-start-x', `${rect.left - parseFloat(preview.style.left)}px`);
    preview.style.setProperty('--preview-start-y', `${rect.top - previewTop}px`);
    // Premier cadre = dimensions exactes de l'affiche sous le doigt, même
    // si le placement final a dû la réduire pour laisser la place au menu.
    preview.style.setProperty('--preview-start-scale-x', String(rect.width / previewWidth));
    preview.style.setProperty('--preview-start-scale-y', String(rect.height / previewHeight));
    actionSheetEl.appendChild(preview);
  }
  watchlistMenuScrollTop = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
}

actionSheetEl.addEventListener('modalclosed', () => {
  if (!actionSheetEl.classList.contains('watchlist-card-menu')) return;
  if (watchlistMenuScrollTop !== null) {
    document.documentElement.style.overflow = watchlistMenuScrollTop;
    watchlistMenuScrollTop = null;
  }
  // Conserve le style pendant le fondu de fermeture, y compris via Échap/Retour.
  watchlistMenuCloseTimer = setTimeout(() => {
    if (!actionSheetEl.classList.contains('open')) resetWatchlistMenuPresentation();
  }, 320); // laisse finir la transition CSS de 300 ms.
});

function watchlistDetailActionsHtml(tmdbId, mediaType) {
  const idx = loadWatchlist(null, mediaType).findIndex(item => String(item.tmdbId) === String(tmdbId));
  if (idx < 0) return '';
  return `<button type="button" class="mds-action-btn" data-watchlist-detail-actions="${mediaType}" data-watchlist-tmdb-id="${escAttr(String(tmdbId))}" aria-haspopup="dialog" aria-controls="action-sheet">${ICONS.moreVertical} Actions À voir</button>`;
}

(function initWatchlistLongPress() {
  const HOLD_MS = 500;
  const MOVE_CANCEL_PX = 10;
  const hint = document.getElementById('watchlist-gesture-hint');
  const HINT_KEY = 'lbx_watchlist_hold_seen';
  try { hint.hidden = localStorage.getItem(HINT_KEY) === '1'; } catch { /* indication non bloquante */ }
  let press = null;
  let suppressPointerClick = false;
  let lastTouchAt = 0;

  function cancelPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press.button.classList.remove('watchlist-holding');
    press = null;
  }

  function openForButton(button) {
    const card = button.closest('.wl-card');
    const menu = card?.querySelector('.wl-menu-btn');
    if (!menu || !button.isConnected) return;
    const type = menu.dataset.watchlistMenu;
    const idx = Number(type === 'tv' ? menu.dataset.tvIdx : menu.dataset.watchlistIdx);
    openWatchlistCardMenu(type, idx, button);
    hint.hidden = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* préférence facultative */ }
  }

  document.addEventListener('pointerdown', event => {
    // Un deuxième doigt annule le maintien (pinch/zoom, pas une action).
    if (press) { cancelPress(); return; }
    suppressPointerClick = false; // un NOUVEAU tap délibéré peut choisir une option.
    if (!event.isPrimary || event.button !== 0 || !['touch', 'pen'].includes(event.pointerType)) return;
    const button = event.target.closest('.wl-card-open');
    if (!button || getTopOpenModal()) return;
    lastTouchAt = Date.now();
    press = { button, pointerId: event.pointerId, x: event.clientX, y: event.clientY, fired: false };
    button.classList.add('watchlist-holding');
    press.timer = setTimeout(() => {
      if (!press || !button.isConnected || !button.getClientRects().length || getTopOpenModal()) { cancelPress(); return; }
      press.fired = true;
      suppressPointerClick = true;
      button.classList.remove('watchlist-holding');
      openForButton(button);
    }, HOLD_MS);
  }, { passive: true });

  document.addEventListener('pointermove', event => {
    if (!press || event.pointerId !== press.pointerId || press.fired) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_CANCEL_PX) cancelPress();
  }, { passive: true });
  document.addEventListener('pointerup', event => {
    if (!press || event.pointerId !== press.pointerId) return;
    if (press.fired) {
      event.preventDefault();
      suppressPointerClick = true;
    }
    cancelPress();
  }, { capture: true, passive: false });
  document.addEventListener('pointercancel', cancelPress, { passive: true });
  document.addEventListener('scroll', () => { if (!press?.fired) cancelPress(); }, { capture: true, passive: true });
  window.addEventListener('blur', cancelPress);
  document.addEventListener('visibilitychange', cancelPress);
  function onViewportChange() {
    cancelPress();
    if (actionSheetEl.matches('.watchlist-menu-anchored.open')) closeActionSheet();
  }
  window.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);

  document.addEventListener('click', event => {
    if (suppressPointerClick && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('contextmenu', event => {
    const button = event.target.closest('.wl-card-open');
    if (!button) return;
    event.preventDefault(); // Pas de menu natif « enregistrer l'image » sur iOS.
    if (Date.now() - lastTouchAt < 1500 || event.pointerType === 'touch') return;
    cancelPress();
    openForButton(button);
  });
  document.addEventListener('dragstart', event => {
    if (event.target.closest('.wl-card-open')) event.preventDefault();
  });
  document.addEventListener('keydown', event => {
    const button = event.target.closest('.wl-card-open');
    if (!button || !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return;
    event.preventDefault();
    openForButton(button);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-watchlist-detail-actions]');
    if (!button) return;
    const type = button.dataset.watchlistDetailActions;
    const idx = loadWatchlist(null, type).findIndex(item => String(item.tmdbId) === button.dataset.watchlistTmdbId);
    if (idx < 0) return;
    // Ferme la fiche avant d'ouvrir le menu : aucune modale cachée ne masque Noter.
    closeModal(button.closest('.modal-overlay'), { restoreFocus: false });
    openWatchlistCardMenu(type, idx);
  });
})();
