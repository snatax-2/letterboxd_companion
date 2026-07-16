// ═══════════════════════════════════════════
//  TOAST & DELETE WITH UNDO
// ═══════════════════════════════════════════

// Associe chaque tag de contexte stocké (avec son emoji d'origine, jamais
// changé pour ne pas casser les films déjà notés) à son icône SVG équivalente,
// utilisée uniquement à l'affichage — voir tagsHTML plus bas.
// Déclaré ICI (local à la fonction), pas en haut du fichier : un `const`
// top-level serait dans sa "zone morte temporelle" tant que l'exécution du
// script n'a pas atteint cette ligne — or `renderAll()` est appelée une
// première fois de façon précoce (voir 03-foundation.js), avant que
// 06-history.js n'ait fini de s'exécuter (même bug que rencontré et corrigé
// pour CRITERIA_SHORT_LABELS dans createRadarSVG).
function renderTagLabel(tagText) {
  const CONTEXT_TAG_ICONS = {
    '🍿': ICONS.popcorn,
    '🔄': ICONS.refresh,
    '📝': ICONS.edit,
    '🛋️': ICONS.sofa,
    '🛋': ICONS.sofa,
  };
  const [emoji, ...rest] = tagText.split(' ');
  const icon = CONTEXT_TAG_ICONS[emoji];
  return icon ? `${icon} ${rest.join(' ')}` : tagText;
}

let toastTimer;
let deletedItemCache = null; 
let deletedItemIndex = null;

function showToast(msg, withUndo = false, undoFnName = 'undoDelete') {
  const t = document.getElementById('toast');
  
  let html = `<span>${msg}</span>`;
  if (withUndo) {
    html += `<button class="toast-undo-btn" onclick="${undoFnName}()">Annuler</button>`;
  }
  t.innerHTML = html;
  
  t.classList.add('show');
  clearTimeout(toastTimer);
  
  toastTimer = setTimeout(() => { 
      t.classList.remove('show');
      deletedItemCache = null; 
  }, withUndo ? 4500 : 2800);
}

window.deleteItem = function(idx, btnEl) {
  const history = loadHistory();
  deletedItemCache = history[idx]; 
  deletedItemIndex = idx;
  
  if (btnEl) {
    const cardToAnimate = btnEl.closest('.hist-item');
    cardToAnimate.classList.add('deleting');
  }

  setTimeout(() => {
    history.splice(idx, 1);
    saveHistory(history);
    if (deletedItemCache?.title) {
      recordTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
    }
    renderAll();
    showToast(`Film supprimé.`, true);
  }, 300);
};

window.undoDelete = function() {
  if (!deletedItemCache) return;
  const history = loadHistory();
  history.splice(deletedItemIndex, 0, deletedItemCache); 
  saveHistory(history);
  if (deletedItemCache?.title) {
    removeTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
  }
  renderAll();
  showToast(`Suppression annulée.`);
  deletedItemCache = null;
};

// ═══════════════════════════════════════════
//  RECHERCHE HISTORIQUE
// ═══════════════════════════════════════════
let histSearchTimer;
document.getElementById('history-search').addEventListener('input', (e) => {
  historySearchQuery = e.target.value.toLowerCase();
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(renderHistory, 150);
});

