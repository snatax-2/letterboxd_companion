// Extraction d'une vraie anecdote depuis un article Wikipédia FR (voir
// api/search.js, cas ?wikianecdote=). Module séparé pour être testable
// unitairement (tests/wiki-anecdote.test.js) sans dépendre du réseau — le
// sandbox de développement n'a pas accès à fr.wikipedia.org, donc c'est ici
// qu'on peut vérifier que le parsing fonctionne, avec du contenu réaliste en
// fixture plutôt qu'un vrai appel réseau.

// Titres des sections qui contiennent typiquement de vraies anecdotes sur le
// Wikipédia francophone, dans l'ordre de préférence. Ordre vérifié contre un
// vrai article ("Le Parrain (film)") : "Genèse" et "Tournage" sont des
// SOUS-sections de "Production" et contiennent la matière la plus riche
// (casting, improvisations, anecdotes de plateau) — "Production" lui-même
// n'est souvent qu'un bref texte d'introduction avant ces sous-sections,
// d'où sa priorité plus basse ici malgré son nom générique.
const SECTION_NAMES = ['anecdotes', 'tournage', 'genèse', 'production'];

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// plainText : sortie de l'API MediaWiki avec exsectionformat=wiki (garde les
// marqueurs "== Titre ==" au lieu de les retirer) — on découpe dessus plutôt
// que d'essayer de parser du wikitexte complet.
function extractAnecdote(plainText) {
  if (!plainText) return null;
  const lines = plainText.split('\n');
  const sections = [];
  let current = { name: '', body: [] };
  for (const line of lines) {
    const m = line.match(/^==+\s*(.+?)\s*==+$/);
    if (m) {
      if (current.body.length) sections.push(current);
      current = { name: m[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push(current);

  for (const wanted of SECTION_NAMES) {
    const found = sections.find(s => stripAccents(s.name.toLowerCase()) === stripAccents(wanted));
    if (!found) continue;
    const text = found.body.join(' ').replace(/\s+/g, ' ').trim();
    if (text.length < 60) continue; // section vide ou juste un renvoi, pas une vraie anecdote
    let snippet = text.slice(0, 380);
    const lastDot = snippet.lastIndexOf('. ');
    if (lastDot > 100) snippet = snippet.slice(0, lastDot + 1);
    snippet = snippet.replace(/\[\d+\]|\[note \d+\]/gi, '').replace(/\s+/g, ' ').trim();
    return snippet;
  }
  return null;
}

function buildWikiCandidates(title, year) {
  return [
    year ? `${title} (film, ${year})` : null,
    `${title} (film)`,
    title,
  ].filter(Boolean);
}

export { extractAnecdote, buildWikiCandidates, SECTION_NAMES };
