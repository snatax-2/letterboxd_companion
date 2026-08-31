// Brouillons indépendants : une clé par cible évite qu'un autre onglet ou
// un film ne remplace une saison. Aucun brouillon n'écrit dans les notes.
let ratingDraftRestoreDepth = 0;
let tvRatingSource = null;
let tvDraftInitial = '';
const TV_DRAFT_PREFIX = 'lbx_tv_rating_draft_';

function withRatingDraftRestore(fn) {
  ratingDraftRestoreDepth++;
  try { return fn(); } finally { ratingDraftRestoreDepth--; }
}
function tvDraftKey(showId, seasonKey) { return `${showId}:${seasonKey}`; }
function tvRatingSourceOf(show, season) {
  return { show: show?._sync?.createdAt || '', season: season?._sync?.createdAt || '', rating: tvStableJson(season?.rating) };
}
function tvDraftForm() {
  return { inputs: readTvRatingInputs(), review: document.getElementById('review-text').value,
    date: document.getElementById('tv-view-date').value };
}
function clearTvRatingDraft(key) {
  // Une marque vide conserve la priorité locale lors d'une restauration cloud.
  return writeJsonStorage(TV_DRAFT_PREFIX + key, { cleared: true });
}
function saveTvRatingDraft() {
  if (!selectedShow || selectedSeasonNumber == null || document.getElementById('notation-card').style.display === 'none') return;
  const key = tvDraftKey(selectedShow.id, selectedSeasonNumber);
  const form = tvDraftForm();
  writeTextStorage('lbx_tv_rating_last', key);
  if (tvStableJson(form) === tvDraftInitial) {
    if (readJsonStorage(TV_DRAFT_PREFIX + key, null)?.form) clearTvRatingDraft(key);
    return;
  }
  if (!writeJsonStorage(TV_DRAFT_PREFIX + key, { form, source: tvRatingSource, baseline: tvRatingFormBaseline, initial: tvDraftInitial })) {
    showToast('Brouillon non sauvegardé : stockage local indisponible.');
  }
}
function restoreTvRatingDraft() {
  const key = tvDraftKey(selectedShow.id, selectedSeasonNumber);
  writeTextStorage('lbx_tv_rating_last', key);
  const draft = readJsonStorage(TV_DRAFT_PREFIX + key, null, isValidTvDraft);
  if (!draft?.form || draft.source?.show !== tvRatingSource?.show || draft.source?.season !== tvRatingSource?.season) return;
  withRatingDraftRestore(() => {
    const { inputs, review, date } = draft.form;
    setMode(inputs.mode);
    CRITERIA.forEach(c => {
      document.getElementById(c).value = inputs.values?.[c] ?? 5;
      document.getElementById(`w-${c}`).value = inputs.weights?.[c] ?? 1;
    });
    quickRating = inputs.mode === 'quick' ? Number(inputs.values.quick) : 2.5;
    document.querySelectorAll('#quick-stars-container input').forEach(el => { el.checked = Number(el.value) === quickRating; });
    document.getElementById('review-text').value = review || '';
    document.getElementById('tv-view-date').value = date || tvToday();
    tvRatingSource = draft.source;
    tvRatingFormBaseline = draft.baseline;
    tvDraftInitial = draft.initial || '';
    updateWeightBadges(); updateAllSliders(); updateQuickLabel(); calculateScore();
  });
}
function resumeLastTvDraft() {
  const key = localStorage.getItem('lbx_tv_rating_last');
  if (!/^\d+:\d+$/.test(key || '')) return;
  const [id, season] = key.split(':');
  reopenTvSeason(id, season);
}
function collectTvRatingDrafts() {
  const result = {};
  for (const key of Object.keys(localStorage).filter(k => k.startsWith(TV_DRAFT_PREFIX))) {
    const id = key.slice(TV_DRAFT_PREFIX.length);
    if (/^\d+:\d+$/.test(id)) result[id] = readJsonStorage(key, null, isStorageObject);
  }
  return result;
}
function ratingDraftSnapshot() {
  const movie = readRegisteredStorage('draft', null);
  const tvDrafts = collectTvRatingDrafts();
  return Object.keys(tvDrafts).length ? { ...movie, tvDrafts } : movie;
}
function importTvRatingDrafts(drafts) {
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) return;
  for (const [key, draft] of Object.entries(drafts)) {
    if (!/^\d+:\d+$/.test(key) || !isValidTvDraft(draft)) continue;
    if (localStorage.getItem(TV_DRAFT_PREFIX + key) === null) writeJsonStorage(TV_DRAFT_PREFIX + key, draft);
  }
}
function isValidTvDraft(draft) {
  if (!isStorageObject(draft)) return false;
  if (draft.cleared === true) return true;
  const inputs = draft.form?.inputs;
  const numeric = (object, max) => isStorageObject(object) && Object.values(object).every(v => v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max);
  return !!inputs && ['quick', 'detail'].includes(inputs.mode) && numeric(inputs.values, inputs.mode === 'quick' ? 5 : 10)
    && (inputs.mode === 'quick' || numeric(inputs.weights, Infinity)) && isStorageObject(draft.source)
    && typeof draft.form.review === 'string' && typeof draft.form.date === 'string';
}
document.getElementById('tv-view-date').addEventListener('change', saveDraft);