// ═══════════════════════════════════════════
//  RENDER HISTORY / DASHBOARD / STATS
// ═══════════════════════════════════════════
function getGenres(history) {
  const set = new Set();
  history.forEach(item => {
    if (item.genre) {
      item.genre.split(',').forEach(g => { const t = g.trim(); if (t) set.add(t); });
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function renderGenreChips(history) {
  const genres = getGenres(history);
  const row    = document.getElementById('genre-filter-row');
  const chips  = document.getElementById('genre-chips');

  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (activeGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { activeGenre = null; activeScoreFilter = null; renderGenreChips(history); renderHistory(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (activeGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      activeGenre = (activeGenre === g) ? null : g;
      renderGenreChips(history);
      renderHistory();
    });
    chips.appendChild(chip);
  });
}

function getSorted(history) {
  let h = history;

  if (activeGenre) {
    h = h.filter(item => item.genre && item.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }

  if (activeScoreFilter !== null) {
    const scoreRanges = {
      '50': [9,10], '45': [8.5,9], '40': [7.5,8.5], '35': [6.5,7.5], '30': [5.5,6.5],
      '25': [4.5,5.5], '20': [3.5,4.5], '15': [2.5,3.5], '10': [1.5,2.5], '05': [0,1.5]
    };
    const [lo, hi] = scoreRanges[activeScoreFilter] || [0,10];
    h = h.filter(item => {
      const s = parseFloat(item.score);
      return s >= lo && (activeScoreFilter === '50' ? s <= hi : s < hi);
    });
  }

  if (historySearchQuery) {
    // Une requête à 4 chiffres (ex: "1994") matche aussi l'année du film, et
    // "199" les années 1990-1999 : la recherche sert ainsi de filtre par
    // année/décennie sans UI supplémentaire — combinable avec les puces de
    // genre et le filtre de note comme le reste.
    const isYearQuery = /^\d{3,4}$/.test(historySearchQuery.trim());
    h = h.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(historySearchQuery);
      const dirMatch = item.director && item.director.toLowerCase().includes(historySearchQuery);
      const actMatch = item.actors && item.actors.toLowerCase().includes(historySearchQuery);
      const yearMatch = isYearQuery && item.year && String(item.year).startsWith(historySearchQuery.trim());
      return titleMatch || dirMatch || actMatch || yearMatch;
    });
  }

  if (sortOrder === 'date') {
    return [...h].sort((a, b) => {
      const dateA = a.date || a.savedAt || "";
      const dateB = b.date || b.savedAt || "";
      return dateB.localeCompare(dateA); 
    });
  }

  if (sortOrder === 'score-desc') return [...h].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  if (sortOrder === 'score-asc')  return [...h].sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (sortOrder === 'title')      return [...h].sort((a, b) => a.title.localeCompare(b.title));
  
  return h; 
}

function renderHistory() {
  // Capture tout geste "armé" AVANT de reconstruire le DOM (voir
  // captureArmedHistoryState/reapplyArmedHistoryState dans initHistoryGestures) —
  // sinon l'état visuel armé disparaîtrait silencieusement sur le nouvel
  // élément si un re-rendu (synchro en arrière-plan, tirer-pour-rafraîchir,
  // une autre suppression confirmée en parallèle...) s'intercale pendant que
  // l'utilisateur attend de confirmer un swipe.
  const capturedArmedState = window.captureArmedHistoryState ? window.captureArmedHistoryState() : null;

  const history   = loadHistory();
  const sorted    = getSorted(history);
  const container = document.getElementById('history-list');

  const badge = document.getElementById('hist-count-badge');
  if (activeGenre || historySearchQuery || activeScoreFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '');
    badge.style.color = '';
  }

  renderGenreChips(history);

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>La salle est vide… Note ton premier film pour lancer la séance !<button type="button" class="empty-state-cta" id="empty-state-history-cta">Rechercher mon premier film</button></div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Rien à l'affiche sous ce nom.</div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  container.innerHTML = '';
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.dataset.idx = realIdx;
    div.dataset.savedAt = item.savedAt || '';
    div.dataset.titleKey = item.title.toLowerCase();
    // Anime l'entrée du film qu'on vient tout juste de sauvegarder (voir
    // 05-rating-form.js), pas les autres — sinon toute la liste rejouerait
    // l'animation à chaque re-rendu (changement de filtre, etc.).
    if (window._justSavedHistoryTitle && item.title.toLowerCase() === window._justSavedHistoryTitle) {
      div.classList.add('hist-item-entering');
    }

    const scoreNum = parseFloat(item.score);
    let scoreColor = 'var(--red)';
    if(scoreNum >= 7.5) scoreColor = 'var(--green)';
    else if(scoreNum >= 5.0) scoreColor = 'var(--gold)';

    const imgHtml = item.poster
      ? `<img class="hist-poster" src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'hist-poster-ph\\'>🎬</div>'">`
      : `<div class="hist-poster-ph">${ICONS.clapper}</div>`;

    const tmdbHtml = item.tmdbScore
      ? `<span class="hist-tmdb">★ ${item.tmdbScore} TMDb</span>`
      : '';

    let metaHTML = '';
    if (item.year) metaHTML += item.year + ' · ';
    if (item.runtime) metaHTML += item.runtime + ' · ';
    metaHTML += item.genre || '';
    if (item.director) metaHTML += `<br><span style="color:var(--text-mid)">Réalisé par <b>${item.director}</b></span>`;
    if (item.actors) metaHTML += `<br><span style="color:var(--text-mid)">Avec <b>${item.actors}</b></span>`;

    let tagsHTML = '';
    if (item.contextTags && item.contextTags.length > 0) {
      tagsHTML = `<div class="hist-tags-disp">${item.contextTags.map(t => `<span class="h-tag">${renderTagLabel(t)}</span>`).join('')}</div>`;
    }

    let reviewHTML = '';
    if (item.review) {
      reviewHTML = `
        <div class="hist-review" onclick="this.classList.toggle('expanded')">
          <div class="hist-review-content">"${item.review}"</div>
          <span class="hist-review-toggle"></span>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="hist-swipe-hint hist-swipe-hint-left" aria-hidden="true">${ICONS.trash} Supprimer</div>
      <div class="hist-swipe-hint hist-swipe-hint-right" aria-hidden="true">${ICONS.edit} Modifier</div>
      <div class="hist-item-content" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${imgHtml}
        <div class="hist-body">
          <div class="hist-title">${item.title}${item.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
          <div class="hist-meta">${metaHTML}</div>
          ${tagsHTML}
          <div style="margin-bottom:4px;"><span style="color:${scoreColor};font-weight:700;">${item.score}/10</span>${tmdbHtml}</div>
          <div class="hist-stars">${item.stars}<span class="hist-score"></span></div>
          ${reviewHTML}
        </div>
        <div class="hist-actions">
          <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier" aria-label="Modifier ma note pour ${item.title.replace(/"/g, '&quot;')}">${ICONS.edit}</button>
          <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${item.title.replace(/"/g, '&quot;')} de l'historique">${ICONS.trash}</button>
        </div>
      </div>`;
    container.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  window._justSavedHistoryTitle = null;
  if (window.reapplyArmedHistoryState) window.reapplyArmedHistoryState(capturedArmedState);
}

// ═══════════════════════════════════════════
//  ACTIONS RAPIDES (appui long sur un film de l'historique)
// ═══════════════════════════════════════════

// Reconstruit le même texte partageable que le bouton "Copier" du formulaire,
// mais à partir des données SAUVEGARDÉES d'un film (pas besoin de le charger
// dans le formulaire d'abord). Garde les deux textes strictement identiques.
function buildCopyTextForItem(item) {
  const heartStr = item.liked ? ' ❤️' : '';
  const dateStr = item.date
    ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const score = parseFloat(item.score) || 0;
  const stars = getStarStr(scoreToStars(score));

  let text = `📽 ${item.title} ${item.year ? '(' + item.year + ') ' : ''}${heartStr}\n`;
  if (item.director) text += `🎬 Un film de ${item.director}\n`;
  if (item.actors) text += `🎭 Avec ${item.actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (item.contextTags && item.contextTags.length > 0) text += `🏷 ${item.contextTags.join(' · ')}\n`;

  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (item.mode === 'detail' && item.values) {
    const v = item.values;
    const f = (x) => (parseFloat(x) || 0).toFixed(1);
    text += `\nScénario ${f(v.scenario)} · Réal ${f(v.realisation)} · Photo ${f(v.photo)} · Acteurs ${f(v.acteurs)} · Son ${f(v.ambiance)} · Affect ${f(v.affect)}\n`;
  }

  if (item.review) text += `\n${item.review}`;
  return text;
}

window.toggleLikedForItem = function(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;
  item.liked = !item.liked;
  item.updatedAt = new Date().toISOString();
  saveHistory(history);
  renderAll();
  showToast(item.liked ? `"${item.title}" ajouté à tes coups de cœur ❤️` : `"${item.title}" retiré de tes coups de cœur`);
};

const actionSheetEl = document.getElementById('action-sheet');
const actionSheetTitleEl = document.getElementById('action-sheet-title');
const actionSheetListEl = document.getElementById('action-sheet-list');
const actionSheetCancelBtn = document.getElementById('action-sheet-cancel');

function openActionSheetForItem(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;

  actionSheetTitleEl.textContent = item.title;

  const actions = [
    { label: 'Modifier', icon: ICONS.edit, onClick: () => loadItem(idx) },
    {
      label: item.liked ? 'Retirer des coups de cœur' : 'Ajouter aux coups de cœur',
      icon: ICONS.heart,
      onClick: () => toggleLikedForItem(idx),
    },
    {
      label: 'Copier le texte',
      icon: ICONS.copy,
      onClick: () => {
        navigator.clipboard.writeText(buildCopyTextForItem(item)).then(() => {
          showToast('Critique copiée dans le presse-papier');
        });
      },
    },
    {
      label: 'Supprimer',
      icon: ICONS.trash,
      danger: true,
      onClick: () => {
        const cardEl = document.querySelector(`.hist-item[data-idx="${idx}"]`);
        deleteItem(idx, cardEl ? cardEl.querySelector('.hist-action-btn.del') : null);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => {
      closeActionSheet();
      onClick();
    });
    actionSheetListEl.appendChild(btn);
  });

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
  actionSheetListEl.querySelector('.action-sheet-item')?.focus();
}

function closeActionSheet() {
  closeModal(actionSheetEl);
}

actionSheetCancelBtn.addEventListener('click', closeActionSheet);
actionSheetEl.addEventListener('click', (e) => { if (e.target === actionSheetEl) closeActionSheet(); });

// Détection de l'appui long (mobile) sur un film de l'historique. Délégué sur
// le conteneur (pas un listener par carte) : fonctionne aussi pour les films
// ajoutés après coup, sans re-câblage. Annulé si le doigt bouge trop (= scroll)
// ou si l'appui vise déjà un bouton (édition/suppression directe).
(function initHistoryGestures() {
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 12; // marge avant de trancher swipe/scroll — le ratio généreux (0.5, voir plus bas) fait maintenant le plus gros du travail, donc ce seuil peut redescendre pour un geste plus réactif dès le départ
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let pressTimer = null;
  let startX = 0, startY = 0;
  let pressedItem = null;
  let pressedContent = null;
  let longPressJustFired = false; // évite qu'un tap (click) ne se déclenche juste après un appui long déjà traité
  let wasSwipe = false; // idem, juste après un swipe
  let swipeMode = null; // null = pas encore décidé, 'swipe' = glissement horizontal engagé, 'scroll' = mouvement vertical (on laisse faire nativement)
  let dx = 0;
  // Un swipe qui atteint le seuil n'exécute plus l'action tout de suite : il
  // "arme" l'item (piste révélée, en attente d'un tap de confirmation sur
  // l'indice) plutôt que de supprimer/modifier immédiatement — évite les
  // suppressions accidentelles lors d'un simple scroll un peu appuyé.
  let armedItem = null;
  let armedDirection = null; // 'left' (supprimer) ou 'right' (modifier)

  const container = document.getElementById('history-list');
  if (!container) return;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.hist-item-content');
    if (content) { content.style.transition = 'transform .25s ease'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-armed-right', 'hist-swipe-left', 'hist-swipe-right');
    armedItem = null;
    armedDirection = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const item = armedItem;
    const dir = armedDirection;
    const content = item.querySelector('.hist-item-content');
    // Capture une clé STABLE (pas juste l'index brut) : entre ce tap de
    // confirmation et l'exécution réelle (~500ms plus tard, deux délais
    // d'animation cumulés), une AUTRE suppression/modification confirmée en
    // parallèle peut décaler tous les index suivants — un index figé ici
    // deviendrait alors celui d'un AUTRE film au moment de l'exécuter. D'où
    // le bug observé : des cartes qui semblaient "figées" en plein envol,
    // l'action retardée s'appliquant au mauvais film (ou à un index qui
    // n'existait plus).
    const savedAt = item.dataset.savedAt;
    const titleKey = item.dataset.titleKey;
    function resolveCurrentIdx() {
      const freshHistory = loadHistory();
      const found = freshHistory.findIndex(h => h.savedAt === savedAt && h.title.toLowerCase() === titleKey);
      return found !== -1 ? found : parseInt(item.dataset.idx, 10); // repli sur l'ancien index si jamais introuvable
    }
    armedItem = null;
    armedDirection = null;
    if (dir === 'left') {
      item.classList.add('hist-swipe-out-left');
      content.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => deleteItem(resolveCurrentIdx()), 200); // pas de btnEl : évite de cumuler avec l'animation .deleting existante
    } else {
      item.classList.add('hist-swipe-out-right');
      content.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => loadItem(resolveCurrentIdx()), 200);
    }
  }

  function resetGesture(e) {
    if (e && pressedItem) e.stopPropagation();
    clearTimeout(pressTimer);
    pressTimer = null;
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  // Remet aussi le VISUEL à zéro (pas juste le suivi interne) — utilisé pour
  // touchcancel, qui peut se déclencher sur un vrai téléphone (notification,
  // appel entrant, le système qui interrompt le geste en cours) sans jamais
  // passer par resolveGesture(). Sans ce nettoyage visuel, le film glissé au
  // moment de l'interruption restait visuellement coincé à mi-chemin — décalé,
  // sans indice Supprimer/Modifier visible — et le restait indéfiniment,
  // jusqu'à ce qu'on retouche cet item précis. D'où le bug remonté :
  // "après avoir déjà swipé un autre film juste avant".
  function cancelGestureFully(e) {
    if (pressedItem) {
      if (pressedContent) {
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture(e);
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) { resetGesture(); return; }
    e.stopPropagation(); // évite que ce geste ne remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    // Si CE film était déjà armé (piste révélée après un swipe précédent, sans
    // confirmation), on nettoie AVANT de démarrer le nouveau geste — sinon les
    // classes de l'ancien état armé ("hist-swipe-armed-left") restaient
    // appliquées EN MÊME TEMPS que les nouvelles du geste en cours
    // ("hist-swipe-right"), deux états contradictoires qui cassaient
    // l'affichage. C'est exactement le cas signalé : re-swiper le même film
    // dans l'autre sens sans avoir confirmé le premier geste.
    if (armedItem === item) cancelArmed();
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
    pressTimer = setTimeout(() => {
      if (!pressedItem || swipeMode === 'swipe') return; // déjà en train de glisser : pas d'appui long
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(pressedItem, 'medium');
      openActionSheetForItem(parseInt(pressedItem.dataset.idx, 10));
      longPressJustFired = true;
      setTimeout(() => { longPressJustFired = false; }, 300);
      resetGesture();
    }, LONG_PRESS_MS);
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const rawDx = curX - startX;
    const rawDy = curY - startY;

    // Décide UNE FOIS, dès qu'il y a assez de mouvement, si c'est un swipe
    // horizontal (glissement de la carte) ou un scroll vertical (on laisse
    // faire nativement, on ne touche à rien).
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer); // tout mouvement franc annule l'appui long
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;

    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  }, { passive: true });

  function resolveGesture(e) {
    if (!pressedItem) return;
    if (e) e.stopPropagation();
    clearTimeout(pressTimer);

    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed(); // un seul item armé à la fois
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = 'translateX(120px)';
        pressedItem.classList.add('hist-swipe-armed-right');
        armedItem = pressedItem;
        armedDirection = 'right';
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
      }
      wasSwipe = true;
      setTimeout(() => { wasSwipe = false; }, 300);
    }
    resetGesture();
  }

  container.addEventListener('touchend', resolveGesture);

  container.addEventListener('touchcancel', cancelGestureFully);

  // Souris (pratique pour tester sur desktop / vercel dev) : même logique que
  // le tactile, juste déclenchée par mousedown/mousemove/mouseup.
  let mouseActive = false;
  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    if (armedItem === item) cancelArmed(); // même correctif que le tactile : voir le commentaire sur touchstart
    mouseActive = true;
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.clientX;
    startY = e.clientY;
    swipeMode = null;
    dx = 0;
  });
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || !pressedItem) return;
    const rawDx = e.clientX - startX;
    const rawDy = e.clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  });
  document.addEventListener('mouseup', () => {
    if (!mouseActive) return;
    mouseActive = false;
    resolveGesture();
  });

  // Tap (court) sur un film : ouvre sa fiche détaillée. L'appui long (menu
  // d'actions) et le swipe (supprimer/modifier) ont priorité — s'ils viennent
  // de se déclencher, on ignore ce tap.
  container.addEventListener('click', (e) => {
    // Confirmation/annulation d'un item armé (swipe qui a atteint son seuil) :
    // prioritaire sur tout le reste, y compris le garde-fou "wasSwipe" — sinon
    // on ne pourrait jamais confirmer juste après avoir swipé.
    if (armedItem) {
      const hint = e.target.closest('.hist-swipe-hint');
      const clickedItem = e.target.closest('.hist-item');
      if (hint && clickedItem === armedItem) {
        confirmArmed();
        return;
      }
      const wasArmedItself = clickedItem === armedItem;
      cancelArmed();
      if (wasArmedItself) return; // juste annulé : ne rien faire de plus avec ce tap
      // sinon : le tap visait autre chose (un autre film, le CTA...), on continue normalement
    }

    if (e.target.closest('#empty-state-history-cta')) {
      if (window.innerWidth <= 860) switchMobileNav('rating');
      const searchInput = document.getElementById('movie-search');
      if (searchInput) searchInput.focus();
      return;
    }
    if (longPressJustFired || wasSwipe) return;
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    const idx = parseInt(item.dataset.idx, 10);
    const history = loadHistory();
    const movieItem = history[idx];
    if (movieItem) openMovieDetailSheet(movieItem.tmdbId);
  });

  // Filet de sécurité : un tap n'importe où EN DEHORS de la liste (changer
  // d'onglet, ouvrir les réglages...) annule aussi un item resté armé.
  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);

  // Exposé pour renderHistory() : un re-rendu (déclenché par une synchro en
  // arrière-plan, un tirer-pour-rafraîchir, une autre suppression confirmée
  // en parallèle...) reconstruit tout le DOM de la liste. Sans rien faire de
  // plus, l'état "armé" (piste révélée, en attente d'un tap de confirmation)
  // disparaîtrait silencieusement sur le nouvel élément reconstruit — le
  // prochain tap de l'utilisateur sur l'indice ne ferait alors plus rien,
  // puisque ni la classe visuelle ni la variable JS ne s'y attendent plus.
  // Solution en deux temps : capturer l'état AVANT de vider le DOM (clé
  // stable, pas un index qui pourrait avoir changé), puis le réappliquer
  // sur le NOUVEL élément correspondant après la reconstruction.
  window.captureArmedHistoryState = function() {
    // Cas 1 : un item est déjà ARMÉ (piste révélée, en attente de confirmation).
    if (armedItem) {
      const captured = {
        kind: 'armed',
        savedAt: armedItem.dataset.savedAt,
        titleKey: armedItem.dataset.titleKey,
        direction: armedDirection,
      };
      resetGesture();
      armedItem = null;
      armedDirection = null;
      return captured;
    }
    // Cas 2 : un glissement est EN COURS (doigt toujours posé, pas encore
    // armé) — c'est le cas qui manquait encore : un re-rendu à ce moment-là
    // laissait pressedItem/pressedContent pointer vers un élément détaché,
    // donc le reste du geste (touchmove/touchend) ne mettait plus rien à
    // jour de VISIBLE, exactement le bug "le swipe est détecté mais reste
    // vide" remonté par l'utilisateur.
    if (pressedItem) {
      const captured = {
        kind: 'dragging',
        savedAt: pressedItem.dataset.savedAt,
        titleKey: pressedItem.dataset.titleKey,
        dx, swipeMode,
      };
      return captured; // ne réinitialise PAS ici : le doigt est encore posé, le geste continue
    }
    return null;
  };

  window.reapplyArmedHistoryState = function(captured) {
    if (!captured) return;
    const container = document.getElementById('history-list');
    const newItem = container?.querySelector(
      `.hist-item[data-saved-at="${CSS.escape(captured.savedAt)}"][data-title-key="${CSS.escape(captured.titleKey)}"]`
    );
    if (!newItem) return; // le film a été supprimé entre-temps par ailleurs : rien à réappliquer
    const content = newItem.querySelector('.hist-item-content');

    if (captured.kind === 'armed') {
      const cls = captured.direction === 'left' ? 'hist-swipe-armed-left' : 'hist-swipe-armed-right';
      const swipeCls = captured.direction === 'left' ? 'hist-swipe-left' : 'hist-swipe-right';
      newItem.classList.add(cls, swipeCls);
      if (content) content.style.transform = `translateX(${captured.direction === 'left' ? -120 : 120}px)`;
      armedItem = newItem;
      armedDirection = captured.direction;
    } else if (captured.kind === 'dragging') {
      // Rebranche pressedItem/pressedContent sur le NOUVEL élément (le geste
      // continue dessus dès le prochain touchmove/touchend), et redonne
      // immédiatement le même rendu visuel qu'avant le re-rendu.
      pressedItem = newItem;
      pressedContent = content;
      dx = captured.dx;
      swipeMode = captured.swipeMode;
      if (content) content.style.transform = `translateX(${dx}px)`;
      newItem.classList.toggle('hist-swipe-left', dx < -10);
      newItem.classList.toggle('hist-swipe-right', dx > 10);
    }
  };
})();

function createRadarSVG(averages) {
  if (averages.every(a => a === 0)) return null;

  // Libellés courts pour l'affichage du radar (doit couvrir toutes les clés de
  // CRITERIA). Déclaré ICI (local à la fonction) et non en haut du fichier :
  // un `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution du script n'a pas atteint cette ligne — or `renderAll()` est
  // appelée une première fois de façon précoce (voir 03-foundation.js), avant
  // que 06-history.js n'ait fini de s'exécuter, ce qui provoquait un plantage
  // total de l'app au chargement pour tout utilisateur ayant déjà un historique.
  const CRITERIA_SHORT_LABELS = {
    scenario: 'Scén.',
    realisation: 'Réal.',
    photo: 'Photo',
    acteurs: 'Casting',
    ambiance: 'Ambiance',
    rythme: 'Rythme',
    affect: 'Affect',
  };

  const s = 220, c = s/2, r = 72;
  // Nombre d'axes = nombre de critères actuels (CRITERIA) : ne plus jamais figer
  // ce nombre en dur, sinon l'ajout d'un critère (ex: "Rythme") désaligne le
  // graphique ou perd un axe silencieusement.
  // NB : s (220) est volontairement plus grand que 2×r (144) — la différence
  // (38px de chaque côté) est la marge réservée aux libellés des axes.
  // Avant, s=180 et r=0.42×s=76 plaçaient l'ancre du texte PILE sur le bord du
  // viewBox (aucune marge), ce qui faisait déborder "Réal." et "Photo" (le
  // texte s'étend depuis son ancre, pas autour) hors du cadre visible.
  const angleStep = 360 / CRITERIA.length;
  const angles = CRITERIA.map((_, i) => (i * angleStep - 90) * Math.PI / 180);
  const labels = CRITERIA.map(critKey => CRITERIA_SHORT_LABELS[critKey] || critKey);

  let svg = `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%" style="max-width:250px; overflow:visible;">`;
  
  [10, 6.66, 3.33].forEach(lvl => {
    const pts = angles.map(a => `${c + (lvl/10)*r*Math.cos(a)},${c + (lvl/10)*r*Math.sin(a)}`).join(' ');
    svg += `<polygon points="${pts}" fill="none" class="svg-grid" />`;
  });

  angles.forEach((a, i) => {
    svg += `<line x1="${c}" y1="${c}" x2="${c + r*Math.cos(a)}" y2="${c + r*Math.sin(a)}" class="svg-axis" />`;
    const lx = c + (r + 14) * Math.cos(a), ly = c + (r + 8) * Math.sin(a);
    const anch = lx < c - 10 ? 'end' : (lx > c + 10 ? 'start' : 'middle');
    svg += `<text x="${lx}" y="${ly}" class="svg-text" text-anchor="${anch}" dominant-baseline="middle">${labels[i]}</text>`;
  });

  const dataPts = angles.map((a, i) => `${c + (averages[i]/10)*r*Math.cos(a)},${c + (averages[i]/10)*r*Math.sin(a)}`).join(' ');
  // Anime la forme depuis le centre (effet "scan") plutôt que de l'afficher
  // d'un coup — transform-origin fixé sur le centre exact du cercle (c,c).
  svg += `<polygon points="${dataPts}" fill="var(--orange)" fill-opacity="0.3" stroke="var(--orange)" stroke-width="2" class="radar-fill-anim" style="transform-origin:${c}px ${c}px;" />`;
  
  angles.forEach((a, i) => {
    svg += `<circle cx="${c + (averages[i]/10)*r*Math.cos(a)}" cy="${c + (averages[i]/10)*r*Math.sin(a)}" r="3" fill="var(--blue)" class="radar-dot-anim" style="animation-delay:${0.5 + i*0.05}s" />`;
  });

  svg += `</svg>`;
  return svg;
}

function createTimelineSVG(history) {
  const months = {};
  const now = new Date();
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = { c: 0 };
  }
  history.forEach(h => {
    if(h.date) { const k = h.date.substring(0,7); if(months[k]) months[k].c++; }
  });

  const keys = Object.keys(months).sort();
  const maxC = Math.max(...keys.map(k => months[k].c), 1);
  const w = 300, h = 100, pad = 20, barW = (w - pad*2)/6 - 10;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible;">`;
  keys.forEach((k, i) => {
    const count = months[k].c;
    const barH = (count / maxC) * (h - pad - 10);
    const x = pad + i*(barW + 10), y = h - pad - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--border-hi)" rx="2" style="transition:height 0.5s ease, y 0.5s ease" />`;
    if(count > 0) svg += `<text x="${x + barW/2}" y="${y - 4}" class="svg-text-mono" text-anchor="middle">${count}</text>`;
    const mLab = new Date(k+'-01').toLocaleDateString('fr-FR', {month:'short'}).substring(0,3);
    svg += `<text x="${x + barW/2}" y="${h - 5}" class="svg-text" fill="var(--text-mid)" text-anchor="middle">${mLab}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

// Anime un chiffre de 0 (ou de sa valeur affichée actuelle) jusqu'à sa valeur
// finale, avec un ralentissement en fin de course (ease-out) pour un rendu
// plus "premium" qu'un simple changement instantané. Respecte la préférence
// système "réduire les animations" : dans ce cas, affiche direct la valeur finale.
function animateCountUp(el, endValue, { duration = 700, decimals = 0 } = {}) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const format = (v) => decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();

  if (reduceMotion) {
    el.textContent = format(endValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = format(startValue + (endValue - startValue) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = format(endValue);
  }
  requestAnimationFrame(step);
}

// Le radar ne se dessine (animation) que lorsqu'il entre réellement dans le
// viewport — divulgation progressive : pas d'effet gâché hors écran, et un
// petit "moment" à découvrir en scrollant jusqu'à lui plutôt qu'un dessin
// déjà terminé avant même de le voir. Un seul observer, mis en place une fois
// (le conteneur lui-même persiste ; seul son contenu est remplacé à chaque
// rendu — la classe .in-view s'applique alors dynamiquement au nouveau SVG).
(function initRadarScrollReveal() {
  const container = document.getElementById('radar-chart-container');
  if (!container || !window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) container.classList.add('in-view');
    });
  }, { threshold: 0.3 });
  observer.observe(container);
})();

function renderStats() {
  const history = loadHistory();
  animateCountUp(document.getElementById('kpi-total'), history.length);
  
  if (history.length === 0) {
    document.getElementById('kpi-avg').textContent = '-'; 
    document.getElementById('kpi-year').textContent = '0';
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block';
    document.getElementById('timeline-chart-container').innerHTML = '';
    document.getElementById('top-directors-list').innerHTML = '<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>';
    buildHistogram({});
    resetProfileExtras();
    return;
  }

  const avg = history.reduce((sum, h) => sum + parseFloat(h.score), 0) / history.length;
  animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });

  const currentYear = new Date().getFullYear().toString();
  const yearCount = history.filter(h => h.date && h.date.startsWith(currentYear)).length;
  animateCountUp(document.getElementById('kpi-year'), yearCount);

  // Réutilise la même fonction que le repère de moyenne perso sur les sliders
  // (voir 03b-pure-logic.js), pour ne pas dupliquer ce calcul à deux endroits.
  // Gère nativement le cas d'un ancien film sans valeur pour un critère ajouté
  // après coup (ex: "Rythme") : ne compte ni dans la somme ni dans le diviseur
  // de CE critère précis pour cette entrée, plutôt que de fausser la moyenne.
  const avgsByCriterion = computeCriteriaAverages(history, CRITERIA);
  const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
  const radarSvg = createRadarSVG(avgs);
  if (radarSvg) { 
    document.getElementById('radar-chart-container').innerHTML = radarSvg; 
    document.getElementById('radar-empty').style.display = 'none'; 
  } else { 
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block'; 
  }

  document.getElementById('timeline-chart-container').innerHTML = createTimelineSVG(history);

  const dirs = {};
  history.forEach(h => {
    if(h.director) { 
      h.director.split(',').forEach(d => {
        const t = d.trim(); if(!t) return;
        if(!dirs[t]) dirs[t] = { count:0, sum:0 }; 
        dirs[t].count++; dirs[t].sum+=parseFloat(h.score);
      });
    }
  });
  const topD = Object.entries(dirs).map(([name,d]) => ({name, count:d.count, avg:d.sum/d.count})).filter(d=>d.count>1).sort((a,b)=>b.count-a.count || b.avg-a.avg).slice(0,4);
  const dirCont = document.getElementById('top-directors-list');
  if(topD.length > 0) {
    dirCont.innerHTML = topD.map(d => `<div class="top-item" onclick="document.getElementById('history-search').value='${d.name}';document.getElementById('history-search').dispatchEvent(new Event('input'))"><span class="top-item-name">${d.name}</span><div class="top-item-meta"><span>${d.count} films</span><span class="top-item-score">★ ${d.avg.toFixed(1)}</span></div></div>`).join('');
  } else { 
    dirCont.innerHTML = `<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>`; 
  }

  const dist = { '50':0, '45':0, '40':0, '35':0, '30':0, '25':0, '20':0, '15':0, '10':0, '05':0 };
  history.forEach(item => {
    const stars = Math.round((parseFloat(item.score) / 2) * 2) / 2;
    const key   = Math.round(stars * 10).toString().padStart(2,'0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
  renderProfileExtras(history);
  renderProfileDiscoveryCards();
}

// ─── Onglet Profil : temps visionné, acteur favori, membre depuis, série, badges ──
function resetProfileExtras() {
  document.getElementById('profile-member-since').textContent = '—';
  document.getElementById('profile-watch-time').textContent = '—';
  document.getElementById('profile-fav-actor').textContent = '—';
  document.getElementById('profile-streak').textContent = 'Pas de série en cours';
  renderBadges(computeBadges([], {}));
  drawProfileShareCard(null);
}

function renderProfileExtras(history) {
  // Membre depuis : date la plus ancienne connue (savedAt, ou date à défaut).
  const dates = history
    .map(h => h.savedAt || h.date)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d));
  let memberSinceStr = '—';
  if (dates.length > 0) {
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    memberSinceStr = earliest.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  document.getElementById('profile-member-since').textContent = memberSinceStr;

  // Temps total visionné : somme des durées (le champ runtime est stocké en
  // texte libre, ex: "142 min" — parseInt s'arrête au premier caractère non
  // numérique, donc ça fonctionne aussi bien avec juste "142").
  const totalMinutes = history.reduce((sum, h) => {
    const mins = parseInt(h.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  document.getElementById('profile-watch-time').textContent = formatWatchTime(totalMinutes);

  // Acteur favori : même principe que le top réalisateurs (compte + note
  // moyenne), mais un seul nom affiché ici.
  const actorStats = {};
  history.forEach(h => {
    if (h.actors) {
      h.actors.split(',').forEach(a => {
        const t = a.trim(); if (!t) return;
        if (!actorStats[t]) actorStats[t] = { count: 0, sum: 0 };
        actorStats[t].count++; actorStats[t].sum += parseFloat(h.score) || 0;
      });
    }
  });
  const topActors = Object.entries(actorStats)
    .map(([name, d]) => ({ name, count: d.count, avg: d.sum / d.count }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
  document.getElementById('profile-fav-actor').textContent =
    topActors.length > 0 ? `${topActors[0].name} (${topActors[0].count} film${topActors[0].count > 1 ? 's' : ''})` : '—';

  // Série en cours (streak) : semaines ISO consécutives avec au moins un film.
  const streak = computeWeekStreak(history);
  document.getElementById('profile-streak').textContent =
    streak > 0 ? `${streak} semaine${streak > 1 ? 's' : ''} de suite` : 'Pas de série en cours';

  const badges = computeBadges(history, { totalMinutes, streak });
  renderBadges(badges);

  // Genre favori (pour la carte de profil) : même logique que le top
  // réalisateurs/acteur favori, sur le champ genre.
  const genreCounts = {};
  history.forEach(h => { if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; }); });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Moyennes par critère (mode détaillé) : pour le mini-radar de la carte de
  // profil. null si l'utilisateur n'a jamais utilisé le mode détaillé.
  const criteriaAverages = computeCriteriaAverages(history, CRITERIA);
  const hasCriteriaData = Object.values(criteriaAverages).some(v => v !== null);

  drawProfileShareCard({
    history, totalMinutes, memberSinceStr,
    topActor: topActors[0]?.name,
    topGenre,
    criteriaAverages: hasCriteriaData ? criteriaAverages : null,
    badges,
  });
}

function renderBadges(badges) {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  // Compteur dans l'en-tête plié : l'info essentielle (progression) reste
  // visible sans déplier, le détail ne prend plus tout cet espace du profil.
  const countEl = document.getElementById('badges-count');
  if (countEl) {
    const unlocked = badges.filter(b => b.unlocked).length;
    countEl.textContent = `${unlocked}/${badges.length}`;
  }
  grid.innerHTML = badges.map(b => `
    <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'}" title="${b.unlocked ? 'Débloqué' : 'Pas encore débloqué'}">
      <div class="badge-icon">${ICONS.star}</div>
      <div class="badge-label">${b.label}</div>
    </div>
  `).join('');
}

// Carte de profil partageable : dessinée sur un <canvas>, avec les couleurs
// et la police du thème actif (lues via getComputedStyle), pour que l'image
// exportée corresponde à l'identité visuelle choisie plutôt qu'un rendu
// générique. Pas de librairie externe — dessin manuel, comme pour
// l'extraction de couleur dominante (00c-poster-color.js).
// Dessine un petit radar (moyennes par critère) sur le canvas — même principe
// que createRadarSVG (06-history.js) mais en dessin canvas natif, pas du SVG.
function drawMiniRadarOnCanvas(ctx, cx, cy, radius, criteriaAverages, color, gridColor) {
  const keys = CRITERIA;
  const angleStep = (Math.PI * 2) / keys.length;

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  keys.forEach((k, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  keys.forEach((k, i) => {
    const val = criteriaAverages[k] || 0;
    const r = (val / 10) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Bande de perforations façon pellicule de film — juste décoratif, en haut et
// en bas de la carte, pour ancrer visuellement le thème "cinéma".
function drawFilmStripBand(ctx, y, w, color) {
  const holeW = 10, holeH = 6, gap = 8;
  ctx.fillStyle = color;
  for (let x = gap; x < w - gap; x += holeW + gap) {
    ctx.fillRect(x, y, holeW, holeH);
  }
}

function drawProfileShareCard(data) {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // certains environnements restrictifs renvoient null plutôt que de lever une erreur
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const gold = styles.getPropertyValue('--gold').trim() || accent;
  const border = styles.getPropertyValue('--border').trim() || '#333';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  // Fond en léger dégradé (pas un simple aplat) pour donner un peu de profondeur.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  drawFilmStripBand(ctx, 10, w, accent);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 26px "${fontHeading}", sans-serif`;
  ctx.fillText('LUDEX', w / 2, 52);
  ctx.fillStyle = textMid;
  ctx.font = `12px "${fontHeading}", sans-serif`;
  ctx.fillText('MON PROFIL CINÉPHILE', w / 2, 72);

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = textMid;
    ctx.font = '15px sans-serif';
    ctx.fillText('Note quelques films pour', w / 2, h / 2 - 8);
    ctx.fillText('débloquer ta carte de profil', w / 2, h / 2 + 16);
    drawFilmStripBand(ctx, h - 16, w, accent);
    return;
  }

  const { history, totalMinutes, memberSinceStr, topActor, topGenre, criteriaAverages, badges } = data;
  const avg = history.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0) / history.length;

  // Chiffre "héros" : le nombre de films, en très grand, façon Wrapped.
  ctx.fillStyle = textHi;
  ctx.font = `900 68px "${fontHeading}", sans-serif`;
  ctx.fillText(String(history.length), w / 2, 148);
  ctx.fillStyle = textMid;
  ctx.font = `bold 12px "${fontHeading}", sans-serif`;
  ctx.fillText('FILMS NOTÉS', w / 2, 168);

  // Note moyenne, mise en avant juste en dessous.
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`★ ${avg.toFixed(1)}/10 de moyenne`, w / 2, 196);

  // Mini-radar (mode détaillé utilisé) ou, à défaut, un genre/acteur mis en avant.
  if (criteriaAverages) {
    drawMiniRadarOnCanvas(ctx, w / 2, 275, 65, criteriaAverages, accent, border);
  } else {
    ctx.fillStyle = textMid;
    ctx.font = '13px sans-serif';
    ctx.fillText('Utilise le mode Détaillé pour', w / 2, 260);
    ctx.fillText('débloquer ton profil de goûts (radar)', w / 2, 280);
  }

  // Genre et acteur favoris, côte à côte.
  ctx.font = '11px sans-serif';
  ctx.fillStyle = textMid;
  ctx.fillText('GENRE FAVORI', w * 0.28, 345);
  ctx.fillText('ACTEUR FAVORI', w * 0.72, 345);
  ctx.fillStyle = textHi;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(topGenre || '—', w * 0.28, 365);
  ctx.fillText(topActor || '—', w * 0.72, 365);

  // Badges débloqués : jusqu'à 6 pastilles, pleines si débloquées.
  const unlocked = (badges || []).filter(b => b.unlocked).slice(0, 6);
  const badgeY = 400;
  const badgeR = 14;
  const totalBadgeWidth = unlocked.length * (badgeR * 2 + 10) - 10;
  let bx = w / 2 - totalBadgeWidth / 2 + badgeR;
  unlocked.forEach(() => {
    ctx.beginPath();
    ctx.arc(bx, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    bx += badgeR * 2 + 10;
  });
  if (unlocked.length > 0) {
    ctx.fillStyle = textMid;
    ctx.font = '10px sans-serif';
    ctx.fillText(`${unlocked.length} badge${unlocked.length > 1 ? 's' : ''} débloqué${unlocked.length > 1 ? 's' : ''}`, w / 2, badgeY + 32);
  }

  // Pied de carte : membre depuis + temps visionné.
  ctx.fillStyle = textMid;
  ctx.font = '11px sans-serif';
  ctx.fillText(`Membre depuis ${memberSinceStr || '—'} · ${formatWatchTime(totalMinutes)} de films`, w / 2, h - 26);

  drawFilmStripBand(ctx, h - 16, w, accent);
}

document.getElementById('profile-share-btn').addEventListener('click', () => {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
    showToast("Ton navigateur ne permet pas de générer cette image.");
    return;
  }
  const link = document.createElement('a');
  link.download = 'ludex-profil.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Image téléchargée.');
});

