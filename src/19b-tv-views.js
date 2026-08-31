// Projections Séries : une invalidation après commit, quelle que soit l'origine
// (geste, note, import, cloud, autre onglet). Aucun rendu n'écrit de suivi.
let tvViewsRefreshTimer = null;
let tvViewsDataDirty = false;
let tvViewsChangedIds = new Set();
let tvViewsAllDirty = false;

function notifyTvViewsChanged(ids = null, source = 'local') {
  document.dispatchEvent(new CustomEvent('ludex:tv-changed', { detail: { ids, source } }));
}

function scheduleTvViewsRefresh({ ids = null, source = 'local' } = {}) {
  tvViewsDataDirty ||= source !== 'catalogue';
  if (ids === null) tvViewsAllDirty = true;
  else ids.forEach(id => tvViewsChangedIds.add(String(id)));
  // Invalider immédiatement les réponses déjà en vol, avant le rendu regroupé.
  tvContinueRenderVersion++;
  if (ids === null || ids.some(id => String(id) === String(tdsCurrentData?.id))) tdsUpNextVersion++;
  if (source !== 'catalogue') {
    statsDirty = true;
    profileWatchTimeVersion++;
  }
  if (tvViewsRefreshTimer === null) tvViewsRefreshTimer = setTimeout(flushTvViewsRefresh, 0);
}

function flushTvViewsRefresh() {
  if (tvViewsRefreshTimer !== null) clearTimeout(tvViewsRefreshTimer);
  tvViewsRefreshTimer = null;
  const dataChanged = tvViewsDataDirty;
  const refreshDetail = tvViewsAllDirty || tvViewsChangedIds.has(String(tdsCurrentData?.id));
  tvViewsDataDirty = false;
  tvViewsAllDirty = false;
  tvViewsChangedIds = new Set();
  // Une erreur de projection ne doit jamais faire passer une écriture validée
  // pour un échec ni empêcher les autres écrans de se mettre à jour.
  const safely = fn => {
    try { Promise.resolve(fn()).catch(() => console.warn('[Ludex séries] Rafraîchissement différé impossible.')); }
    catch { console.warn('[Ludex séries] Rafraîchissement impossible.'); }
  };
  safely(() => { if (refreshDetail) return refreshOpenTvDetail(); });
  safely(() => renderTvContinueList());
  safely(() => { if (historyMediaFilter === 'tv') renderTvHistory(); });
  if (dataChanged) {
    safely(() => { refreshTvHeartBtnState(); refreshShowAverageDisplay(); });
    safely(() => {
      if (document.getElementById('view-profile')?.classList.contains('active')) {
        withTvViewState(document.getElementById('view-profile'), () => {
          renderProfileIfDirty();
        });
      }
    });
  }
}

document.addEventListener('ludex:tv-changed', event => scheduleTvViewsRefresh(event.detail));
window.addEventListener('storage', event => {
  if (event.storageArea && event.storageArea !== localStorage) return;
  const legacy = ['lbx_tv_shows', 'lbx_tv_show_tombstones', 'lbx_tv_season_tombstones'];
  if (event.key !== null && event.key !== 'lbx_tv_state_v2'
      && !(legacy.includes(event.key) && localStorage.getItem('lbx_tv_state_v2') === null)) return;
  if (event.key !== null && event.oldValue === event.newValue) return;
  // Le payload peut être dépassé par une deuxième écriture : les projections
  // relisent l'état courant. Les clés de compatibilité v1 ne font pas foi en v2.
  notifyTvViewsChanged(null, 'storage');
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleTvViewsRefresh();
});
window.addEventListener('pageshow', event => { if (event.persisted) scheduleTvViewsRefresh(); });
window.addEventListener('online', () => scheduleTvViewsRefresh());

// Remplacer uniquement les petits fragments dont le HTML a changé, en gardant
// le focus sémantique et la position de lecture. Jamais de focus volé ailleurs.
function tvElementIdentity(element) {
  if (element.id) return candidate => candidate.id === element.id;
  const tag = element.tagName;
  const className = element.classList[0];
  const data = Object.entries(element.dataset).filter(([key]) => key !== 'pending' && key !== 'locked');
  return candidate => candidate.tagName === tag && (!className || candidate.classList.contains(className))
    && data.every(([key, value]) => candidate.dataset[key] === value);
}

function withTvViewState(root, render) {
  if (!root) return render();
  const active = document.activeElement;
  const hadFocus = active && root.contains(active);
  const matchesFocus = hadFocus ? tvElementIdentity(active) : null;
  const scrolling = [root, ...root.querySelectorAll('*')];
  for (let parent = root.parentElement; parent; parent = parent.parentElement) scrolling.push(parent);
  const positions = scrolling.filter(el => el.scrollTop || el.scrollLeft)
    .map(el => ({ el, top: el.scrollTop, left: el.scrollLeft, matches: tvElementIdentity(el) }));
  const result = render();
  if (hadFocus && !active.isConnected) {
    const replacement = [...root.querySelectorAll(active.tagName)].find(matchesFocus);
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    else {
      // Ne pas envoyer le focus sur le bouton du NOUVEL épisode : une deuxième
      // pression sur Espace ne doit pas le valider accidentellement.
      const fallback = root.closest('#tv-detail-sheet')?.querySelector('#tds-close-btn')
        || (root.closest('#tv-continue-list') ? document.getElementById('tv-continue-toggle') : null);
      if (fallback) fallback.focus({ preventScroll: true });
    }
  }
  positions.forEach(({ el, top, left, matches }) => {
    const target = el.isConnected ? el : [...root.querySelectorAll('*')].find(matches);
    if (target) { target.scrollTop = top; target.scrollLeft = left; }
  });
  return result;
}

const tvViewHtml = new WeakMap();
function setTvViewHtml(root, html) {
  if (!root || tvViewHtml.get(root) === html) return;
  withTvViewState(root, () => { root.innerHTML = html; });
  tvViewHtml.set(root, html);
}
