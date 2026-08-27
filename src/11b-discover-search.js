// ═══════════════════════════════════════════
//  DÉCOUVRIR — RECHERCHE UNIFIÉE
// ═══════════════════════════════════════════
// Une loupe dans le coin de la ligne de bascule qui se déplie en champ de
// recherche, et donne accès à la fiche d'un film, d'une série ou d'une
// personne. Le dépliage lui-même vient de installCollapsibleSearch
// (03c-collapsible-search.js), partagé avec Historique et À voir ; ce fichier
// ne porte que ce qui est propre à Découvrir.
//
// ── Pourquoi une loupe qui se déplie plutôt qu'un champ permanent ──
// Découvrir est un écran de flânerie : l'action première est de regarder des
// affiches, pas de chercher. Un champ posé en permanence en haut de page
// entrerait en concurrence visuelle avec le choix du jour, qui est censé
// dominer. Replié, il ne coûte qu'une icône ; déplié, il prend toute la ligne
// parce qu'à ce moment-là c'est bien lui qu'on utilise.
//
// ── Une seule requête ──
// La recherche tape /api/search?multiQuery= (search/multi côté TMDb), pas les
// trois recherches séparées enchaînées : voir le commentaire de cette branche
// dans api/search.js pour le raisonnement (budget de requêtes, et classement
// par pertinence entre les trois types que TMDb fait déjà).

(function initDiscoverSearch() {
  const toggle = document.getElementById('discover-search-toggle');
  const topline = document.getElementById('discover-topline');
  const input = document.getElementById('discover-search-input');
  const closeBtn = document.getElementById('discover-search-close');
  const panel = document.getElementById('discover-search-panel');
  const resultsEl = document.getElementById('discover-search-results');
  const statusEl = document.getElementById('discover-search-status');
  if (!toggle || !topline || !input || !panel || !resultsEl) return;

  const DEBOUNCE_MS = 320;
  const MIN_CHARS = 2;
  const MAX_RESULTS = 12;
  let timer = null;
  let requeteEnCours = 0; // sert à ignorer une réponse arrivée après une plus récente

  // Le contenu de flânerie (choix du jour, carrousels) s'efface tant qu'une
  // recherche est affichée : le laisser sous les résultats donnait une page à
  // deux sujets, où l'on faisait défiler ses réponses pour tomber sur des
  // propositions sans rapport. Masqué, pas démonté — tout revient intact.
  const carte = document.getElementById('discover-card-wrap');

  function masquerPanneau() {
    panel.hidden = true;
    resultsEl.innerHTML = '';
    statusEl.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    carte?.classList.remove('discover-searching-active');
  }

  function montrerPanneau() {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    carte?.classList.add('discover-searching-active');
  }

  const repliable = installCollapsibleSearch({
    line: topline,
    toggle,
    input,
    closeBtn,
    // Le panneau de résultats déborde de la ligne : sans ça, cliquer DANS ses
    // propres réponses compterait comme un clic extérieur.
    zoneSupplementaire: () => panel,
    onFermer() {
      input.value = '';
      clearTimeout(timer);
      requeteEnCours++; // invalide une réponse encore en vol
      masquerPanneau();
    },
  });
  const fermer = (opts) => repliable?.fermer(opts);

  // ─── Recherche ────────────────────────────────────────────────────────────
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < MIN_CHARS) {
      requeteEnCours++; // toute réponse en vol devient caduque
      masquerPanneau();
      return;
    }
    timer = setTimeout(() => lancerRecherche(q), DEBOUNCE_MS);
  });

  async function lancerRecherche(q) {
    const monTicket = ++requeteEnCours;
    montrerPanneau();
    statusEl.textContent = 'Recherche…';
    resultsEl.innerHTML = '';
    try {
      const res = await fetch(`/api/search?multiQuery=${encodeURIComponent(q)}`);
      const data = await readApiJson(res);
      // Une réponse plus ancienne ne doit jamais écraser une plus récente :
      // sans ce garde, taper vite pouvait afficher les résultats de
      // l'avant-dernière frappe.
      if (monTicket !== requeteEnCours) return;
      afficherResultats(data.results || []);
    } catch (err) {
      if (monTicket !== requeteEnCours) return;
      statusEl.textContent = describeApiFailure(err);
      resultsEl.innerHTML = '';
    }
  }

  // TMDb renvoie les trois types mélangés et classés par pertinence : on garde
  // cet ordre plutôt que de regrouper par type, c'est lui qui fait remonter la
  // bonne réponse en premier quand on tape « nolan » ou « dune ».
  function afficherResultats(bruts) {
    const items = bruts
      .filter((r) => ['movie', 'tv', 'person'].includes(r.media_type))
      .slice(0, MAX_RESULTS);

    if (items.length === 0) {
      statusEl.textContent = 'Aucun résultat.';
      resultsEl.innerHTML = '';
      return;
    }
    statusEl.textContent = '';
    resultsEl.innerHTML = items.map(construireLigne).join('');
  }

  function construireLigne(r) {
    const estPersonne = r.media_type === 'person';
    const titre = r.title || r.name || '';
    const chemin = estPersonne ? r.profile_path : r.poster_path;
    const vignette = chemin
      ? `<img class="dsr-thumb${estPersonne ? ' dsr-thumb-person' : ''}" src="${tmdbImage(chemin, 'w154')}" alt="" loading="lazy">`
      : `<span class="dsr-thumb dsr-thumb-ph${estPersonne ? ' dsr-thumb-person' : ''}" aria-hidden="true"></span>`;

    // Le type est écrit en toutes lettres plutôt que suggéré par la seule
    // forme de la vignette : §14 interdit de faire reposer la compréhension
    // d'un élément sur son seul aspect visuel.
    let libelleType = 'Film';
    let complement = (r.release_date || '').slice(0, 4);
    if (r.media_type === 'tv') {
      libelleType = 'Série';
      complement = (r.first_air_date || '').slice(0, 4);
    } else if (estPersonne) {
      libelleType = r.known_for_department === 'Directing' ? 'Réalisation' : 'Personne';
      complement = (r.known_for || []).map((k) => k.title || k.name).filter(Boolean).slice(0, 2).join(' · ');
    }

    const meta = [libelleType, complement].filter(Boolean).join(' · ');
    return `
      <button type="button" class="dsr-item" role="option" aria-selected="false"
              data-type="${r.media_type}" data-id="${r.id}" data-nom="${escAttr(titre)}">
        ${vignette}
        <span class="dsr-body">
          <span class="dsr-title">${escAttr(titre)}</span>
          <span class="dsr-meta">${escAttr(meta)}</span>
        </span>
      </button>`;
  }

  // Un seul écouteur délégué : les lignes sont reconstruites à chaque frappe.
  resultsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.dsr-item');
    if (!item) return;
    const { type, id, nom } = item.dataset;
    // La recherche se referme AVANT l'ouverture de la fiche : au retour, on
    // retrouve Découvrir tel qu'on l'avait laissé plutôt qu'un panneau de
    // résultats resté ouvert par-dessus.
    fermer({ rendreLeFocus: false });
    if (type === 'tv') openTvDetailSheet(id);
    else if (type === 'person') openPersonDetailSheet(id, nom);
    else openMovieDetailSheet(id);
  });
})();
