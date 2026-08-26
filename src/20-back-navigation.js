// ═══════════════════════════════════════════
//  BOUTON RETOUR (Android / navigateur)
// ═══════════════════════════════════════════
//
// Le problème corrigé ici : l'app n'écrivait aucune entrée d'historique. En
// PWA installée sur Android, le bouton Retour QUITTE donc l'application, quoi
// qu'il y ait à l'écran — une fiche film ouverte, une modale de confirmation,
// un onglet autre que celui d'arrivée. C'est le réflexe le plus courant pour
// « fermer ce que je viens d'ouvrir », et il jetait l'utilisateur dehors.
//
// ── CE QUE FAIT LE RETOUR MAINTENANT ────────────────────────────────────
//   1. une couche est ouverte (fiche, modale, menu) -> ferme la plus récente ;
//   2. sinon, on n'est pas sur l'onglet d'arrivée   -> y revient ;
//   3. sinon                                        -> quitte, comme avant.
//
// Le point 2 ramène à Découvrir plutôt qu'à l'onglet précédemment visité.
// C'est un choix : un historique d'onglets ferait faire des allers-retours
// (Découvrir -> Profil -> Découvrir -> Profil...) à qui presse Retour
// plusieurs fois, alors qu'un point de chute unique reste prévisible — le
// même parti qu'Instagram ou X. Deux pressions suffisent toujours à sortir.
//
// ── POURQUOI UNE SEULE ENTRÉE « SENTINELLE » ────────────────────────────
// L'approche évidente serait d'empiler une entrée par couche ouverte et de
// la retirer à la fermeture. Mais les couches s'ouvrent depuis 14 endroits
// différents et se ferment par cinq chemins (bouton, clic sur le fond,
// Échap, glissement vers le bas, action qui referme) : maintenir la pile en
// phase demanderait de toucher chacun, et le moindre oubli désynchroniserait
// l'historique de l'écran.
//
// À la place : UNE entrée sentinelle, posée dès qu'il y a quelque chose à
// annuler, consommée par le Retour, puis reposée si besoin. L'état de
// l'écran reste la seule source de vérité — on le relit à chaque Retour au
// lieu d'essayer de le refléter.
//
// L'ordre d'ouverture, lui, ne peut pas se déduire du DOM : les 12 overlays
// partagent le même z-index (10000), et l'ordre du document ne dit rien de
// l'ordre d'ouverture. Un MutationObserver sur leur attribut class le donne
// exactement, sans toucher aux 14 sites d'ouverture.

