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
    const heroYearSubEl = document.getElementById('profile-hero-year-sub');
    if (heroYearSubEl) heroYearSubEl.textContent = '';
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block';
    renderMonthlyActivityChart([], typeof loadTvShows === 'function' ? loadTvShows() : []);
    resetProfileExtras();
    return;
  }

  const currentYear = new Date().getFullYear().toString();
  const yearCount = history.filter(h => h.date && h.date.startsWith(currentYear)).length;
  // Ludex 2.0 : plus de carte KPI séparée "En 2026" — ce compte vit
  // maintenant en sous-texte du bento "Films notés" (voir la maquette
  // envoyée). #kpi-year a disparu du HTML ; textContent direct plutôt que
  // animateCountUp() ici, puisqu'on affiche un texte formaté ("+24 en
  // 2026"), pas un nombre brut animé seul.
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = `+${yearCount} en ${currentYear}`;

  const avg = history.reduce((sum, h) => sum + parseFloat(h.score), 0) / history.length;
  animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });

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

  // Ludex 2.0 : "Top Réalisateurs" et "Distribution des notes" retirés du
  // Dashboard (voir Ludex_Specifications_Profil), remplacés par
  // renderMonthlyActivityChart() ci-dessous — plus assez de place utile
  // pour justifier les deux en même temps, et l'activité mensuelle raconte
  // quelque chose de plus vivant que le classement des réalisateurs.
  renderMonthlyActivityChart(history, typeof loadTvShows === 'function' ? loadTvShows() : []);
  renderProfileExtras(history);
  renderProfileDiscoveryCards();
}

// Ludex 2.0 : "Activité mensuelle" — remplace Top Réalisateurs + Distribution
// des notes (Dashboard) par un histogramme en barres sur les 6 derniers mois,
// films ET séries côte à côte (deux couleurs). Contrairement à la heatmap
// (#heatmap-card, quotidienne, façon calendrier), celui-ci répond à "combien
// par mois", plus direct à lire d'un coup d'œil sur une tendance courte.
function renderMonthlyActivityChart(history, tvShows) {
  const container = document.getElementById('monthly-activity-chart');
  if (!container) return;

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTH_LABELS_FR[d.getMonth()].slice(0, 3) });
  }

  const movieCounts = months.map(m => history.filter(h => (h.date || h.savedAt || '').startsWith(m.key)).length);
  // Une série compte pour chaque MOIS où au moins une de ses saisons a été
  // notée ce mois-là — pas juste son mois le plus récent, pour ne pas sous-
  // compter une série notée sur plusieurs mois différents.
  const tvCounts = months.map(m =>
    tvShows.filter(sh => Object.values(sh.seasons || {}).some(se => (se.rating?.date || '').startsWith(m.key))).length
  );
  const maxVal = Math.max(1, ...movieCounts, ...tvCounts);

  // Rien sur les 6 derniers mois : un message plutôt que douze barres à zéro.
  // C'est exactement le défaut pour lequel "Distribution des notes" avait été
  // corrigé ("afficher un message au lieu de 10 lignes à zéro") — bloc que
  // celui-ci remplace en Ludex 2.0, sans reprendre ce correctif au passage.
  // Les trois autres encarts du tableau de bord ont chacun le leur (radar,
  // trophées, duels) : même tournure, même style compact.
  if (movieCounts.every(c => c === 0) && tvCounts.every(c => c === 0)) {
    container.innerHTML = '<div class="month-chart-empty">Note quelques films pour voir ton activité des 6 derniers mois.</div>';
    return;
  }

  // Ludex 2.0 : chiffre exact au-dessus de chaque barre (voir
  // Ludex_Specifications_Profil — "on gagnerait à afficher le nombre") —
  // un chiffre à 0 se masque plutôt que d'afficher "0" collé au bas du
  // graphique, redondant avec l'absence de barre visible à cet endroit.
  const barHtml = (count, cls, unit) => `
    <div class="month-chart-bar-wrap">
      <div class="month-chart-count${count === 0 ? ' zero' : ''}">${count}</div>
      <div class="month-chart-bar ${cls}" style="height:${(count / maxVal) * 100}%" title="${count} ${unit}${count > 1 ? 's' : ''}"></div>
    </div>`;

  container.innerHTML = `
    <div class="month-chart">
      ${months.map((m, i) => `
        <div class="month-chart-col">
          <div class="month-chart-bars">
            ${barHtml(movieCounts[i], 'movie', 'film')}
            ${barHtml(tvCounts[i], 'tv', 'série')}
          </div>
          <div class="month-chart-label">${escAttr(m.label)}</div>
        </div>
      `).join('')}
    </div>
    <div class="month-chart-legend">
      <span><span class="month-chart-dot movie"></span>Films / mois</span>
      <span><span class="month-chart-dot tv"></span>Séries / mois</span>
    </div>`;
}

