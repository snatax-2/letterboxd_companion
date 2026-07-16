// ═══════════════════════════════════════════
//  FICHE FILM DÉTAILLÉE
// ═══════════════════════════════════════════
// Ouverte au tap sur un film (historique, watchlist, découvrir). Récupère la
// fiche complète TMDb (synopsis, budget, box-office, équipe...) à la demande,
// via le même endpoint /api/search?id=X déjà utilisé ailleurs (mis en cache
// côté CDN, voir api/search.js). Si le film n'a pas de tmdbId (ajouté en
// saisie manuelle), affiche un message clair plutôt que d'échouer.

const mdsEl = document.getElementById('movie-detail-sheet');
const mdsContentEl = document.getElementById('mds-content');
const mdsCloseBtn = document.getElementById('mds-close-btn');

// Bande-annonce : chargée seulement au clic (vignette + bouton lecture avant
// ça), pas embarquée automatiquement dès l'ouverture de la fiche. Attaché ici,
// au niveau racine (pas dans renderCastCarousel), pour qu'il fonctionne même
// pour un film sans casting. Le gestionnaire clavier générique
// (01-navigation.js) couvre déjà Entrée/Espace pour ce role="button".
mdsContentEl.addEventListener('click', (e) => {
  const trailerWrap = e.target.closest('.mds-trailer-wrap');
  if (!trailerWrap || trailerWrap.querySelector('iframe')) return;
  const key = trailerWrap.dataset.videoKey;
  trailerWrap.innerHTML = `<iframe class="mds-trailer" src="https://www.youtube.com/embed/${key}?autoplay=1" title="Bande-annonce" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
});

function formatMoney(amount) {
  if (!amount || amount <= 0) return 'Non communiqué';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function buildMdsSkeleton() {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;"></div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
    <div class="skeleton-text short skeleton-bg"></div>
  `;
}

// Chaque section reçoit un léger délai croissant (voir CSS .mds-section) pour
// apparaître en cascade plutôt que d'un bloc — plus agréable à l'œil qu'un
// simple remplacement de contenu.
function buildMdsContent(data, localMatch, localMatchIdx) {
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
  const year = data.release_date ? data.release_date.slice(0, 4) : '';
  const runtime = data.runtime ? `${data.runtime} min` : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  const directorObj = data.credits?.crew?.find(c => c.job === 'Director') || null;
  const castList = (data.credits?.cast || []).slice(0, 5);
  const releaseDateStr = data.release_date
    ? new Date(data.release_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';

  // Petit lien cliquable sur un nom de réalisateur/acteur : ouvre sa fiche
  // personne (bio + filmographie + % déjà vu). data-person-id/data-person-name
  // portés directement sur l'élément, lus par le clic délégué plus bas.
  function personLink(p) {
    return `<span class="mds-person-link" data-person-id="${p.id}" data-person-name="${escAttr(p.name)}">${escAttr(p.name)}</span>`;
  }
  const directorHtml = directorObj ? personLink(directorObj) : '';
  const castHtml = castList.map(personLink).join(', ');

  let personalHtml = '';
  if (localMatch) {
    const critBreakdown = buildCriteriaBreakdown(localMatch);
    personalHtml = `
      <div class="mds-section mds-personal" style="animation-delay:.05s">
        <div class="mds-section-title">Ta note</div>
        <div class="mds-personal-score">${localMatch.score}/10 <span class="mds-personal-stars">${localMatch.stars || ''}</span>${localMatch.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
        ${localMatch.review ? `<div class="mds-personal-review">« ${escAttr(localMatch.review)} »</div>` : ''}
      </div>
      ${critBreakdown}
    `;
  }

  return `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-left">
        <div class="mds-poster-wrap">
          ${posterUrl
            ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.title)}" loading="lazy">`
            : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
          ${data.vote_average ? `<div class="mds-score-stamp"><span class="mds-score-stamp-val">${data.vote_average.toFixed(1)}</span><span class="mds-score-stamp-label">TMDb</span></div>` : ''}
        </div>
        ${isInCollection(data.id) ? `<button type="button" class="mds-poster-change-btn" data-poster-picker="${escAttr(String(data.id))}">Changer l'affiche</button>` : ''}
      </div>
      <div class="mds-header-info">
        <div class="mds-title" id="mds-title">${data.title}</div>
        <div class="mds-meta">${[year, runtime, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        ${directorObj ? `<div class="mds-header-director"><span class="mds-director-label">Réalisé par</span> <b>${escAttr(directorObj.name)}</b></div>` : ''}
      </div>
    </div>

    <div class="mds-actions" style="animation-delay:.02s">
      ${localMatch
        ? `<button type="button" class="mds-action-btn" id="mds-edit-btn" data-idx="${localMatchIdx}" title="Modifier ma note">${ICONS.edit} Modifier ma note</button>`
        : `<button type="button" class="mds-action-btn primary" id="mds-rate-btn" title="Noter ce film">${ICONS.star} Noter</button>
           <button type="button" class="mds-action-btn" id="mds-watchlist-btn" title="Ajouter à la watchlist">${ICONS.target} Watchlist</button>`
      }
    </div>

    ${personalHtml}

    ${(() => {
      const trailer = pickBestTrailer(data.videos?.results || []);
      if (!trailer) return '';
      return `
      <div class="mds-section" style="animation-delay:.08s">
        <div class="mds-section-title">Bande-annonce</div>
        <div class="mds-trailer-wrap" data-video-key="${trailer.key}" role="button" tabindex="0" aria-label="Lire la bande-annonce de ${escAttr(data.title)}">
          <img class="mds-trailer-thumb" src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="" loading="lazy">
          <div class="mds-trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>`;
    })()}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview" id="mds-overview">${escAttr(data.overview)}</div>
        <button type="button" class="mds-overview-toggle" id="mds-overview-toggle">Lire la suite ▾</button>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Équipe</div>
      ${directorHtml ? `<div class="mds-row"><span class="mds-label">Réalisateur</span><span>${directorHtml}</span></div>` : ''}
      ${castHtml ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${castHtml}</span></div>` : ''}
      ${!directorHtml && !castHtml ? `<div class="mds-row"><span class="mds-label">—</span><span>Non communiqué</span></div>` : ''}
    </div>

    <div class="mds-section" style="animation-delay:.2s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Sortie</span><span>${releaseDateStr}</span></div>
      <div class="mds-row"><span class="mds-label">Budget</span><span>${formatMoney(data.budget)}</span></div>
      <div class="mds-row"><span class="mds-label">Box-office</span><span>${formatMoney(data.revenue)}</span></div>
    </div>

    ${(data.credits?.cast || []).length > 0 ? `
      <div class="mds-section" style="animation-delay:.25s">
        <div class="mds-section-title">Casting</div>
        <div class="mds-cast-carousel" id="mds-cast-carousel"></div>
      </div>` : ''}
  `;
}

// Ventilation par critère (barres, pas un radar — déjà utilisé sur le
// dashboard, on veut ici quelque chose de plus direct à lire pour un seul
// film) : uniquement si le film a été noté en mode détaillé.
const MDS_CRITERIA_LABELS = {
  scenario: 'Scénario', realisation: 'Réalisation', photo: 'Photo',
  acteurs: 'Acteurs', ambiance: 'Ambiance', rythme: 'Rythme', affect: 'Affect',
};
function buildCriteriaBreakdown(localMatch) {
  if (localMatch.mode !== 'detail' || !localMatch.values) return '';

  const rows = CRITERIA.map((key, i) => {
    const val = parseFloat(localMatch.values[key]);
    if (isNaN(val)) return '';
    const pct = (val / 10) * 100;
    return `
      <div class="mds-crit-row" style="animation-delay:${0.05 * i}s">
        <span class="mds-crit-label">${MDS_CRITERIA_LABELS[key] || key}</span>
        <div class="mds-crit-track"><div class="mds-crit-fill" style="--mds-crit-pct:${pct}%"></div></div>
        <span class="mds-crit-value">${val.toFixed(1)}</span>
      </div>`;
  }).join('');

  return `
    <div class="mds-section mds-crit-breakdown" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par critère</div>
      ${rows}
    </div>
  `;
}

// Carrousel du casting complet, en bas de la fiche film — même mécanique que
// le carrousel "Tendances" de Découvrir (défilement auto piloté en JS, pas
// une animation CSS qui bloquerait le glissement manuel natif), à vitesse
// volontairement plus lente ici (plus de monde à voir défiler, moins de
// pression pour choisir/lire rapidement).
function renderCastCarousel(castArray) {
  const outer = document.getElementById('mds-cast-carousel');
  if (!outer) return;
  const cast = castArray.filter(c => c.id).slice(0, 20);
  if (cast.length === 0) return;

  const itemsHtml = cast.map(actor => {
    const photoUrl = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '';
    return `
      <div class="mds-cast-item" data-person-id="${actor.id}" data-person-name="${escAttr(actor.name)}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(actor.name)}">
        ${photoUrl
          ? `<img class="mds-cast-photo" src="${photoUrl}" alt="Photo de ${escAttr(actor.name)}" loading="lazy">`
          : `<div class="mds-cast-photo mds-cast-photo-ph">${ICONS.clapper}</div>`}
        <div class="mds-cast-name">${escAttr(actor.name)}</div>
        ${actor.character ? `<div class="mds-cast-character">${escAttr(actor.character)}</div>` : ''}
      </div>`;
  }).join('');

  // Duplique la liste une fois : le défilement peut boucler sans à-coup dès
  // qu'il a parcouru l'équivalent d'une copie complète.
  outer.innerHTML = `<div class="mds-cast-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.mds-cast-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.mds-cast-item');
    if (item) openPersonDetailSheet(item.dataset.personId, item.dataset.personName);
  });

  const AUTO_SCROLL_SPEED = 0.3; // plus lent que le carrousel tendances (0.5) : plus de monde à voir défiler
  const RESUME_DELAY_MS = 3000;
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    if (!autoScrollPaused && mdsEl.classList.contains('open')) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    // Arrête la boucle si la fiche a été fermée (évite de faire tourner un
    // requestAnimationFrame indéfiniment pour un carrousel qu'on ne voit plus).
    if (mdsEl.classList.contains('open')) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });
}

// Cache le bouton "Lire la suite" si le synopsis tient déjà entièrement dans
// les lignes visibles par défaut — pas la peine de proposer un accordéon pour
// un texte qui ne déborde pas. Comparaison scrollHeight/clientHeight après un
// requestAnimationFrame, le temps que le layout (avec le clamp CSS) se stabilise.
function setupOverviewToggle() {
  const overview = document.getElementById('mds-overview');
  const toggle = document.getElementById('mds-overview-toggle');
  if (!overview || !toggle) return;
  requestAnimationFrame(() => {
    if (overview.scrollHeight <= overview.clientHeight + 2) {
      toggle.style.display = 'none';
    }
  });
}

// En-tête collant qui rétrécit : au-delà d'un seuil de défilement DANS la
// fiche (.mds-box, le conteneur qui défile réellement), l'affiche+titre
// passent en mode compact — l'inverse en repassant sous ce seuil. Un seul
// écouteur de scroll par ouverture de fiche (retiré à la fermeture) pour ne
// pas empiler des écouteurs orphelins à chaque nouvelle fiche ouverte.
const STICKY_HEADER_THRESHOLD = 80;
let stickyHeaderScrollHandler = null;
function setupStickyHeader() {
  const box = mdsEl.querySelector('.mds-box');
  const header = document.querySelector('.mds-header');
  if (!box || !header) return;
  if (stickyHeaderScrollHandler) box.removeEventListener('scroll', stickyHeaderScrollHandler);
  stickyHeaderScrollHandler = () => {
    header.classList.toggle('compact', box.scrollTop > STICKY_HEADER_THRESHOLD);
  };
  box.addEventListener('scroll', stickyHeaderScrollHandler, { passive: true });
}

// Choisit la meilleure bande-annonce parmi les vidéos TMDb : uniquement
// YouTube (seule plateforme embarquable simplement sans clé ni accord
// spécifique), en priorisant une vraie "Trailer" officielle, puis en
// préférant la version française si elle existe — sans quoi n'importe quelle
// bande-annonce YouTube fait l'affaire plutôt que rien.
function pickBestTrailer(videos) {
  const yt = videos.filter(v => v.site === 'YouTube');
  if (yt.length === 0) return null;
  const trailers = yt.filter(v => v.type === 'Trailer');
  const pool = trailers.length > 0 ? trailers : yt;
  return pool.find(v => v.official && v.iso_639_1 === 'fr')
      || pool.find(v => v.iso_639_1 === 'fr')
      || pool.find(v => v.official)
      || pool[0];
}

let mdsCurrentData = null; // données complètes du film actuellement affiché, pour les boutons d'action

async function openMovieDetailSheet(tmdbId) {
  if (!tmdbId) {
    showToast("Ce film n'a pas de fiche TMDb liée (ajouté en saisie manuelle).");
    return;
  }

  lastFocusedBeforeModal = document.activeElement;
  mdsContentEl.innerHTML = buildMdsSkeleton();
  mdsEl.classList.add('open');
  mdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture (pas juste piégé une fois qu'on y est déjà)
  const mdsBoxEl = mdsEl.querySelector('.mds-box');
  if (mdsBoxEl) mdsBoxEl.scrollTop = 0; // évite de démarrer en mode compact si une fiche precedente avait été scrollée

  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.title) throw new Error('no data');

    const history = loadHistory();
    const localMatch = history.find(h => String(h.tmdbId) === String(tmdbId));
    const localMatchIdx = history.findIndex(h => String(h.tmdbId) === String(tmdbId));

    mdsContentEl.innerHTML = buildMdsContent(data, localMatch, localMatchIdx);
    mdsCurrentData = data;
    renderCastCarousel(data.credits?.cast || []);
    setupOverviewToggle();
    setupStickyHeader();
    const mdsPosterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
    applyPosterAccent(mdsPosterUrl, mdsEl.querySelector('.mds-box'));
  } catch (e) {
    mdsCurrentData = null;
    // État d'erreur avec reprise : l'id du film voyage dans le bouton, le
    // gestionnaire délégué RACINE (plus bas) relance le chargement complet.
    mdsContentEl.innerHTML = `
      <div class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <div class="error-state-msg">Impossible de charger les détails du film. Vérifie ta connexion.</div>
        <button type="button" class="error-retry-btn" data-retry-tmdb-id="${escAttr(String(tmdbId))}">Réessayer</button>
      </div>`;
  }
}

function closeMovieDetailSheet() {
  closeModal(mdsEl);
}

mdsCloseBtn.addEventListener('click', closeMovieDetailSheet);
mdsEl.addEventListener('click', (e) => {
  if (e.target === mdsEl) { closeMovieDetailSheet(); return; }

  const personLink = e.target.closest('.mds-person-link');
  if (personLink) {
    openPersonDetailSheet(personLink.dataset.personId, personLink.dataset.personName);
    return;
  }

  const overviewToggle = e.target.closest('#mds-overview-toggle');
  if (overviewToggle) {
    const overview = document.getElementById('mds-overview');
    const expanded = overview.classList.toggle('expanded');
    overviewToggle.textContent = expanded ? 'Réduire ▴' : 'Lire la suite ▾';
    return;
  }

  if (e.target.closest('#mds-rate-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '????';
    closeMovieDetailSheet();
    selectMovie(mdsCurrentData, year);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (e.target.closest('#mds-watchlist-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '';
    addToWatchlistFromTMDb(mdsCurrentData, year);
    closeMovieDetailSheet();
    return;
  }

  const editBtn = e.target.closest('#mds-edit-btn');
  if (editBtn) {
    const idx = parseInt(editBtn.dataset.idx, 10);
    closeMovieDetailSheet();
    loadItem(idx);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// ═══════════════════════════════════════════
//  FICHE PERSONNE (réalisateur/acteur)
// ═══════════════════════════════════════════
// Bio + filmographie complète + pourcentage déjà vu (films de sa filmographie
// présents dans l'historique de l'utilisateur). Ouverte en tapant un nom de
// réalisateur/acteur dans la fiche film.
const pdsEl = document.getElementById('person-detail-sheet');
const pdsContentEl = document.getElementById('pds-content');
const pdsCloseBtn = document.getElementById('pds-close-btn');

function buildPdsSkeleton(personName) {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;">${escAttr(personName || '')}</div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
  `;
}

// Combine cast + équipe technique en une filmographie dédoublonnée (une
// personne peut apparaître à la fois comme actrice ET réalisatrice sur le
// même film, ex: dans les deux listes renvoyées par TMDb). Marque aussi
// chaque film comme "vu" ou non (par tmdbId dans l'historique) — utilisé à la
// fois pour le pourcentage et pour griser les affiches déjà vues.
function buildPersonFilmography(data) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));

  // Limite la filmographie au rôle PRINCIPAL de la personne plutôt que de tout
  // mélanger (un réalisateur crédité comme producteur ou scénariste sur un
  // film n'a, à nos yeux ici, pas "réalisé" ce film-là — c'est ce qui gonflait
  // la filmographie de films produits/écrits en plus de ceux réalisés).
  const dept = data.known_for_department;
  let source;
  if (dept === 'Directing') {
    source = (data.movie_credits?.crew || []).filter(m => m.job === 'Director');
  } else if (dept === 'Writing') {
    source = (data.movie_credits?.crew || []).filter(m => m.department === 'Writing');
  } else if (dept === 'Acting') {
    source = data.movie_credits?.cast || [];
  } else {
    // Département moins courant (Production, Camera...) : pas de règle
    // spécifique établie, on garde le mélange complet plutôt que de risquer
    // de cacher des films pertinents pour ces cas plus rares.
    source = [...(data.movie_credits?.cast || []), ...(data.movie_credits?.crew || [])];
  }

  const seen = new Set();
  const films = [];
  source.forEach(m => {
    if (!m.id || seen.has(m.id)) return;
    seen.add(m.id);
    films.push({ id: m.id, title: m.title, release_date: m.release_date, poster_path: m.poster_path, isSeen: seenIds.has(String(m.id)) });
  });
  films.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
  return films;
}

// Pourcentage de la filmographie déjà présent dans l'historique de
// l'utilisateur — le petit "plus" ludique de cette fiche.
function computeSeenPercentage(films) {
  const seenCount = films.filter(f => f.isSeen).length;
  const pct = films.length > 0 ? Math.round((seenCount / films.length) * 100) : 0;
  return { seenCount, total: films.length, pct };
}

function buildPdsContent(data) {
  const films = buildPersonFilmography(data);
  const { seenCount, total, pct } = computeSeenPercentage(films);
  const photoUrl = data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : '';
  const bio = data.biography
    ? (data.biography.length > 400 ? data.biography.slice(0, 400) + '…' : data.biography)
    : '';

  return `
    <div class="mds-header" style="animation-delay:0s">
      ${photoUrl
        ? `<img class="mds-poster" src="${photoUrl}" alt="Photo de ${escAttr(data.name)}" loading="lazy">`
        : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
      <div class="mds-header-info">
        <div class="mds-title" id="pds-title">${escAttr(data.name)}</div>
        <div class="mds-meta">${escAttr(data.known_for_department || '')}</div>
      </div>
    </div>

    <div class="mds-section pds-completion" style="animation-delay:.05s">
      <div class="mds-section-title">Films vus dans sa filmographie</div>
      <div class="pds-completion-bar"><div class="pds-completion-fill" style="width:${pct}%"></div></div>
      <div class="pds-completion-label">${seenCount} / ${total} film${total > 1 ? 's' : ''} vus (${pct}%)</div>
    </div>

    ${bio ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Biographie</div>
        <div class="mds-overview">${escAttr(bio)}</div>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Filmographie (${total})</div>
      <div class="pds-filmography">
        ${films.map(f => {
          const posterUrl = f.poster_path ? `https://image.tmdb.org/t/p/w185${f.poster_path}` : '';
          const year = f.release_date ? f.release_date.slice(0, 4) : '';
          return `
            <div class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
              ${posterUrl
                ? `<img class="pds-film-poster" src="${posterUrl}" alt="Affiche de ${escAttr(f.title)}" loading="lazy">`
                : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
              <div class="pds-film-title">${escAttr(f.title)}</div>
              <div class="pds-film-year">${year}</div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

async function openPersonDetailSheet(personId, personName) {
  if (!personId) return;
  lastFocusedBeforeModal = document.activeElement;
  pdsContentEl.innerHTML = buildPdsSkeleton(personName);
  pdsEl.classList.add('open');
  pdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture

  try {
    const res = await fetch(`/api/search?personId=${personId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.name) throw new Error('no data');
    pdsContentEl.innerHTML = buildPdsContent(data);
  } catch (e) {
    pdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger cette fiche pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closePersonDetailSheet() {
  closeModal(pdsEl);
}

pdsCloseBtn.addEventListener('click', closePersonDetailSheet);
pdsEl.addEventListener('click', (e) => {
  if (e.target === pdsEl) { closePersonDetailSheet(); return; }
  const filmItem = e.target.closest('.pds-film-item');
  if (filmItem) {
    closePersonDetailSheet();
    openMovieDetailSheet(filmItem.dataset.movieId);
  }
});

// ═══════════════════════════════════════════
//  GLISSER VERS LE BAS POUR FERMER
// ═══════════════════════════════════════════
// En plus de la croix (gardée pour clavier/souris/lecteurs d'écran) : sur
// mobile, glisser la fiche vers le bas la ferme, geste naturel et attendu
// pour ce genre de panneau. Ne s'active que si la fiche est déjà tout en haut
// de son propre défilement (sinon un glissement vers le bas doit d'abord
// juste faire remonter le contenu) et pas depuis une zone qui gère déjà son
// propre geste horizontal (carrousel de casting).
function initSwipeToClose(overlayEl, closeFn) {
  const box = overlayEl.querySelector('.mds-box');
  if (!box) return;
  const THRESHOLD = 110;
  let startY = 0;
  let dragging = false;
  let currentDelta = 0;

  box.addEventListener('touchstart', (e) => {
    if (box.scrollTop > 5) return;
    if (e.target.closest('.mds-cast-carousel, .mds-trailer-wrap')) return;
    startY = e.touches[0].clientY;
    dragging = true;
    box.style.transition = 'none';
  }, { passive: true });

  box.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0 || box.scrollTop > 5) { dragging = false; box.style.transition = ''; box.style.transform = ''; return; }
    currentDelta = deltaY;
    box.style.transform = `translateY(${deltaY}px) scale(1)`;
    overlayEl.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 0.8 - deltaY / 250)})`;
  }, { passive: true });

  box.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    box.style.transition = 'transform .22s ease';
    if (currentDelta > THRESHOLD) {
      box.style.transform = `translateY(100%) scale(1)`;
      setTimeout(() => {
        closeFn();
        box.style.transform = '';
        box.style.transition = '';
        overlayEl.style.backgroundColor = '';
      }, 180);
    } else {
      box.style.transform = '';
      overlayEl.style.backgroundColor = '';
    }
    currentDelta = 0;
  });
}

initSwipeToClose(mdsEl, closeMovieDetailSheet);
initSwipeToClose(pdsEl, closePersonDetailSheet);

// Reprise après erreur de chargement : délégué au niveau racine du fichier
// (jamais dans une fonction de rendu conditionnelle — leçon apprise).
mdsContentEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.error-retry-btn[data-retry-tmdb-id]');
  if (!btn) return;
  openMovieDetailSheet(btn.dataset.retryTmdbId);
});

// ═══ CHOIX DE L'AFFICHE ═══
// TMDb propose souvent des dizaines de variantes d'affiche par film (langues,
// éditions, versions sans texte). Ce sélecteur laisse choisir SA version : le
// choix est persisté dans l'historique ET toutes les watchlists où le film
// apparaît — il voyage donc naturellement avec les sauvegardes JSON, sans
// table de correspondance séparée à maintenir.

function isInCollection(tmdbId) {
  const inHistory = loadHistory().some(h => String(h.tmdbId) === String(tmdbId));
  if (inHistory) return true;
  return loadWatchlistsMeta().some(meta =>
    loadWatchlist(meta.id).some(w => String(w.tmdbId) === String(tmdbId))
  );
}

function applyChosenPoster(tmdbId, posterUrl) {
  let touched = 0;
  const history = loadHistory();
  let histChanged = false;
  for (const h of history) {
    if (String(h.tmdbId) === String(tmdbId)) { h.poster = posterUrl; histChanged = true; touched++; }
  }
  if (histChanged) saveHistory(history);

  for (const meta of loadWatchlistsMeta()) {
    const list = loadWatchlist(meta.id);
    let listChanged = false;
    for (const w of list) {
      if (String(w.tmdbId) === String(tmdbId)) { w.poster = posterUrl; listChanged = true; touched++; }
    }
    if (listChanged) saveWatchlist(list, meta.id);
  }
  return touched;
}

async function openPosterPicker(tmdbId) {
  const modal = document.getElementById('poster-picker-modal');
  const grid = document.getElementById('poster-picker-grid');
  if (!modal || !grid) return;
  modal.classList.add('open');
  grid.innerHTML = `<div class="poster-picker-loading">${'<div class="poster-picker-cell skeleton-bg"></div>'.repeat(6)}</div>`;

  try {
    const res = await fetch(`/api/search?images=${encodeURIComponent(tmdbId)}`);
    const data = await res.json();
    const posters = (data && data.posters) || [];
    if (posters.length === 0) {
      grid.innerHTML = `<div class="poster-picker-empty">Aucune affiche alternative disponible pour ce film.</div>`;
      return;
    }
    grid.innerHTML = posters.map(p => `
      <button type="button" class="poster-picker-cell" data-poster-path="${escAttr(p.file_path)}" aria-label="Choisir cette affiche">
        <img src="https://image.tmdb.org/t/p/w185${p.file_path}" alt="" loading="lazy" decoding="async">
      </button>
    `).join('');
    grid.dataset.tmdbId = String(tmdbId);
  } catch {
    grid.innerHTML = `
      <div class="error-state">
        <div class="error-state-msg">Impossible de charger les affiches. Vérifie ta connexion.</div>
        <button type="button" class="error-retry-btn" data-retry-posters="${escAttr(String(tmdbId))}">Réessayer</button>
      </div>`;
  }
}

// Gestionnaires délégués au niveau RACINE (leçon apprise : jamais dans une
// fonction de rendu conditionnelle).
document.getElementById('movie-detail-sheet')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mds-poster-change-btn');
  if (btn) openPosterPicker(btn.dataset.posterPicker);
});

document.getElementById('poster-picker-modal')?.addEventListener('click', (e) => {
  const modal = document.getElementById('poster-picker-modal');
  if (e.target === modal) { modal.classList.remove('open'); return; }
  if (e.target.closest('#poster-picker-close')) { modal.classList.remove('open'); return; }

  const retry = e.target.closest('.error-retry-btn[data-retry-posters]');
  if (retry) { openPosterPicker(retry.dataset.retryPosters); return; }

  const cell = e.target.closest('.poster-picker-cell[data-poster-path]');
  if (!cell) return;
  const grid = document.getElementById('poster-picker-grid');
  const tmdbId = grid.dataset.tmdbId;
  const url = `https://image.tmdb.org/t/p/w185${cell.dataset.posterPath}`;
  const touched = applyChosenPoster(tmdbId, url);
  if (navigator.vibrate) navigator.vibrate(15);
  modal.classList.remove('open');

  // Rafraîchit l'affiche visible dans la fiche immédiatement (w342 pour la
  // grande vue, même chemin de fichier)
  const sheetPoster = document.querySelector('#movie-detail-sheet .mds-poster');
  if (sheetPoster && sheetPoster.tagName === 'IMG') {
    sheetPoster.src = `https://image.tmdb.org/t/p/w342${cell.dataset.posterPath}`;
  }
  renderAll();
  showToast(touched > 0 ? 'Affiche mise à jour dans ta collection' : 'Affiche mise à jour');
});
