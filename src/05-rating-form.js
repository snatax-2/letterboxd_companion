// ═══════════════════════════════════════════
//  HEART & DATES & REVIEW TEXT
// ═══════════════════════════════════════════
document.getElementById('heart-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate(50);
  isLiked = !isLiked;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  saveDraft();
});

document.getElementById('view-date').addEventListener('change', saveDraft);
document.getElementById('review-text').addEventListener('input', saveDraft);

// ═══════════════════════════════════════════
//  MODE (Détaillé / Rapide)
// ═══════════════════════════════════════════
function setMode(mode) {
  currentMode = mode;
  document.body.classList.toggle('quick-mode', mode === 'quick');
  
  document.getElementById('tab-detail').classList.toggle('active', mode === 'detail');
  document.getElementById('tab-quick').classList.toggle('active', mode === 'quick');
  document.getElementById('mode-badge').textContent = mode === 'detail' ? 'Mode détaillé' : 'Mode rapide';
  
  calculateScore();
  saveDraft();
}

// ═══════════════════════════════════════════
//  QUICK STARS RATING
// ═══════════════════════════════════════════
document.getElementById('quick-stars-container').addEventListener('change', (e) => {
    quickRating = parseFloat(e.target.value);
    calculateScore();
    updateQuickLabel();
    saveDraft();
});

function updateQuickLabel() {
  const label = document.getElementById('quick-rating-label');
  if (!label) return;
  const score = quickRating * 2;
  const stars = getStarStr(Math.round((score / 2) * 2) / 2);
  label.innerHTML = `<span>${stars}</span> — ${score.toFixed(1)}/10`;
}

// ═══════════════════════════════════════════
//  WEIGHTS
// ═══════════════════════════════════════════
function toggleWeights() {
  weightsOpen = !weightsOpen;
  document.getElementById('weights-panel').classList.toggle('open', weightsOpen);
  document.getElementById('weights-toggle').style.color = weightsOpen ? 'var(--orange)' : '';
}

function getWeights() {
  const w = {};
  CRITERIA.forEach(c => {
    const v = parseFloat(document.getElementById(`w-${c}`).value);
    w[c] = isNaN(v) || v < 0 ? 0 : v;
  });
  return w;
}

function resetWeights() {
  CRITERIA.forEach(c => { document.getElementById(`w-${c}`).value = 1; });
  updateWeightBadges();
  calculateScore();
}

function updateWeightBadges() {
  const w = getWeights();
  CRITERIA.forEach(c => {
    document.getElementById(`wb-${c}`).textContent = `×${w[c]}`;
  });
}

CRITERIA.forEach(c => {
  const el = document.getElementById(`w-${c}`);
  if (el) el.addEventListener('input', () => { updateWeightBadges(); calculateScore(); });
});

// ═══════════════════════════════════════════
//  SCORE CALCULATION
// ═══════════════════════════════════════════
function getStarStr(stars) {
  let s = '';
  const full = Math.floor(stars);
  const half = (stars % 1) !== 0;
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  return s || '½';
}

function calculateScore() {
  let score;

  if (currentMode === 'quick') {
    score = quickRating * 2; 
  } else {
    const w = getWeights();
    let weightedSum = 0, totalWeight = 0;
    CRITERIA.forEach(c => {
      const val = parseFloat(document.getElementById(c).value);
      const wt  = w[c];
      document.getElementById(`val-${c}`).textContent = val.toFixed(1);
      document.getElementById(`desc-${c}`).textContent = getDesc(c, val);
      weightedSum  += val * wt;
      totalWeight  += wt;
    });
    score = totalWeight > 0 ? weightedSum / totalWeight : 5;
  }

  const scoreEl = document.getElementById('score-big');
  const denomEl = document.querySelector('.score-denom');

  scoreEl.textContent = score.toFixed(1);
  denomEl.textContent = '/10';
  scoreEl.className = 'score-big ' + (score >= 7.5 ? 'good' : score >= 5.0 ? 'mid' : 'bad');

  const stars = Math.round((score / 2) * 2) / 2;
  document.getElementById('stars-display').textContent = getStarStr(stars);

  return score;
}

