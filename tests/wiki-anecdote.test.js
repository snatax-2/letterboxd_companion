// Tests de la logique d'extraction d'anecdotes Wikipédia (api/_wikiAnecdote.js).
// Le sandbox de développement n'a pas accès réseau à fr.wikipedia.org — ces
// tests vérifient donc le parsing contre du contenu FIXTURE qui reproduit
// fidèlement la forme réelle des réponses de l'API MediaWiki
// (exsectionformat=wiki, avec les marqueurs "== Titre ==" et des artefacts de
// notes comme dans un vrai article).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('extractAnecdote / buildWikiCandidates', () => {
  test('extrait la section Anecdotes en priorité sur Production', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Ceci est l'introduction de l'article, plusieurs phrases ici pour faire une intro plausible et longue.

== Synopsis ==
Un synopsis qui ne nous intéresse pas du tout pour cette extraction.

== Anecdotes ==
Le tournage s'est déroulé sur trois continents différents en à peine six semaines. L'acteur principal a appris à jouer de la contrebasse spécialement pour le rôle. Une scène coupée au montage montrait un tout autre dénouement.

== Production ==
Cette section production ne devrait pas être choisie car Anecdotes existe déjà et passe avant dans l'ordre de priorité des sections recherchées.

== Liens externes ==
Quelques liens qu'on ignore complètement dans le parsing.`;
    const result = extractAnecdote(fixture);
    assert.ok(result.includes('trois continents'));
    assert.ok(!result.includes('ne devrait pas être choisie'));
  });

  test('se rabat sur Production si Anecdotes n\'existe pas', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Introduction de l'article.

== Synopsis ==
Un synopsis quelconque.

== Production ==
Le réalisateur a d'abord envisagé un autre acteur pour le rôle principal avant que celui-ci ne se désiste deux semaines avant le début du tournage, obligeant toute l'équipe à revoir son planning en urgence.

== Distribution ==
La liste des acteurs, sans intérêt ici.`;
    const result = extractAnecdote(fixture);
    assert.ok(result.includes('envisagé un autre acteur'));
  });

  test('ignore les accents dans la comparaison des titres de section ("Genèse")', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Intro.

== Genèse ==
Le projet est né d'une idée griffonnée sur un coin de table lors d'un festival de cinéma, bien avant que quiconque ne pense en faire un long-métrage à part entière.`;
    const result = extractAnecdote(fixture);
    assert.ok(result.includes('griffonnée sur un coin de table'));
  });

  test('rejette une section trop courte (juste un renvoi, pas une vraie anecdote)', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Intro.

== Anecdotes ==
Voir aussi.

== Tournage ==
Le tournage principal a eu lieu en studio, avec quelques prises de vue en extérieur réalisées dans une forêt du sud de la France pendant l'automne, ce qui a posé des problèmes de continuité de lumière entre les scènes.`;
    const result = extractAnecdote(fixture);
    assert.ok(result.includes('problèmes de continuité'));
    assert.ok(!result.includes('Voir aussi'));
  });

  test('nettoie les artefacts de notes ([12], [note 3])', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Intro.

== Anecdotes ==
Le budget final a largement dépassé les prévisions initiales[12], forçant le studio à revoir sa stratégie marketing[note 3] pour rentabiliser l'investissement malgré ce dépassement important et surprenant pour tous.`;
    const result = extractAnecdote(fixture);
    assert.ok(!result.includes('[12]'));
    assert.ok(!result.includes('[note 3]'));
    assert.ok(result.includes('dépassé les prévisions'));
  });

  test('coupe proprement sur une fin de phrase plutôt qu\'au milieu d\'un mot', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const longSentence = 'Une très longue phrase qui décrit en détail un fait précis. '.repeat(10);
    const fixture = `Intro.\n\n== Anecdotes ==\n${longSentence}`;
    const result = extractAnecdote(fixture);
    assert.ok(result.endsWith('.'), `devrait finir par un point, recu: "${result.slice(-30)}"`);
  });

  test('renvoie null si aucune section pertinente n\'existe', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    const fixture = `Intro.\n\n== Synopsis ==\nUn synopsis.\n\n== Distribution ==\nDes acteurs.`;
    const result = extractAnecdote(fixture);
    assert.equal(result, null);
  });

  test('renvoie null pour un texte vide ou absent', async () => {
    const { extractAnecdote } = await import('../api/_wikiAnecdote.js');
    assert.equal(extractAnecdote(''), null);
    assert.equal(extractAnecdote(null), null);
  });

  test('buildWikiCandidates propose les bonnes variantes, dans le bon ordre', async () => {
    const { buildWikiCandidates } = await import('../api/_wikiAnecdote.js');
    const withYear = buildWikiCandidates('Inception', '2010');
    assert.deepEqual(withYear, ['Inception (film, 2010)', 'Inception (film)', 'Inception']);
    const withoutYear = buildWikiCandidates('Amélie', '');
    assert.deepEqual(withoutYear, ['Amélie (film)', 'Amélie']);
  });
});
