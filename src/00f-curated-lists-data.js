// Exploration par thème (Découvrir) — mots-clés TMDb, indépendants des
// genres classiques (un genre dit "c'est un thriller", un mot-clé dit
// "c'est un film de braquage"). Sélection choisie à la main plutôt qu'une
// recherche en texte libre (risque réel de recherches sans résultat) —
// identifiants vérifiés un par un. Contrairement aux décennies/studios/pays
// (un vrai "canon" à suivre, dans Profil), un mot-clé n'a pas de nombre
// canonique de films : vit dans Découvrir comme un outil de
// navigation/suggestion, pas de suivi de complétion.
const CURATED_THEMES = [
  { id: 10051, name: 'Braquage', icon: 'moneyBag' },
  { id: 10854, name: 'Boucle temporelle', icon: 'timeLoop' },
  { id: 9748, name: 'Vengeance', icon: 'sword' },
  { id: 10683, name: "Passage à l'âge adulte", icon: 'sprout' },
  { id: 10349, name: 'Survie', icon: 'compass' },
  { id: 7312, name: 'Road trip', icon: 'road' },
  { id: 3358, name: 'Maison hantée', icon: 'hauntedHouse' },
  { id: 4565, name: 'Dystopie', icon: 'skyline' },
];