// ═══════════════════════════════════════════
//  RÉTROSPECTIVE ANNUELLE ("WRAPPED")
// ═══════════════════════════════════════════
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatMonthLabel(monthKey) {
  // monthKey au format "2026-03"
  const [y, m] = monthKey.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// Année à retenir par défaut : la plus récente qui a des films notés (pas
// forcément l'année civile en cours, si l'utilisateur vient de commencer ou
// n'a rien noté depuis un moment).
function getWrappedDefaultYear(history) {
  const years = history
    .map(h => { const d = h.savedAt || h.date; return d ? parseInt(d.slice(0, 4), 10) : null; })
    .filter(Boolean);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
}

function buildWrappedSlides(stats) {
  const slides = [];

  slides.push(`
    <div class="wrapped-slide-eyebrow">Ton année ${stats.year}</div>
    <div class="wrapped-slide-big">${stats.totalFilms}</div>
    <div class="wrapped-slide-label">film${stats.totalFilms > 1 ? 's' : ''} noté${stats.totalFilms > 1 ? 's' : ''}</div>
    <div class="wrapped-slide-detail">Voyons ce que ${stats.totalFilms > 1 ? 'ces films disent' : 'ce film dit'} de ton année cinéma...</div>
  `);

  if (stats.topGenre || stats.topDirector) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Tes habitudes</div>
      ${stats.topGenre ? `<div class="wrapped-slide-label">🎭 Genre favori : ${escAttr(stats.topGenre.name)}</div><div class="wrapped-slide-detail">${stats.topGenre.count} film${stats.topGenre.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.topDirector ? `<div class="wrapped-slide-label" style="margin-top:22px;">🎬 Réalisateur favori : ${escAttr(stats.topDirector.name)}</div><div class="wrapped-slide-detail">${stats.topDirector.count} film${stats.topDirector.count > 1 ? 's' : ''}</div>` : ''}
    `);
  }

  if (stats.topMonth || stats.bestRated) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Les temps forts</div>
      ${stats.topMonth ? `<div class="wrapped-slide-label">📅 Mois le plus actif</div><div class="wrapped-slide-detail">${formatMonthLabel(stats.topMonth.name)} — ${stats.topMonth.count} film${stats.topMonth.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.bestRated ? `<div class="wrapped-slide-label" style="margin-top:22px;">⭐ Ton coup de cœur</div><div class="wrapped-slide-detail">${escAttr(stats.bestRated.title)} — ${stats.bestRated.score}/10</div>` : ''}
    `);
  }

  slides.push(`
    <div class="wrapped-slide-eyebrow">Le récap'</div>
    <div class="wrapped-slide-big" style="font-size:2.2rem;">${stats.avgScore.toFixed(1)}<span style="font-size:1.2rem;color:var(--text-mid);">/10</span></div>
    <div class="wrapped-slide-label">note moyenne de l'année</div>
    <div class="wrapped-slide-detail">${formatWatchTime(stats.totalMinutes)} passées devant l'écran</div>
  `);

  slides.push(`
    <div class="wrapped-slide-eyebrow">À partager</div>
    <div class="wrapped-share-canvas-wrap"><canvas id="wrapped-share-canvas" width="360" height="480"></canvas></div>
    <button type="button" class="wrapped-share-btn" id="wrapped-share-download-btn">Télécharger l'image</button>
  `);

  return slides;
}

