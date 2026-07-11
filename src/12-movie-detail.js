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
  const director = data.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  const cast = (data.credits?.cast || []).slice(0, 5).map(c => c.name).join(', ');
  const releaseDateStr = data.release_date
    ? new Date(data.release_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';

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
      ${director ? `<div class="mds-row"><span class="mds-label">Réalisateur</span><span>${director}</span></div>` : ''}
      ${cast ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${cast}</span></div>` : ''}
      ${!director && !cast ? `<div class="mds-row"><span class="mds-label">—</span><span>Non communiqué</span></div>` : ''}
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
  } catch (e) {
    mdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger les détails pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closeMovieDetailSheet() {
  closeModal(mdsEl);
}

mdsCloseBtn.addEventListener('click', closeMovieDetailSheet);
mdsEl.addEventListener('click', (e) => { if (e.target === mdsEl) closeMovieDetailSheet(); });
