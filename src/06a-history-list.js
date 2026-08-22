// ═══════════════════════════════════════════
//  HISTORIQUE — liste, recherche, tri, filtre par genre
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js (1698 lignes, 6
// responsabilités mêlées) — ce fichier ne couvre que le rendu de la
// LISTE elle-même : recherche, tri, filtre par genre, l'indice de
// glissement au premier chargement. Les actions (feuille d'action,
// toast) vivent dans 06b-history-actions.js ; les statistiques du
// Profil et les cartes à partager dans 06c/06d.

// Ludex 2.0 : la composition "entrée vedette + liste groupée par mois" est
// spécifique au thème par défaut (voir "Vers Ludex 2.0" §01 — les 6 autres
// thèmes gardent leur liste de cartes intacte). isDefaultComposition() vit
// désormais dans 03-foundation.js (partagée avec la watchlist).

const MONTH_LABELS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
// item.date / item.savedAt sont des chaînes ISO (YYYY-MM-DD...) — on prend
// les 7 premiers caractères comme clé de regroupement (année-mois), sans
// dépendre d'un format plus permissif que ce que loadHistory() garantit déjà.
function monthKeyOf(item) {
  const raw = item.date || item.savedAt || '';
  return raw.slice(0, 7); // "YYYY-MM"
}
function monthLabelOf(key) {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  if (!y || idx < 0 || idx > 11) return 'Date inconnue';
  return `${MONTH_LABELS_FR[idx]} ${y}`;
}

// Entrée vedette : le film le plus récemment noté, en grand, au-dessus de la
// liste — alimentée par la même donnée que la liste (aucun calcul dupliqué).
// N'apparaît qu'en tri chronologique (sortOrder === 'date'), seul contexte où
// "le plus récent" a un sens pour l'utilisateur.
function renderHistoryHero(sorted) {
  const hero = document.getElementById('history-hero');
  if (!hero) return;
  if (!isDefaultComposition() || sortOrder !== 'date' || sorted.length === 0) {
    hero.innerHTML = '';
    return;
  }
  const item = sorted[0];
  const imgHtml = item.poster
    ? `<img class="hero-entry-poster" src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async">`
    : `<div class="hero-entry-poster"></div>`;
  hero.innerHTML = `
    <div class="hero-entry">
      ${imgHtml}
      <div class="hero-entry-body">
        <div class="hero-entry-eyebrow">Dernier film noté</div>
        <div class="hero-entry-title">${escAttr(item.title)}</div>
        <div class="hero-entry-score">${item.score}<small>/10</small></div>
      </div>
    </div>`;
}

let histSearchTimer;
// Dispatche vers le bon rendu selon la bascule Films/Séries — un seul
// point d'entrée pour les 3 déclencheurs (recherche, filtres de tri,
// bascule elle-même) plutôt que de dupliquer la condition partout.
function renderActiveHistoryView() {
  if (historyMediaFilter === 'tv') { if (typeof renderTvHistory === 'function') renderTvHistory(); }
  else renderHistory();
}
const historySearchEl = document.getElementById('history-search');
const historySearchClearBtn = document.getElementById('history-search-clear-btn');
historySearchEl.addEventListener('input', (e) => {
  historySearchQuery = e.target.value.toLowerCase();
  historySearchClearBtn.style.display = e.target.value ? 'flex' : 'none';
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(renderActiveHistoryView, 150);
});
historySearchClearBtn.addEventListener('click', () => {
  historySearchEl.value = '';
  historySearchEl.dispatchEvent(new Event('input'));
  historySearchEl.focus();
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

function renderGenreChips(items, onFilterChange = renderHistory) {
  const genres = getGenres(items);
  const row    = document.getElementById('genre-fold');
  const chips  = document.getElementById('genre-chips');
  const currentLabel = document.getElementById('genre-fold-current');

  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  // Le genre actif reste lisible plié : c'est ce qui rend le pliage acceptable
  // (l'état du filtre n'est jamais caché, seule la liste des options l'est).
  if (currentLabel) currentLabel.textContent = activeGenre || 'Tous';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (activeGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { activeGenre = null; activeScoreFilter = null; renderGenreChips(items, onFilterChange); onFilterChange(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (activeGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      activeGenre = (activeGenre === g) ? null : g;
      renderGenreChips(items, onFilterChange);
      onFilterChange();
    });
    chips.appendChild(chip);
  });
}

// Tranches de note partagées entre films et séries (histogramme, filtre par
// clic sur une barre) — extrait ici pour ne pas dupliquer cette table.
const SCORE_RANGES = {
  '50': [9,10], '45': [8.5,9], '40': [7.5,8.5], '35': [6.5,7.5], '30': [5.5,6.5],
  '25': [4.5,5.5], '20': [3.5,4.5], '15': [2.5,3.5], '10': [1.5,2.5], '05': [0,1.5]
};
function isScoreInActiveRange(score) {
  if (activeScoreFilter === null) return true;
  const [lo, hi] = SCORE_RANGES[activeScoreFilter] || [0, 10];
  const s = parseFloat(score);
  return s >= lo && (activeScoreFilter === '50' ? s <= hi : s < hi);
}

function getSorted(history) {
  let h = history;

  if (activeGenre) {
    h = h.filter(item => item.genre && item.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }

  if (activeScoreFilter !== null) {
    h = h.filter(item => isScoreInActiveRange(item.score));
  }

  // Ludex 2.0 : filtre "Coups de cœur" — réutilise item.liked, déjà posé par
  // le cœur du formulaire Noter (voir 05-rating-form.js), aucune nouvelle
  // donnée à créer.
  if (activeLikedFilter) {
    h = h.filter(item => item.liked);
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
  const showCount = loadTvShows().length;
  const tvFragment = ` \u00b7 ${showCount} s\u00e9rie${showCount > 1 ? 's' : ''}`;
  if (activeGenre || historySearchQuery || activeScoreFilter || activeLikedFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}${tvFragment}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '') + tvFragment;
    badge.style.color = '';
  }

  renderGenreChips(history);
  document.getElementById('filter-row').style.display = history.length === 0 ? 'none' : '';

  if (history.length === 0) {
    document.getElementById('history-hero').innerHTML = '';
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>La salle est vide\u2026 Note ton premier film pour lancer la s\u00e9ance !<button type="button" class="empty-state-cta" id="empty-state-history-cta">Rechercher mon premier film</button></div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  if (sorted.length === 0) {
    document.getElementById('history-hero').innerHTML = '';
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Rien \u00e0 l'affiche sous ce filtre.</div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  renderHistoryHero(sorted);

  const groupByMonth = isDefaultComposition() && sortOrder === 'date';
  let lastMonthKey = null;
  // Cascade d'entr\u00e9e r\u00e9serv\u00e9e au tout premier affichage R\u00c9EL de l'onglet
  // Historique (pas un rendu d\u00e9clench\u00e9 en arri\u00e8re-plan par renderAll() au
  // d\u00e9marrage pendant qu'un autre onglet est affich\u00e9 \u2014 l'animation serait
  // consomm\u00e9e silencieusement sans jamais \u00eatre vue). M\u00eame principe que
  // renderStats()/statsDirty pour Profil, voir 06c-profile-stats.js.
  const historyViewVisible = document.getElementById('view-history')?.classList.contains('active');
  const cascadeEntrance = groupByMonth && historyViewVisible && !window._historyFirstRenderDone;
  if (groupByMonth && historyViewVisible) window._historyFirstRenderDone = true;

  // Ludex 2.0 : r\u00e9cap mensuel (X films, moyenne) \u2014 calcul\u00e9 une fois sur
  // l'ensemble affich\u00e9 (sorted, donc d\u00e9j\u00e0 pass\u00e9 par les filtres actifs),
  // pas re-parcouru \u00e0 chaque s\u00e9parateur.
  const monthStats = {};
  if (groupByMonth) {
    sorted.forEach(item => {
      const key = monthKeyOf(item);
      const s = (monthStats[key] = monthStats[key] || { count: 0, sum: 0 });
      s.count++;
      s.sum += parseFloat(item.score) || 0;
    });
  }

  container.innerHTML = '';
  let gridEl = null; // conteneur .hist-grid courant \u2014 recr\u00e9\u00e9 \u00e0 chaque nouveau mois
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);

    if (groupByMonth) {
      const key = monthKeyOf(item);
      if (key !== lastMonthKey) {
        const sep = document.createElement('div');
        sep.className = 'hist-month-sep';
        const stats = monthStats[key];
        const avg = stats.count > 0 ? (stats.sum / stats.count).toFixed(1) : null;
        sep.innerHTML = `<span class="hist-month-label">${escAttr(monthLabelOf(key))}</span><span class="hist-month-recap">${stats.count} film${stats.count > 1 ? 's' : ''}${avg !== null ? ` \u00b7 moy. ${avg}` : ''}</span>`;
        if (cascadeEntrance) sep.classList.add('hist-cascade-in');
        container.appendChild(sep);
        lastMonthKey = key;
        gridEl = document.createElement('div');
        gridEl.className = 'hist-grid';
        container.appendChild(gridEl);
      }
    } else if (!gridEl) {
      // Genre/recherche/coups de c\u0153ur actifs, ou tri diff\u00e9rent de "R\u00e9cents" :
      // pas de s\u00e9parateurs de mois, mais la grille reste \u2014 un seul bloc continu.
      gridEl = document.createElement('div');
      gridEl.className = 'hist-grid';
      container.appendChild(gridEl);
    }

    const scoreNum = parseFloat(item.score);
    let scoreColor = 'var(--red)';
    if (scoreNum >= 7.5) scoreColor = 'var(--green)';
    else if (scoreNum >= 5.0) scoreColor = 'var(--gold)';
    const isHighScore = scoreNum >= 8.5;
    // Ludex 2.0 : traitement "vedette" (2\u00d72, bordure) pour un coup de c\u0153ur
    // OU une note \u2265 8.5 \u2014 les deux crit\u00e8res d\u00e9j\u00e0 utilis\u00e9s c\u00f4t\u00e9 D\u00e9couvrir/
    // Watchlist pour ce m\u00eame genre de mise en avant, gard\u00e9s coh\u00e9rents ici.
    const isFeatured = !!item.liked || isHighScore;

    const div = document.createElement('div');
    div.className = 'hist-item hist-grid-card' + (isFeatured ? ' hist-grid-card-featured' : '');
    div.dataset.idx = realIdx;
    div.dataset.savedAt = item.savedAt || '';
    div.dataset.titleKey = item.title.toLowerCase();
    if (window._justSavedHistoryTitle && item.title.toLowerCase() === window._justSavedHistoryTitle) {
      div.classList.add('hist-item-entering');
    } else if (cascadeEntrance) {
      div.classList.add('hist-cascade-in');
      div.style.animationDelay = `${Math.min(i, 20) * 25}ms`;
    }

    // Ludex 2.0 : les affiches sont enregistrées en w185 (pensé pour une
    // case de grille normale) — une carte vedette 2×2 fait le double de
    // largeur, l'affiche s'étire donc et perd en netteté. Remplace juste
    // le segment de taille dans l'URL déjà stockée plutôt que de changer
    // ce qui est sauvegardé (aucune migration nécessaire, fonctionne aussi
    // sur les films déjà notés avant ce correctif).
    const posterSrc = isFeatured && item.poster ? item.poster.replace('/w185/', '/w342/') : item.poster;
    const imgHtml = posterSrc
      ? `<img class="hist-grid-poster" src="${posterSrc}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'hist-grid-poster-ph\\'>\ud83c\udfac</div>'">`
      : `<div class="hist-grid-poster-ph">${ICONS.clapper}</div>`;

    div.innerHTML = `
      <div class="hist-item-open" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${imgHtml}
      </div>
      <div class="hist-grid-badge" style="color:${scoreColor}">${item.score}</div>
      ${isFeatured ? `<div class="hist-grid-featured-badge">${item.liked ? `${ICONS.heart} Coup de c\u0153ur` : `\u2605 ${item.score}`}</div>` : ''}
      <div class="hist-actions">
        <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier" aria-label="Modifier ma note pour ${escAttr(item.title)}">${ICONS.edit}</button>
        <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${escAttr(item.title)} de l'historique">${ICONS.trash}</button>
      </div>`;
    gridEl.appendChild(div);
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
document.getElementById('filter-row').addEventListener('click', e => {
  // Le bouton "Coups de cœur" est un TOGGLE indépendant du tri (pas de
  // data-sort) — traité à part, sinon la logique générique ci-dessous lui
  // assignerait sortOrder = undefined et retirerait "active" du vrai bouton
  // de tri actuellement sélectionné.
  const likedBtn = e.target.closest('#hist-liked-filter-btn');
  if (likedBtn) {
    activeLikedFilter = !activeLikedFilter;
    likedBtn.classList.toggle('active', activeLikedFilter);
    renderActiveHistoryView();
    return;
  }
  const btn = e.target.closest('.filter-btn[data-sort]');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn[data-sort]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderActiveHistoryView();
});

// ── Rendu des trois cartes Profil ajoutées (Il y a un an / Heatmap / Décennies) ──
