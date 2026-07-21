// Tirage "aléatoire" mais STABLE pour une graine donnée (le jour, ou la
// semaine ISO) — contrairement à Math.random(), la même graine donne
// toujours le même résultat, ce qui permet à tous les appareils de
// l'utilisateur de voir le même film le même jour, sans rien stocker côté
// serveur. Ce n'est pas un vrai générateur cryptographique : ça n'a pas
// besoin de l'être, juste de paraître varié et rester reproductible.

// Trick classique : le sinus d'un grand nombre "brasse" bien les décimales.
// Pas cryptographique, mais amplement suffisant pour éparpiller un tirage
// dans une plage donnée de façon peu previsible à l'oeil.
function seededFraction(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Choisit une page TMDb (1..maxPage) ET un index dans les résultats de cette
// page (0..pageSize-1), tous deux dérivés de la même graine mais avec un
// décalage différent pour ne pas corréler page et index (sinon page=5
// donnerait toujours index proportionnel à 5).
function seededPageAndIndex(seed, maxPage, pageSize) {
  const page = Math.floor(seededFraction(seed) * maxPage) + 1;
  const index = Math.floor(seededFraction(seed + 0.5) * pageSize);
  return { page, index };
}

export { seededFraction, seededPageAndIndex };
