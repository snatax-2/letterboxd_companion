// ═══════════════════════════════════════════
//  PROFIL — statistiques et tableau de bord
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre le
// calcul et le rendu des statistiques du Profil (radar, timeline,
// distribution des notes, badges, heatmap, décennies, classiques à
// explorer) ainsi que renderAll()/renderProfileIfDirty(), les points
// d'entrée appelés après chaque changement de données. Le dessin des
// cartes à partager (canvas) vit séparément dans
// 06d-profile-share-cards.js.

function createRadarSVG(averages, mediaType = 'movie') {
  if (averages.every(a => a === 0)) return null;

  // Libellés courts pour l'affichage du radar (doit couvrir toutes les clés de
  // CRITERIA). Déclaré ICI (local à la fonction) et non en haut du fichier :
  // un `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution du script n'a pas atteint cette ligne — or `renderAll()` est
  // appelée une première fois de façon précoce (voir 03-foundation.js), avant
  // que 06-history.js n'ait fini de s'exécuter, ce qui provoquait un plantage
  // total de l'app au chargement pour tout utilisateur ayant déjà un historique.
  const CRITERIA_SHORT_LABELS = mediaType === 'tv'
    ? { scenario: 'Scén.', realisation: 'Réal.', photo: 'Final', acteurs: 'Casting', ambiance: 'Ambiance', rythme: 'Cohér.', affect: 'Affect' }
    : { scenario: 'Scén.', realisation: 'Réal.', photo: 'Photo', acteurs: 'Casting', ambiance: 'Ambiance', rythme: 'Rythme', affect: 'Affect' };

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
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block';
    document.getElementById('timeline-chart-container').innerHTML = '';
    document.getElementById('top-directors-list').innerHTML = renderEmptyState({ message: 'Enregistrez plus de films avec un réalisateur pour générer ce top.' });
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
    document.getElementById('radar-chart-container').style.minHeight = '160px';
    document.getElementById('radar-empty').style.display = 'none'; 
  } else { 
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block'; 
  }

  document.getElementById('timeline-chart-container').innerHTML = createTimelineSVG(history.concat(typeof getAllTvSeasonRatings === 'function' ? getAllTvSeasonRatings() : []));

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
    dirCont.innerHTML = topD.map(d => `<div class="top-item" onclick="document.getElementById('history-search').value='${escAttr(d.name)}';document.getElementById('history-search').dispatchEvent(new Event('input'))"><span class="top-item-name">${escAttr(d.name)}</span><div class="top-item-meta"><span>${d.count} films</span><span class="top-item-score">★ ${d.avg.toFixed(1)}</span></div></div>`).join('');
  } else { 
    dirCont.innerHTML = renderEmptyState({ message: 'Enregistrez plus de films avec un réalisateur pour générer ce top.' }); 
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
  // Rien à télécharger tant que la carte est verrouillée — désactivé plutôt
  // que de laisser un bouton actif sans effet utile derrière lui.
  const shareBtn = document.getElementById('profile-share-btn');
  if (shareBtn) { shareBtn.disabled = true; shareBtn.title = 'Note quelques films pour débloquer ta carte'; }
  // Une rétrospective "0 film noté" n'aurait aucun sens — la carte d'entrée
  // ne s'affiche que s'il y a au moins un film à raconter.
  const wrappedCard = document.getElementById('wrapped-entry-card');
  if (wrappedCard) wrappedCard.style.display = 'none';
}

function renderProfileExtras(history) {
  // Défensif : un appel sans argument (bug d'un appelant) ne doit plus faire
  // planter tout le reste du rendu du profil — juste rester sur les valeurs
  // par défaut, comme un historique vide.
  history = history || [];
  // Une rétrospective "0 film noté" n'aurait aucun sens : la carte ne
  // s'affiche que s'il y a au moins un film — mais elle doit pouvoir
  // réapparaître si l'historique passe de vide à rempli dans la même session.
  const wrappedCard = document.getElementById('wrapped-entry-card');
  if (wrappedCard) wrappedCard.style.display = history.length > 0 ? '' : 'none';
  const shareBtn = document.getElementById('profile-share-btn');
  if (shareBtn) {
    shareBtn.disabled = history.length === 0;
    shareBtn.title = history.length === 0 ? 'Note quelques films pour débloquer ta carte' : '';
  }
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
function buildHistogram(dist) {
  const container = document.getElementById('histogram');
  container.innerHTML = '';
  const maxVal = Math.max(...Object.values(dist), 0);
  if (maxVal === 0) {
    container.innerHTML = renderEmptyState({ message: 'Note quelques films pour voir apparaître leur répartition ici.' });
    return;
  }
  const order = [50, 45, 40, 35, 30, 25, 20, 15, 10, '05'];
  const labels = {
    50: '★★★★★', 45: '★★★★½', 40: '★★★★', 35: '★★★½', 30: '★★★',
    25: '★★½',   20: '★★',    15: '★½',    10: '★',    '05': '½'
  };
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

let statsDirty = true; // vrai au démarrage : le premier vrai rendu doit avoir lieu

// Dispatche vers le bon rendu de stats selon la bascule Films/Séries —
// même principe que renderActiveHistoryView, pour que renderTvStats()
// bénéficie aussi de l'optimisation "ne recalculer que si Profil est
// visible" plutôt que de la contourner silencieusement.
function renderActiveStatsView() {
  if (statsMediaFilter === 'tv') { if (typeof renderTvStats === 'function') renderTvStats(); }
  else renderStats();
}

function renderAll() {
  // renderStats() reconstruit pas mal de choses (SVG radar/timeline, heatmap
  // ~365 cellules, badges, décennies, classement des duels) — un vrai coût,
  // payé jusqu'ici à CHAQUE sauvegarde/suppression/import, même quand l'onglet
  // Profil n'est pas à l'écran (souvent le cas : on reste sur Noter ou
  // Historique). On ne le calcule que si Profil est réellement visible ;
  // sinon on le marque "à jour ultérieurement" — rattrapé par
  // renderProfileIfDirty() au moment où l'utilisateur bascule dessus (voir
  // 01-navigation.js). renderHistory() reste inconditionnel : c'est
  // généralement la vue qu'on regarde au moment de l'appel.
  const profileView = document.getElementById('view-profile');
  if (profileView && profileView.classList.contains('active')) {
    renderActiveStatsView();
    statsDirty = false;
  } else {
    statsDirty = true;
  }
  renderActiveHistoryView();
}

// Appelée quand l'onglet Profil devient visible : rattrape un renderStats()
// qui avait été sauté pendant que l'onglet était masqué.
function renderProfileIfDirty() {
  if (statsDirty) { renderActiveStatsView(); statsDirty = false; }
}

// ═══════════════════════════════════════════
//  SORT FILTERS
// ═══════════════════════════════════════════
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