function updateSliderPct(el) {
  const val = parseFloat(el.value);
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 10;
  el.style.setProperty('--slider-pct', ((val - min) / (max - min)) * 100 + '%');
}

function updateAllSliders() {
  CRITERIA.forEach(c => {
    const el = document.getElementById(c);
    if (el) updateSliderPct(el);
  });
}

CRITERIA.forEach(c => {
  document.getElementById(c).addEventListener('input', () => {
    updateSliderPct(document.getElementById(c));
    calculateScore();
    saveDraft();
  });
});

// ═══════════════════════════════════════════
//  NOUVELLE CRITIQUE (RESET)
// ═══════════════════════════════════════════
document.getElementById('new-btn').addEventListener('click', () => {
  openModal('Nouvelle critique', 'Voulez-vous effacer le formulaire actuel pour commencer une nouvelle critique ?', () => {
    localStorage.removeItem('lbx_draft');
    resetForm();
    showToast('Formulaire réinitialisé');
  });
});

// ═══════════════════════════════════════════
//  COPY TEXT
// ═══════════════════════════════════════════
document.getElementById('copy-btn').addEventListener('click', () => {
  const title    = document.getElementById('movie-title').value.trim() || searchEl.value.trim() || 'Film sans titre';
  const year     = document.getElementById('movie-year').value;
  const director = document.getElementById('movie-director').value;
  const actors   = document.getElementById('movie-actors').value;
  const dateVal  = document.getElementById('view-date').value;
  const dateStr  = dateVal ? new Date(dateVal + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '';
  const review   = document.getElementById('review-text').value.trim();
  const score    = calculateScore(); 
  const stars    = document.getElementById('stars-display').textContent;
  const heartStr = isLiked ? ' ❤️' : '';

  let text = `📽 ${title} ${year ? '('+year+') ' : ''}${heartStr}\n`;
  if (director) text += `🎬 Un film de ${director}\n`;
  if (actors) text += `🎭 Avec ${actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (activeContextTags.size > 0) text += `🏷 ${Array.from(activeContextTags).join(' · ')}\n`;
  
  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (currentMode === 'detail') {
    const vals = CRITERIA.reduce((acc, c) => {
      acc[c] = parseFloat(document.getElementById(c).value).toFixed(1);
      return acc;
    }, {});
    text += `\nScénario ${vals.scenario} · Réal ${vals.realisation} · Photo ${vals.photo} · Acteurs ${vals.acteurs} · Son ${vals.ambiance} · Affect ${vals.affect}\n`;
  }

  if (review) text += `\n${review}`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copié !';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = '📋 Texte'; btn.classList.remove('copied'); }, 2000);
    showToast('Critique copiée dans le presse-papier');
  });
});

// ═══════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════
document.getElementById('save-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  
  const title = document.getElementById('movie-title').value.trim() || searchEl.value.trim();
  if (!title) { showToast('Entrez un titre de film avant de sauvegarder.'); return; }

  const history  = loadHistory();
  const existing = history.find(h => h.title.toLowerCase() === title.toLowerCase());
  const score    = calculateScore();

  const movie = {
    title,
    year:       document.getElementById('movie-year').value,
    poster:     document.getElementById('movie-poster').value,
    genre:      document.getElementById('movie-genre').value,
    runtime:    document.getElementById('movie-runtime').value,
    director:   document.getElementById('movie-director').value,
    actors:     document.getElementById('movie-actors').value, 
    tmdbScore:  document.getElementById('movie-tmdb-score').value || null,
    date:       document.getElementById('view-date').value,
    liked:      isLiked,
    contextTags: Array.from(activeContextTags),
    score:      score.toFixed(1),
    stars:      document.getElementById('stars-display').textContent,
    mode:       currentMode,
    review:     document.getElementById('review-text').value.trim(),
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    savedAt: existing && existing.savedAt ? existing.savedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString() // sert à la fusion lors de la synchro cloud
  };

  if (existing) {
    openModal(
      'Film déjà noté',
      `"${title}" est déjà dans votre historique avec ${existing.score}/10.\nVoulez-vous écraser cette note ?`,
      () => {
        const idx = history.findIndex(h => h.title.toLowerCase() === title.toLowerCase());
        history.splice(idx, 1);
        history.unshift(movie);
        saveHistory(history);
        localStorage.removeItem('lbx_draft');
        resetForm();
        renderAll();
        showToast(`"${title}" mis à jour`);
      }
    );
  } else {
    history.unshift(movie);
    saveHistory(history);
    localStorage.removeItem('lbx_draft'); 
    resetForm();
    renderAll();
    showToast(`"${title}" enregistré`);
    const saveBtn = document.getElementById('save-btn');
    const origSave = saveBtn.innerHTML;
    saveBtn.innerHTML = '✓ Sauvé !';
    saveBtn.style.background = 'var(--green)';
    saveBtn.style.color = '#0d1117';
    setTimeout(() => { saveBtn.innerHTML = origSave; saveBtn.style.background = ''; saveBtn.style.color = ''; }, 1800);
  }
});

function resetForm() {
  searchEl.value = '';
  document.getElementById('movie-title').value     = '';
  document.getElementById('movie-year').value      = '';
  document.getElementById('movie-poster').value    = '';
  document.getElementById('movie-genre').value     = '';
  document.getElementById('movie-runtime').value   = '';
  document.getElementById('movie-director').value  = '';
  document.getElementById('movie-actors').value    = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('review-text').value     = '';
  document.getElementById('strip-ratings').style.display = 'none';
  document.getElementById('film-strip').classList.remove('visible');
  
  isLiked = false;
  document.getElementById('heart-btn').classList.remove('active');
  setTodayDate();
  
  activeContextTags.clear();
  document.querySelectorAll('.ctx-tag').forEach(b => b.classList.remove('active'));

  CRITERIA.forEach(c => { document.getElementById(c).value = 5; });
  quickRating = 2.5;
  const defaultRadio = document.getElementById('s5'); 
  if(defaultRadio) defaultRadio.checked = true;
  
  setMode('detail'); 
  updateAllSliders();
  updateQuickLabel();
}

// ═══════════════════════════════════════════
//  LOAD MOVIE
// ═══════════════════════════════════════════
window.loadItem = function(idx) {
  const history = loadHistory(); const item = history[idx]; if (!item) return;
  document.getElementById('movie-title').value  = item.title;
  document.getElementById('movie-year').value   = item.year || '';
  document.getElementById('movie-poster').value = item.poster || '';
  document.getElementById('movie-genre').value  = item.genre  || '';
  document.getElementById('movie-runtime').value = item.runtime || '';
  document.getElementById('movie-director').value = item.director || '';
  document.getElementById('movie-actors').value   = item.actors || ''; 
  
  searchEl.value = item.title;
  document.getElementById('view-date').value     = item.date  || '';
  document.getElementById('review-text').value   = item.review || '';
  isLiked = item.liked || false;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);

  activeContextTags = new Set(item.contextTags || []);
  document.querySelectorAll('.ctx-tag').forEach(b => {
    if (activeContextTags.has(b.dataset.tag)) b.classList.add('active');
    else b.classList.remove('active');
  });

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = item.title;
  
  document.getElementById('strip-genre').innerHTML = buildStripMeta({
    genre: item.genre, runtime: item.runtime, year: item.year,
    director: item.director, actors: item.actors
  });

  if (item.poster) {
    document.getElementById('strip-poster').src = item.poster;
    document.getElementById('strip-poster').style.display = 'block';
  }

  if (item.mode === 'quick' && item.values?.quick !== undefined) {
    setMode('quick');
    quickRating = parseFloat(item.values.quick);
    const radioId = 's' + (quickRating * 2); 
    const radioEl = document.getElementById(radioId);
    if(radioEl) radioEl.checked = true; 
  } else {
    setMode('detail');
    CRITERIA.forEach(c => {
      document.getElementById(c).value = item.values && item.values[c] !== undefined ? item.values[c] : 5;
    });
  }

  calculateScore();
  saveDraft(); 
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