function drawWrappedShareCard(stats) {
  const canvas = document.getElementById('wrapped-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 24px "${fontHeading}", sans-serif`;
  ctx.fillText(`LUDEX WRAPPED ${stats.year}`, w / 2, 55);

  ctx.fillStyle = textHi;
  ctx.font = `900 80px "${fontHeading}", sans-serif`;
  ctx.fillText(String(stats.totalFilms), w / 2, 175);
  ctx.fillStyle = textMid;
  ctx.font = `bold 13px "${fontHeading}", sans-serif`;
  ctx.fillText(`FILM${stats.totalFilms > 1 ? 'S' : ''} EN ${stats.year}`, w / 2, 198);

  const rows = [
    ['Note moyenne', `${stats.avgScore.toFixed(1)}/10`],
    ['Genre favori', stats.topGenre?.name || '—'],
    ['Réalisateur favori', stats.topDirector?.name || '—'],
    ['Coup de cœur', stats.bestRated?.title || '—'],
    ['Temps visionné', formatWatchTime(stats.totalMinutes)],
  ];
  let y = 250;
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = textMid;
    ctx.font = '11px sans-serif';
    ctx.fillText(label.toUpperCase(), 30, y);
    ctx.fillStyle = textHi;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(val, 30, y + 22);
    y += 46;
  });
}

