// ═══════════════════════════════════════════
//  HISTORIQUE — liste, recherche, tri, filtre par genre
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js (1698 lignes, 6
// responsabilités mêlées) — ce fichier ne couvre que le rendu de la
// LISTE elle-même : recherche, tri, filtre par genre, l'indice de
// glissement au premier chargement. Les actions (feuille d'action,
// toast) vivent dans 06b-history-actions.js ; les statistiques du
// Profil et les cartes à partager dans 06c/06d.

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
  const tvFragment = ` · ${showCount} série${showCount > 1 ? 's' : ''}`;
  if (activeGenre || historySearchQuery || activeScoreFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}${tvFragment}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '') + tvFragment;
    badge.style.color = '';
  }

  renderGenreChips(history);
  document.getElementById('filter-row').style.display = history.length === 0 ? 'none' : '';

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

    // Chaque segment est une LIGNE bornée (ellipse au-delà) : les cartes ont
    // ainsi un rythme vertical uniforme, quel que soit le nombre de genres ou
    // d'acteurs — c'était la cause des hauteurs disparates dans la liste.
    let metaHTML = '';
    const metaLine1 = [item.year, item.runtime, escAttr(item.genre || '')].filter(Boolean).join(' · ');
    if (metaLine1) metaHTML += `<span class="hist-meta-line">${metaLine1}</span>`;
    if (item.director) metaHTML += `<span class="hist-meta-line" style="color:var(--text-mid)">Réalisé par <b>${escAttr(item.director)}</b></span>`;
    if (item.actors) metaHTML += `<span class="hist-meta-line" style="color:var(--text-mid)">Avec <b>${escAttr(item.actors)}</b></span>`;

    // Tags de contexte INTÉGRÉS à la ligne de score (plus de rangée dédiée) :
    // c'était la dernière source de hauteurs inégales entre cartes — un film
    // avec un tag "À la maison" prenait une rangée de plus que ses voisins.
    const tagsInline = (item.contextTags || []).map(t => `<span class="h-tag">${renderTagLabel(t)}</span>`).join('');

    let reviewHTML = '';
    if (item.review) {
      reviewHTML = `
        <div class="hist-review" onclick="this.classList.toggle('expanded')">
          <div class="hist-review-content">"${escAttr(item.review)}"</div>
          <span class="hist-review-toggle"></span>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="hist-swipe-hint hist-swipe-hint-left" aria-hidden="true">${ICONS.trash} Supprimer</div>
      <div class="hist-swipe-hint hist-swipe-hint-right" aria-hidden="true">${ICONS.edit} Modifier</div>
      <div class="hist-item-content">
        <div class="hist-item-open" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
          ${imgHtml}
          <div class="hist-body">
            <div class="hist-title">${escAttr(item.title)}${item.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
            <div class="hist-meta">${metaHTML}</div>
            <div class="hist-score-row"><span style="color:${scoreColor};font-weight:700;">${item.score}/10</span>${tmdbHtml}${tagsInline}</div>
            <div class="hist-stars">${item.stars || ''}<span class="hist-score"></span></div>
            ${reviewHTML}
          </div>
        </div>
        <div class="hist-actions">
          <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier" aria-label="Modifier ma note pour ${escAttr(item.title)}">${ICONS.edit}</button>
          <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${escAttr(item.title)} de l'historique">${ICONS.trash}</button>
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
document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderActiveHistoryView();
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
    content.style.transition = 'transform var(--dur-slow) var(--ease-out)';
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
