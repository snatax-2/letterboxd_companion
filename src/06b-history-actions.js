// ═══════════════════════════════════════════
//  HISTORIQUE — actions rapides (toast, feuille d'action, appui long)
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre les
// actions déclenchées DEPUIS une carte d'historique (toast avec
// annulation, feuille d'action à l'appui long, copier le détail,
// aimer/ne plus aimer). Le rendu de la liste elle-même vit dans
// 06a-history-list.js.

let toastTimer;
let deletedItemCache = null; 
let deletedItemIndex = null;

function showToast(msg, withUndo = false, undoFnName = 'undoDelete') {
  const t = document.getElementById('toast');

  // Construction DOM sûre (textContent) plutôt qu'innerHTML : les messages
  // contiennent souvent des titres de films (données externes TMDb/imports) —
  // corriger ici, au puits, sécurise TOUS les appels d'un coup, sans devoir
  // penser à échapper à chaque site d'appel.
  t.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (withUndo) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo-btn';
    btn.textContent = 'Annuler';
    btn.addEventListener('click', () => { if (typeof window[undoFnName] === 'function') window[undoFnName](); });
    t.appendChild(btn);
  }

  t.classList.add('show');
  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => { 
      t.classList.remove('show');
      deletedItemCache = null; 
  }, withUndo ? 4500 : 2800);
}