(function initWrappedModal() {
  const modal = document.getElementById('wrapped-modal');
  const entryCard = document.getElementById('wrapped-entry-card');
  const closeBtn = document.getElementById('wrapped-close-btn');
  const slidesEl = document.getElementById('wrapped-slides');
  const dotsEl = document.getElementById('wrapped-dots');
  const prevBtn = document.getElementById('wrapped-prev-btn');
  const nextBtn = document.getElementById('wrapped-next-btn');
  if (!modal || !entryCard) return;

  let slides = [];
  let current = 0;

  function renderCurrentSlide() {
    slidesEl.innerHTML = slides.map((html, i) =>
      `<div class="wrapped-slide${i === current ? ' active' : ''}${i < current ? ' leaving-left' : ''}">${html}</div>`
    ).join('');
    dotsEl.innerHTML = slides.map((_, i) => `<span class="onboarding-dot${i === current ? ' active' : ''}"></span>`).join('');
    prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === slides.length - 1 ? 'Fermer' : 'Suivant';

    if (current === slides.length - 1) {
      const shareBtn = document.getElementById('wrapped-share-download-btn');
      drawWrappedShareCard(window._currentWrappedStats);
      shareBtn?.addEventListener('click', () => {
        const canvas = document.getElementById('wrapped-share-canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ludex-wrapped-${window._currentWrappedStats.year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Image téléchargée.');
      });
    }
  }

  entryCard.addEventListener('click', () => {
    const history = loadHistory();
    const year = getWrappedDefaultYear(history);
    const stats = computeWrappedStats(history, year);
    window._currentWrappedStats = stats;
    slides = buildWrappedSlides(stats);
    current = 0;
    renderCurrentSlide();
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    closeBtn.focus();
  });

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { closeModal(modal); return; }
    current++;
    renderCurrentSlide();
  });
  prevBtn.addEventListener('click', () => {
    if (current === 0) return;
    current--;
    renderCurrentSlide();
  });
  closeBtn.addEventListener('click', () => closeModal(modal));
})();

