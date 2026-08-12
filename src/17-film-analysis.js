// ═══════════════════════════════════════════
//  MODULE ANALYSE DE FILM
// ═══════════════════════════════════════════
// Un onglet "Analyse" sur la fiche de chaque film, à côté de la note (voir
// guide-module-analyse-film.pdf). Stockage local comme tout le reste de
// Ludex (historique, watchlists, duels) — pas de vraie base de données
// serveur, décidé ensemble : Analyse et ProgressionUtilisateur sont des
// données personnelles comme les autres, pas une raison de sortir du
// mécanisme existant. La synchronisation cloud n'inclut pas encore ces
// clés (à ajouter dans un second temps, voir 10-cloud-sync.js).
//
// Phase 1+2 du document uniquement pour cette livraison : la boucle
// complète (écrire → recevoir un retour → garder une trace) fonctionne de
// bout en bout. Le système de connaissances (glossaire, notions à
// débloquer — Phase 5 du document) est volontairement repoussé plus tard,
// une fois ce socle vécu un moment.

const FILM_ANALYSES_KEY = 'lbx_analyses';

function loadAnalyses() {
  try { return JSON.parse(localStorage.getItem(FILM_ANALYSES_KEY)) || []; } catch { return []; }
}
function saveAnalyses(analyses) {
  localStorage.setItem(FILM_ANALYSES_KEY, JSON.stringify(analyses));
}
function getAnalysesForFilm(filmId) {
  return loadAnalyses()
    .filter(a => String(a.filmId) === String(filmId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildAnalysisSectionHtml(movieId, movieTitle) {
  const past = getAnalysesForFilm(movieId);
  return `
    <div class="mds-section-title">Analyse</div>
    <div class="analysis-form">
      <label class="analysis-label" for="analysis-technique">Analyse technique</label>
      <textarea class="analysis-textarea" id="analysis-technique" rows="3" placeholder="Cadrage, lumière, montage, son, mise en scène..."></textarea>
      <label class="analysis-label" for="analysis-theme">Analyse thématique</label>
      <textarea class="analysis-textarea" id="analysis-theme" rows="3" placeholder="Sujet apparent vs sujet réel, comment la forme sert le fond..."></textarea>
      <button type="button" class="icon-btn analysis-submit-btn" id="analysis-submit-btn">Envoyer pour analyse</button>
      <div class="analysis-error" id="analysis-error" style="display:none;" role="alert"></div>
    </div>
    <div class="analysis-history" id="analysis-history">${past.map(renderAnalysisEntry).join('')}</div>
  `;
}

function renderAnalysisEntry(a) {
  const dateLabel = new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const r = a.retour;
  return `
    <div class="analysis-entry">
      <div class="analysis-entry-date">${escAttr(dateLabel)}</div>
      <p class="analysis-synthese">${escAttr(r.synthese || '')}</p>
      ${renderAnalysisGroup('Points forts', r.pointsForts)}
      ${renderAnalysisGroup('Angles morts', r.anglesMorts)}
      ${renderAnalysisGroup('Questions pour approfondir', r.questions)}
    </div>
  `;
}

function renderAnalysisGroup(label, items) {
  if (!items || items.length === 0) return '';
  return `
    <div class="analysis-retour-group">
      <div class="analysis-retour-label">${escAttr(label)}</div>
      <ul>${items.map(i => `<li>${escAttr(i)}</li>`).join('')}</ul>
    </div>
  `;
}

function wireAnalysisSection(movieId, movieTitle) {
  const submitBtn = document.getElementById('analysis-submit-btn');
  if (!submitBtn) return; // section pas presente (fiche fermee entre temps, etc.)

  submitBtn.addEventListener('click', async () => {
    const techniqueEl = document.getElementById('analysis-technique');
    const themeEl = document.getElementById('analysis-theme');
    const errorEl = document.getElementById('analysis-error');
    const technique = techniqueEl.value.trim();
    const theme = themeEl.value.trim();
    errorEl.style.display = 'none';

    if (!technique && !theme) {
      errorEl.textContent = 'Écris au moins un des deux champs avant d\'envoyer.';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyse en cours…';

    try {
      const res = await fetch('/api/analyse-film', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: movieTitle, technique, theme }),
      });
      const data = await readApiJson(res); // lève avec le message precis du serveur si !res.ok

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filmId: movieId,
        filmTitle: movieTitle,
        date: new Date().toISOString(),
        texteTechnique: technique,
        texteThematique: theme,
        retour: data.retour,
      };
      const all = loadAnalyses();
      all.push(entry);
      saveAnalyses(all);

      // Reaffiche la section avec la nouvelle entree en tete, champs vides
      // pour permettre d'ecrire une nouvelle analyse tout de suite si besoin.
      const historyEl = document.getElementById('analysis-history');
      historyEl.innerHTML = renderAnalysisEntry(entry) + historyEl.innerHTML;
      techniqueEl.value = '';
      themeEl.value = '';
      showToast('Analyse enregistrée.');
    } catch (err) {
      // describeApiFailure (déjà utilisée ailleurs dans l'app) : affiche le
      // message précis du serveur quand il y en a un (clé manquante, quota
      // épuisé...), plutôt qu'un "vérifie ta connexion" générique qui serait
      // faux dans la plupart de ces cas.
      errorEl.textContent = describeApiFailure(err);
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer pour analyse';
    }
  });
}