// ─── Onglet Profil : temps visionné, acteur favori, membre depuis, série, badges ──
function resetProfileExtras() {
  document.getElementById('profile-member-since').textContent = '—';
  document.getElementById('profile-watch-time').textContent = '—';
  const heroSubEl = document.getElementById('profile-hero-sub');
  if (heroSubEl) heroSubEl.textContent = 'Cinéphile · Membre depuis —';
  const heroWatchTimeEl = document.getElementById('profile-hero-watch-time');
  if (heroWatchTimeEl) heroWatchTimeEl.textContent = '—';
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = '';
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
  const heroSubEl = document.getElementById('profile-hero-sub');
  if (heroSubEl) heroSubEl.textContent = `Cinéphile · Membre depuis ${memberSinceStr}`;

  // Temps total visionné : somme des durées (le champ runtime est stocké en
  // texte libre, ex: "142 min" — parseInt s'arrête au premier caractère non
  // numérique, donc ça fonctionne aussi bien avec juste "142").
  const totalMinutes = history.reduce((sum, h) => {
    const mins = parseInt(h.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  document.getElementById('profile-watch-time').textContent = formatWatchTime(totalMinutes);
  const heroWatchTimeEl = document.getElementById('profile-hero-watch-time');
  if (heroWatchTimeEl) heroWatchTimeEl.textContent = formatWatchTime(totalMinutes);

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

  // Ludex 2.0 : streak JOURNALIER séparé pour le succès Fidélité (voir
  // Ludex_Gamification_Succes.pdf — "jours consécutifs", pas semaines).
  const dayStreak = computeDayStreak(history);
  const tvRatings = typeof getAllTvSeasonRatings === 'function' ? getAllTvSeasonRatings() : [];
  const badges = computeBadges(history, { totalMinutes, dayStreak, tvRatings });
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
  const countEl = document.getElementById('badges-count');
  if (countEl) {
    const unlocked = badges.filter(b => b.tier > 0).length;
    countEl.textContent = `${unlocked}/${badges.length}`;
  }

  // Ludex 2.0 : détection de franchissement de palier — compare le palier
  // actuel de chaque badge à son dernier palier CONNU (stocké), déclenche
  // un toast de célébration si un nouveau palier vient d'être atteint. À la
  // toute première exécution (aucun état connu encore stocké), initialise
  // silencieusement sur les paliers ACTUELS plutôt que sur 0 — sinon un
  // utilisateur avec déjà 200 films notés recevrait d'un coup une pluie de
  // toasts "Palier débloqué" pour des trophées qu'il a en réalité depuis
  // longtemps.
  let knownTiers = {};
  let isFirstRun = true;
  try {
    const stored = localStorage.getItem('lbx_badges_known_tiers');
    if (stored) { knownTiers = JSON.parse(stored); isFirstRun = false; }
  } catch { /* ignore, repart de zéro */ }

  const newlyUnlocked = [];
  badges.forEach(b => {
    const prevTier = knownTiers[b.id] ?? 0;
    if (!isFirstRun && b.tier > prevTier) newlyUnlocked.push(b);
    knownTiers[b.id] = b.tier;
  });
  localStorage.setItem('lbx_badges_known_tiers', JSON.stringify(knownTiers));
  const TIER_NAMES = ['', 'Palier I', 'Palier II', 'Palier III'];
  newlyUnlocked.forEach(b => showToast(`🏆 ${TIER_NAMES[b.tier]} débloqué — ${b.name} !`));

  grid.innerHTML = badges.map(b => `
    <div class="badge-item ${b.tier > 0 ? 'unlocked' : 'locked'}" title="${b.tier > 0 ? `${TIER_NAMES[b.tier]} débloqué` : 'Pas encore débloqué'}">
      <div class="badge-icon badge-tier-${b.tier}">${b.icon}</div>
      <div class="badge-label">${escAttr(b.name)}</div>
      ${!b.maxed ? `
        <div class="badge-progress-track"><div class="badge-progress-fill" style="width:${Math.round(b.progress * 100)}%"></div></div>
        <div class="badge-progress-text">${b.value}/${b.nextThreshold}</div>
      ` : `<div class="badge-progress-text badge-maxed">Complété</div>`}
    </div>
  `).join('');

  // Ludex 2.0 : vitrine des 3 derniers trophées débloqués, toujours visible
  // (voir #trophy-showcase, index.html) — sans dépendre de newlyUnlocked
  // (qui ne contient que ceux débloqués À CETTE exécution précise) : les 3
  // avec le palier le plus élevé, tous badges confondus, peu importe QUAND
  // ils ont été débloqués.
  const showcaseEl = document.getElementById('trophy-showcase');
  if (showcaseEl) {
    const top3 = [...badges].filter(b => b.tier > 0).sort((a, b) => b.tier - a.tier || b.progress - a.progress).slice(0, 3);
    showcaseEl.innerHTML = top3.length > 0
      ? top3.map(b => `
          <div class="trophy-medal">
            <div class="trophy-icon badge-tier-${b.tier}">${b.icon}</div>
            <div class="trophy-name">${escAttr(b.name)}</div>
            <div class="trophy-tier">${TIER_NAMES[b.tier]}</div>
          </div>
        `).join('')
      : `<div class="trophy-empty">Note quelques films pour débloquer tes premiers trophées.</div>`;
  }
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

// Regroupe les cartes de découverte ajoutées ensuite. Nom distinct de
// renderProfileExtras : les deux fonctions portaient le même nom à un
// moment, et la seconde écrasait silencieusement la première par hissage —
// cassant toute la carte "Ton profil" (Membre depuis, Temps visionné...).
// Leçon : un nom = une fonction, vérifié par grep.
// Ludex 2.0 : "Il y a un an" et "Décennies de prédilection" retirés (voir
// Ludex_Specifications_Profil) — renderYearAgoCard()/renderDecades() ont
// été supprimées avec eux, plus aucun appelant.
function renderProfileDiscoveryCards() {
  const history = loadHistory();
  renderHeatmap(history);
}