function buildHistogram(dist) {
  const container = document.getElementById('histogram');
  container.innerHTML = '';
  const order = [50, 45, 40, 35, 30, 25, 20, 15, 10, '05'];
  const labels = {
    50: '★★★★★', 45: '★★★★½', 40: '★★★★', 35: '★★★½', 30: '★★★',
    25: '★★½',   20: '★★',    15: '★½',    10: '★',    '05': '½'
  };
  const maxVal = Math.max(...Object.values(dist), 1);
  order.forEach(key => {
    const count   = dist[key] || 0;
    const pct     = (count / maxVal) * 100;
    const row     = document.createElement('div');
    const isActive = activeScoreFilter === String(key);
    row.className = 'histo-row' + (isActive ? ' active' : '');
    row.title = count > 0 ? `Filtrer par ${labels[key]}` : '';
    row.innerHTML = `
      <span class="histo-label">${labels[key]}</span>
      <div class="histo-track"><div class="histo-bar" style="width:${pct}%"></div></div>
      <span class="histo-count">${count}</span>`;
    if (count > 0) {
      row.addEventListener('click', () => {
        if (activeScoreFilter === String(key)) {
          activeScoreFilter = null;
        } else {
          activeScoreFilter = String(key);
          activeGenre = null; 
        }
        renderAll();
        document.querySelector('.history-scroller')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    container.appendChild(row);
  });
}

function renderAll() {
  renderStats();
  renderHistory();
}

// ═══════════════════════════════════════════
//  SORT FILTERS
// ═══════════════════════════════════════════
document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
});

// ── Découvrabilité du swipe ──
// Les gestes de glissement (noter à nouveau / supprimer) sont puissants mais
// invisibles : rien n'indique qu'ils existent. À la PREMIÈRE visite de
// l'historique (avec au moins un film), la première carte fait un petit
// aperçu automatique — elle glisse brièvement, révélant l'action cachée
// dessous, puis revient. Une seule fois, jamais plus (clé localStorage).
const SWIPE_HINT_KEY = 'lbx_swipe_hint_seen';
function maybePlaySwipeHint() {
  if (localStorage.getItem(SWIPE_HINT_KEY)) return;
  const firstItem = document.querySelector('.hist-item');
  if (!firstItem) return; // pas de film : on retentera à une prochaine visite
  const content = firstItem.querySelector('.hist-item-content');
  if (!content) return;
  localStorage.setItem(SWIPE_HINT_KEY, '1');

  // Respecte la préférence de réduction des animations
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setTimeout(() => {
    firstItem.classList.add('hist-swipe-left'); // révèle l'indice visuel sous la carte
    content.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
    content.style.transform = 'translateX(-56px)';
    setTimeout(() => {
      content.style.transform = '';
      setTimeout(() => {
        firstItem.classList.remove('hist-swipe-left');
        content.style.transition = '';
      }, 450);
    }, 900);
  }, 600);
}
// ── Rendu des trois cartes Profil ajoutées (Il y a un an / Heatmap / Décennies) ──
function renderYearAgoCard(history) {
  const card = document.getElementById('year-ago-card');
  const body = document.getElementById('year-ago-body');
  if (!card || !body) return;
  const found = findOneYearAgoFilm(history, new Date());
  if (!found) { card.style.display = 'none'; return; }
  card.style.display = '';
  const { item } = found;
  const posterHtml = item.poster
    ? `<img class="year-ago-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="year-ago-poster year-ago-poster-ph">${ICONS.clapper}</div>`;
  body.innerHTML = `
    ${posterHtml}
    <div>
      <div class="year-ago-title">${escAttr(item.title)}</div>
      <div class="year-ago-meta">Tu regardais ce film à la même période l'an dernier${item.year ? ` (${escAttr(String(item.year))})` : ''}.</div>
      ${item.score ? `<div class="year-ago-score">Ta note : ${escAttr(String(item.score))}/10</div>` : ''}
    </div>
  `;
}

function renderHeatmap(history) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const counts = computeDailyCounts(history);

  // 53 colonnes de semaines, en remontant depuis aujourd'hui jusqu'à ~1 an.
  // On démarre au lundi de la semaine d'il y a 52 semaines pour des colonnes alignées.
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = (start.getDay() + 6) % 7; // lundi=0
  start.setDate(start.getDate() - dayOfWeek);

  let html = '';
  const cur = new Date(start);
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10);
    const n = counts[key] || 0;
    const lvl = n === 0 ? 'l0' : n === 1 ? 'l1' : n === 2 ? 'l2' : 'l3';
    html += `<div class="heatmap-cell ${lvl}" title="${key}${n > 0 ? ` — ${n} film${n > 1 ? 's' : ''}` : ''}"></div>`;
    cur.setDate(cur.getDate() + 1);
  }
  grid.innerHTML = html;
  // Amène la vue sur la fin (les semaines récentes), pas le début d'il y a un an
  const scroll = grid.parentElement;
  if (scroll) scroll.scrollLeft = scroll.scrollWidth;
}