window.deleteItem = function(idx, btnEl) {
  const history = loadHistory();
  const target = history[idx];
  if (!target) return;
  deletedItemCache = target;
  deletedItemIndex = idx;

  if (btnEl) {
    const cardToAnimate = btnEl.closest('.hist-item');
    cardToAnimate.classList.add('deleting');
  }

  setTimeout(() => {
    // ── MISE À JOUR PERDUE (corrigé) ────────────────────────────────────
    // Cette fonction lisait l'historique AVANT le setTimeout, puis écrivait
    // cet instantané vieux de 300 ms. Deux suppressions coup sur coup
    // prenaient donc le MÊME instantané (rien n'ayant encore été écrit) et
    // la seconde écriture écrasait la première : le film supprimé en premier
    // réapparaissait. Reproduit : supprimer A puis C sur [C, B, A] laissait
    // [B, A] au lieu de [B].
    //
    // Deuxième défaut du même endroit : `idx` était figé à l'appel. Après une
    // suppression concurrente, tous les index suivants se décalent — l'index
    // gardé désigne alors un AUTRE film. C'est exactement le piège que
    // resolveCurrentIdx() documente et évite déjà plus bas dans ce fichier ;
    // il n'avait simplement jamais été appliqué ici, alors que ce chemin
    // (le bouton en surimpression) est aujourd'hui le seul encore vivant.
    //
    // On relit donc l'historique au moment d'écrire, et on retrouve le film
    // par son identité plutôt que par sa position.
    const fresh = loadHistory();
    const realIdx = fresh.findIndex(h =>
      h.savedAt === target.savedAt && (h.title || '') === (target.title || ''));
    if (realIdx === -1) return; // déjà supprimé entre-temps : rien à faire
    fresh.splice(realIdx, 1);
    saveHistory(fresh);
    if (target.title) {
      recordTombstone(HISTORY_TOMBSTONES_KEY, target.title.toLowerCase());
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
function buildCopyTextForItem(item) {
  const heartStr = item.liked ? ' ❤️' : '';
  const dateStr = item.date
    ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const score = parseFloat(item.score) || 0;
  const stars = getStarStr(scoreToStars(score));

  let text = `📽 ${escAttr(item.title)} ${item.year ? '(' + item.year + ') ' : ''}${heartStr}\n`;
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

  if (item.review) text += `\n${escAttr(item.review)}`;
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
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
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
    // 240ms = --dur-base (styles.css :root), doit rester synchronisé avec la
    // transition de sortie ci-dessous (même correctif que watchlist et la
    // fiche film : l'ancien délai de 200ms coupait l'animation 40ms trop tôt).
    const EXIT_DUR_MS = 240;
    if (dir === 'left') {
      item.classList.add('hist-swipe-out-left');
      content.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => deleteItem(resolveCurrentIdx()), EXIT_DUR_MS); // pas de btnEl : évite de cumuler avec l'animation .deleting existante
    } else {
      item.classList.add('hist-swipe-out-right');
      content.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => loadItem(resolveCurrentIdx()), EXIT_DUR_MS);
    }
  }

  function resetGesture(e) {
    if (e && pressedItem) e.stopPropagation();
    clearTimeout(pressTimer);
    if (pressedItem) pressedItem.classList.remove('hist-dragging'); // réactive la transition pour l'animation de relâchement
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
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture(e);
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.hist-item');
    // Ludex 2.0 : Historique passé en grille — plus de GLISSEMENT possible
    // (une cellule de grille n'a pas la place pour révéler un indice en
    // dessous), et .hist-item-content, l'élément qu'on faisait coulisser,
    // n'est plus produit par renderHistory() (06a-history-list.js).
    //
    // Cette absence servait jusqu'ici de garde ICI, à l'entrée du geste, pour
    // neutraliser le fichier entier d'un coup. Trop large : ce handler porte
    // AUSSI l'appui long, qui ouvre le menu d'actions rapides et ne dépend
    // d'aucun déplacement. Vérifié dans un vrai navigateur : maintenir le
    // doigt 800 ms sur une carte n'ouvrait plus rien. "Copier le texte"
    // n'était alors plus atteignable nulle part, et "Coups de cœur" seulement
    // en repassant par Modifier. La garde est donc redescendue au seul
    // endroit qui glisse (voir `pressedContent` dans touchmove/mousemove).
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) { resetGesture(); return; }
    e.stopPropagation(); // évite que ce geste ne remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    // NOTE : ne PAS annuler ici un item armé — un simple tap déclenche
    // touchstart AVANT click, et annuler dès le toucher tuait l'état armé
    // avant que le clic de confirmation n'arrive (le tap "Supprimer" ouvrait
    // alors la fiche du film). L'annulation pour cause de nouveau geste se
    // fait plus bas, au moment où un VRAI glissement démarre (swipeMode).
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
        // Pas de .hist-item-content : rien à faire coulisser (balisage en
        // grille). On traite le mouvement comme un défilement — c'est ici
        // que vit désormais la neutralisation du glissement, et nulle part
        // ailleurs. Sans ça, la branche 'swipe' plus bas déréférencerait un
        // pressedContent nul.
        if (!pressedContent) { swipeMode = 'scroll'; return; }
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // C'est ICI (nouveau glissement réellement engagé) qu'on nettoie un
        // éventuel état armé du même film — assez tôt pour éviter les deux
        // états contradictoires (le bug historique du re-swipe), assez tard
        // pour ne pas tuer le tap de confirmation (qui ne passe jamais ici).
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          // Désactive la transition CSS pendant le glissement actif (classe
          // prévue mais jamais posée jusqu'ici) : sans ça, chaque mise à jour
          // de translateX() au fil du doigt s'anime sur 240ms au lieu d'être
          // instantanée — un léger effet "élastique" qui traîne derrière le
          // doigt plutôt qu'un suivi 1:1 franc.
          pressedItem.classList.add('hist-dragging');
        }
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
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
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
        // Bug corrigé, indépendant du précédent : ce chemin souris n'a JAMAIS
        // eu la garde .hist-item-content que le chemin tactile portait. Sur le
        // balisage en grille, glisser une carte à la souris arrivait donc
        // jusqu'à `pressedContent.style` avec pressedContent nul — mesuré :
        // 7 TypeError par glissement. Même traitement que le tactile.
        if (!pressedContent) { swipeMode = 'scroll'; return; }
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // Même correctif que le tactile : nettoyer un état armé au démarrage
        // d'un VRAI glissement, jamais au simple clic (voir touchstart).
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging'); // voir le commentaire côté tactile
        }
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

  // Activation clavier (Entrée/Espace) de .hist-item-open : role="button" +
  // tabindex="0" rendent l'élément focusable et l'annoncent comme un bouton
  // aux lecteurs d'écran, mais NE déclenchent PAS d'activation clavier tout
  // seuls (contrairement à un vrai <button>) — sans ce gestionnaire, il était
  // impossible d'ouvrir une fiche film au clavier depuis l'historique.
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const opener = e.target.closest('.hist-item-open');
    if (!opener) return;
    e.preventDefault(); // Espace ne doit pas aussi faire défiler la page
    const item = opener.closest('.hist-item');
    if (!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    const movieItem = loadHistory()[idx];
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