(function initBackNavigation() {
  const ONGLET_ARRIVEE = 'discover';

  // Couches ouvertes, de la plus ancienne à la plus récente.
  const pile = [];
  let sentinellePosee = false;
  let retourInterne = false; // pour ignorer le popstate de notre propre history.back()
  // Distingue un popstate causé par un vrai Back (la position recule dans un
  // historique déjà visité, history.length ne change pas) d'un popstate causé
  // par une navigation de fragment "vers l'avant" — coller #profile dans la
  // barre d'adresse pendant que l'app tourne déjà, ou cliquer un lien de ce
  // type : le navigateur pousse alors une ENTREE NEUVE et déclenche quand même
  // popstate, alors que ce n'est pas un Retour. Sans cette distinction, un tel
  // lien collé forçait un retour à Découvrir au lieu d'ouvrir l'onglet visé —
  // reproduit et vérifié avant ce correctif.
  let longueurConnue = history.length;

  // Fermetures dédiées : ces fiches font plus que retirer la classe (rendre le
  // focus, arrêter une bande-annonce, réinitialiser leur état). Les autres
  // overlays passent par closeModal(), qui suffit.
  const FERMETURES = {
    'action-sheet': 'closeActionSheet',
    'movie-detail-sheet': 'closeMovieDetailSheet',
    'person-detail-sheet': 'closePersonDetailSheet',
    'tv-detail-sheet': 'closeTvDetailSheet',
    'curated-list-sheet': 'closeCuratedListSheet',
  };

  function fermerCouche(id) {
    const nom = FERMETURES[id];
    if (nom && typeof window[nom] === 'function') { window[nom](); return; }
    if (nom && typeof globalThis[nom] === 'function') { globalThis[nom](); return; }
    const el = document.getElementById(id);
    if (el && typeof closeModal === 'function') closeModal(el);
    else if (el) el.classList.remove('open');
  }

  function ongletActif() {
    const actif = document.querySelector('.mobile-nav .nav-btn.active');
    if (!actif) return ONGLET_ARRIVEE;
    return (actif.id || '').replace(/^nav-/, '') || ONGLET_ARRIVEE;
  }

  // Y a-t-il quelque chose que le Retour puisse annuler ?
  function quelqueChoseAAnnuler() {
    return pile.length > 0 || ongletActif() !== ONGLET_ARRIVEE;
  }

  function synchroniserSentinelle() {
    const besoin = quelqueChoseAAnnuler();
    if (besoin && !sentinellePosee) {
      history.pushState({ lbxRetour: true }, '');
      sentinellePosee = true;
      longueurConnue = history.length;
    } else if (!besoin && sentinellePosee) {
      // Plus rien à annuler alors qu'une sentinelle traîne (l'utilisateur a
      // refermé au bouton) : on la consomme nous-mêmes, sinon le Retour
      // suivant serait avalé sans rien faire de visible.
      retourInterne = true;
      history.back();
    }
  }

  // ── Suivi de l'ordre d'ouverture ──────────────────────────────────────
  const observateur = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const el = m.target;
      const id = el.id;
      if (!id) continue;
      const ouvert = el.classList.contains('open');
      const index = pile.indexOf(id);
      if (ouvert && index === -1) pile.push(id);
      else if (!ouvert && index !== -1) pile.splice(index, 1);
    }
    synchroniserSentinelle();
  });

  document.querySelectorAll('.modal-overlay').forEach((el) => {
    if (el.classList.contains('open') && el.id) pile.push(el.id);
    observateur.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  // Les onglets comptent aussi : quitter l'onglet d'arrivée doit rendre le
  // Retour utile. Même mécanisme, sur la barre de navigation.
  document.querySelectorAll('.mobile-nav .nav-btn').forEach((btn) => {
    observateur.observe(btn, { attributes: true, attributeFilter: ['class'] });
  });

  window.addEventListener('popstate', () => {
    if (retourInterne) { retourInterne = false; sentinellePosee = false; longueurConnue = history.length; return; }

    const entreeNeuve = history.length > longueurConnue;
    longueurConnue = history.length;
    sentinellePosee = false;

    if (entreeNeuve) {
      // Navigation vers l'avant, pas un Retour : honore le hash s'il désigne
      // un onglet valide (voir 01-navigation.js pour ONGLETS_VALIDES), sinon
      // ignore proprement. switchMobileNav() met à jour le DOM, ce qui
      // déclenche l'observateur et repose une sentinelle si besoin — même
      // chemin qu'un clic d'onglet normal.
      const ongletDemande = location.hash.slice(1);
      if (typeof ONGLETS_VALIDES !== 'undefined' && ONGLETS_VALIDES.includes(ongletDemande)
        && typeof switchMobileNav === 'function') {
        switchMobileNav(ongletDemande);
      }
      return;
    }

    if (pile.length) {
      fermerCouche(pile[pile.length - 1]);
      // La fermeture déclenche l'observateur, qui rappellera
      // synchroniserSentinelle() avec la pile à jour.
      return;
    }
    if (ongletActif() !== ONGLET_ARRIVEE) {
      if (typeof switchMobileNav === 'function') switchMobileNav(ONGLET_ARRIVEE);
      return;
    }
    // Rien à annuler : on ne repose pas de sentinelle, le prochain Retour
    // quitte l'application comme l'utilisateur s'y attend.
  });

  // L'onglet d'arrivée est appliqué dans un setTimeout(..., 0) en fin de
  // 01-navigation.js : on laisse ce réglage se faire avant de juger de
  // l'état initial, sinon on poserait une sentinelle inutile au démarrage.
  setTimeout(synchroniserSentinelle, 0);
})();