function renderDecades(history) {
  const card = document.getElementById('decades-card');
  const list = document.getElementById('decades-list');
  if (!card || !list) return;
  const stats = computeDecadeStats(history);
  if (stats.length === 0) { card.style.display = 'none'; return; }
  card.style.display = '';
  const max = stats[0].count;
  list.innerHTML = stats.slice(0, 6).map(d => `
    <div class="decade-row">
      <span class="decade-label">${d.decade}s</span>
      <div class="decade-bar-track"><div class="decade-bar" style="width:${Math.round(d.count / max * 100)}%"></div></div>
      <span class="decade-count">${d.count} · ${d.avg !== null ? d.avg.toFixed(1) : '—'}</span>
    </div>
  `).join('');
}

// Regroupe les trois cartes ajoutées ensuite (Il y a un an / Heatmap /
// Décennies). Nom distinct de renderProfileExtras : les deux fonctions
// portaient le même nom à un moment, et la seconde écrasait silencieusement
// la première par hissage — cassant toute la carte "Ton profil" (Membre
// depuis, Temps visionné...). Leçon : un nom = une fonction, vérifié par grep.
function renderProfileDiscoveryCards() {
  const history = loadHistory();
  renderYearAgoCard(history);
  renderHeatmap(history);
  renderDecades(history);
}
