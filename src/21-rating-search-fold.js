// ═══════════════════════════════════════════
//  NOTER — LE CHAMP TITRE SE REPLIE UNE FOIS LE SUJET CHOISI
// ═══════════════════════════════════════════
// Quatrième et dernier écran du motif « loupe qui se déplie », mais avec une
// règle d'ouverture inverse des trois autres — et pour une raison de fond.
//
// ── Pourquoi Noter ne se comporte pas comme les autres ──
// #movie-search et #tv-search ne sont PAS des barres de recherche : ce sont
// les champs titre du formulaire, qui se trouvent chercher sur TMDb.
//   • saveRating() (05-rating-form.js) lit searchEl.value comme titre de
//     repli quand aucune fiche TMDb n'a été retenue : on peut noter un film
//     que TMDb ne connaît pas rien qu'en tapant son titre.
//   • selectMovie() y réécrit « Titre (année) » : le champ AFFICHE ce qu'on
//     est en train de noter.
// Le replier par défaut cacherait donc le champ principal de l'écran
// principal — celui vers lequel pointe le bouton NOTER central — et
// couperait silencieusement la saisie libre.
//
// La ligne reste donc dépliée tant qu'aucun sujet n'est retenu, et ne se
// replie qu'une fois un film ou une série choisi. Le parcours principal ne
// coûte pas un appui de plus, et la place se libère au moment où le
// formulaire est le plus long (curseurs, contexte, critique).
//
// ── L'état est DÉRIVÉ, pas poussé ──
// Six chemins mènent à « un sujet est retenu » : la sélection d'une
// suggestion, la saisie manuelle, la reprise d'une note depuis l'historique,
// l'envoi depuis la watchlist, le démarrage d'une série, la notation d'une
// saison. Les brancher un par un aurait garanti qu'on en oublie un — c'est
// exactement ce qui était arrivé à la pastille du switch Films/Séries.
// On observe donc l'indicateur que TOUS ces chemins finissent par allumer :
// la bande du film (ou celle de la saison). Un septième chemin, écrit demain,
// sera pris en charge sans rien changer ici.

(function initRatingSearchFold() {
  // Un sujet est retenu si et seulement si l'un de ces éléments est affiché.
  // Côté film c'est une classe, côté série un style en ligne : on teste donc
  // le rendu réel plutôt que la mécanique de chacun.
  function estAffiche(el) {
    return !!el && el.offsetParent !== null;
  }

  function installer({ ligne, toggle, champ, input, sujet, indicateurs, titreSource }) {
    const sujetRetenu = () => indicateurs.some((id) => estAffiche(document.getElementById(id)));
    const ligneEl = document.getElementById(ligne);
    const toggleEl = document.getElementById(toggle);
    const inputEl = document.getElementById(input);
    const sujetEl = document.getElementById(sujet);
    if (!ligneEl || !toggleEl || !inputEl || !sujetEl) return;

    // Départ déplié : à l'arrivée sur Noter, le formulaire est vide.
    ligneEl.classList.add('searching');

    const repliable = installCollapsibleSearch({
      line: ligneEl,
      toggle: toggleEl,
      input: inputEl,
      // Pas de croix de fermeture : la ✕ de ce champ est un bouton EFFACER,
      // qui vide sans replier — c'est utile en pleine frappe. Le repli, lui,
      // suit le choix du sujet.
      onOuvrir() {
        // Rouvrir pour changer de film : on repart de la saisie précédente
        // sélectionnée, plutôt que d'un champ vide à retaper en entier.
        inputEl.select?.();
      },
      // Rien ne referme cette ligne tant qu'aucun sujet n'est retenu — ni un
      // clic ailleurs, ni Échap. La replier laisserait le formulaire sans
      // aucun moyen visible de nommer ce qu'on note.
      peutFermer: sujetRetenu,
    });
    if (!repliable) return;

    function majSujet() {
      if (sujetRetenu()) {
        const titre = document.getElementById(titreSource)?.textContent?.trim();
        // Le champ porte « Titre (année) » depuis selectMovie ; la bande, elle,
        // porte le titre nu. On garde la version du champ quand elle existe,
        // c'est celle qui était affichée là avant le repli.
        sujetEl.textContent = inputEl.value.trim() || titre || '';
        toggleEl.setAttribute('aria-label', `Changer de titre (${sujetEl.textContent})`);
        repliable.fermer({ rendreLeFocus: false });
      } else {
        sujetEl.textContent = '';
        repliable.ouvrir();
      }
    }

    // offsetParent ne se surveille pas : on observe ce qui le fait changer —
    // la classe de la bande film, le style en ligne des blocs série — et on
    // relit le rendu réel à chaque fois.
    const observateur = new MutationObserver(majSujet);
    indicateurs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observateur.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    majSujet();
  }

  installer({
    ligne: 'movie-search-line', toggle: 'movie-search-toggle', champ: 'movie-search-field',
    input: 'movie-search', sujet: 'movie-search-subject',
    indicateurs: ['film-strip'], titreSource: 'strip-title',
  });

  installer({
    ligne: 'tv-search-line', toggle: 'tv-search-toggle', champ: 'tv-search-field',
    input: 'tv-search', sujet: 'tv-search-subject',
    // Deux indicateurs côté série : le sélecteur de saison apparaît dès que la
    // série est choisie, la bande seulement quand une saison l'est. Choisir la
    // série suffit à replier — c'est déjà un sujet.
    indicateurs: ['tv-season-picker', 'tv-season-strip'], titreSource: 'tv-strip-title',
  });
})();
