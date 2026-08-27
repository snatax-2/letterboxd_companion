// ═══════════════════════════════════════════
//  RECHERCHE REPLIABLE — MÉCANIQUE PARTAGÉE
// ═══════════════════════════════════════════
// Une loupe posée au bout d'une ligne de contrôles, qui se déplie en champ de
// recherche occupant toute la ligne. Découvrir a inauguré le motif ; il sert
// maintenant aussi dans Historique et À voir.
//
// ── Pourquoi une mécanique partagée plutôt que trois copies ──
// Le comportement est rigoureusement le même partout : ouvrir, poser le focus,
// fermer par Échap, par la croix, ou par un clic extérieur, et tenir
// aria-expanded à jour. Seul DIFFÈRE ce que le champ interroge. Trois copies
// auraient divergé à la première correction — celle des thèmes historiques
// l'a assez montré. Ce qui est propre à chaque écran passe donc par les deux
// crochets onOuvrir / onFermer, et rien d'autre.
//
// ── Ce que la mécanique ne fait PAS ──
// Elle ne vide pas le champ et ne lance aucune requête. Vider a des
// conséquences différentes selon l'écran (dans Historique, cela signifie
// relâcher un filtre et réafficher la liste entière), et c'est précisément le
// genre de décision qui doit rester visible dans le fichier de l'écran
// concerné plutôt que cachée ici.

function installCollapsibleSearch(config) {
  const { line, toggle, input, closeBtn, onOuvrir, onFermer, peutFermer } = config;
  if (!line || !toggle || !input) return null;

  function estOuverte() {
    return line.classList.contains('searching');
  }

  function ouvrir() {
    if (estOuverte()) return;
    line.classList.add('searching');
    toggle.setAttribute('aria-expanded', 'true');
    // Le focus n'est donné qu'une fois le champ réellement dimensionné : sur
    // iOS, focaliser un élément de largeur nulle fait remonter le clavier sans
    // que le curseur soit visible au bon endroit.
    requestAnimationFrame(() => input.focus());
    onOuvrir?.();
  }

  // peutFermer garde TOUS les chemins de fermeture, pas seulement le clic
  // extérieur : sur Noter, où la ligne ne doit pas se replier tant qu'aucun
  // sujet n'est retenu, Échap ne doit pas non plus escamoter le champ titre.
  // Sans ce garde, le premier appui n'importe où sur l'écran repliait la
  // ligne et laissait le formulaire sans aucun moyen visible de nommer ce
  // qu'on note.
  function fermer({ rendreLeFocus = true } = {}) {
    if (!estOuverte()) return;
    if (peutFermer && !peutFermer()) return;
    line.classList.remove('searching');
    toggle.setAttribute('aria-expanded', 'false');
    onFermer?.();
    if (rendreLeFocus) toggle.focus();
  }

  toggle.addEventListener('click', ouvrir);
  closeBtn?.addEventListener('click', () => fermer());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      fermer();
    }
  });

  // Un clic hors de la zone referme, mais SEULEMENT si le champ est vide :
  // refermer une recherche en cours parce que le doigt a effleuré le fond
  // serait une perte de travail, pas une commodité. Dans Historique, ce serait
  // même pire — le filtre saisi disparaîtrait avec le champ.
  document.addEventListener('click', (e) => {
    if (!estOuverte()) return;
    if (line.contains(e.target)) return;
    if (config.zoneSupplementaire?.()?.contains(e.target)) return;
    if (input.value.trim() !== '') return;
    fermer({ rendreLeFocus: false });
  });

  return { ouvrir, fermer, estOuverte };
}
