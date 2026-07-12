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
function buildMdsContent(data, localMatch) {
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
      ${posterUrl
        ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.title)}" loading="lazy">`
        : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
      <div class="mds-header-info">
        <div class="mds-title" id="mds-title">${data.title}</div>
        <div class="mds-meta">${[year, runtime, genres].filter(Boolean).join(' · ')}</div>
        ${data.vote_average ? `<div class="mds-tmdb-score">★ ${data.vote_average.toFixed(1)} TMDb</div>` : ''}
      </div>
    </div>

    ${personalHtml}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview">${escAttr(data.overview)}</div>
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

async function openMovieDetailSheet(tmdbId) {
  if (!tmdbId) {
    showToast("Ce film n'a pas de fiche TMDb liée (ajouté en saisie manuelle).");
    return;
  }

  lastFocusedBeforeModal = document.activeElement;
  mdsContentEl.innerHTML = buildMdsSkeleton();
  mdsEl.classList.add('open');

  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.title) throw new Error('no data');

    const history = loadHistory();
    const localMatch = history.find(h => String(h.tmdbId) === String(tmdbId));

    mdsContentEl.innerHTML = buildMdsContent(data, localMatch);
    const mdsPosterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
    applyPosterAccent(mdsPosterUrl, mdsEl.querySelector('.mds-box'));
  } catch (e) {
    mdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger les détails pour l'instant. Vérifie ta connexion et réessaie.</div>`;
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
// même film, ex: dans les deux listes renvoyées par TMDb).
function buildPersonFilmography(data) {
  const seen = new Set();
  const films = [];
  [...(data.movie_credits?.cast || []), ...(data.movie_credits?.crew || [])].forEach(m => {
    if (!m.id || seen.has(m.id)) return;
    seen.add(m.id);
    films.push({ id: m.id, title: m.title, release_date: m.release_date, poster_path: m.poster_path });
  });
  films.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
  return films;
}

// Pourcentage de la filmographie déjà présent dans l'historique de
// l'utilisateur (par tmdbId) — le petit "plus" ludique de cette fiche.
function computeSeenPercentage(films) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));
  const seenCount = films.filter(f => seenIds.has(String(f.id))).length;
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
          const posterUrl = f.poster_path ? `https://image.tmdb.org/t/p/w92${f.poster_path}` : '';
          const year = f.release_date ? f.release_date.slice(0, 4) : '';
          return `
            <div class="pds-film-item" data-movie-id="${f.id}">
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
