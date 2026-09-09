// Liens directs des plateformes dans les fiches. TMDb et Watchmode n'écrivent
// pas toujours un même service de la même manière (« Apple TV » / « AppleTV »,
// « Amazon Prime Video » / « Prime Video ») : comparer une forme canonique
// évite que la pastille reste inerte alors que le lien est bien disponible.
function streamingProviderKey(name) {
  const raw = String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    amazon: 'primevideo',
    amazonprime: 'primevideo',
    amazonprimevideo: 'primevideo',
    primevideo: 'primevideo',
    appletv: 'appletv',
    appletvplus: 'appletv',
    disney: 'disneyplus',
    disneyplus: 'disneyplus',
    max: 'max',
    hbomax: 'max',
    canalplus: 'canalplus',
    googletv: 'googleplay',
    googleplaymovies: 'googleplay',
    googleplay: 'googleplay',
  };
  return aliases[raw] || raw;
}

async function fetchAndRenderProvidersWithLinks(tmdbId, targetElId, mediaType = 'movie') {
  const el = document.getElementById(targetElId);
  if (!el || !tmdbId) return;
  try {
    const [providersResult, linksResult] = await Promise.allSettled([
      fetch(`/api/search?id=${tmdbId}&providers=BE&mediaType=${mediaType}`),
      fetch(`/api/streaming-links?id=${tmdbId}&mediaType=${mediaType}&region=BE`),
    ]);
    if (providersResult.status !== 'fulfilled') throw providersResult.reason;
    const data = await providersResult.value.json();
    const directLinks = linksResult.status === 'fulfilled' && linksResult.value.ok
      ? (await linksResult.value.json()).links || []
      : [];
    const providerRoot = data['watch/providers']?.results?.BE || data.providers?.results?.BE || data.watchProviders?.BE || null;
    if (!providerRoot) { el.innerHTML = ''; el.style.display = 'none'; return; }

    const owned = loadOwnedProviders().map(normalizeProviderName);
    const filterOwned = list => owned.length === 0 ? list : list.filter(provider => {
      const normalized = normalizeProviderName(provider.provider_name);
      return owned.some(item => normalized.includes(item) || item.includes(normalized));
    });
    const allFlat = providerRoot.flatrate || [];
    const allRent = providerRoot.rent || [];
    const flat = filterOwned(allFlat);
    const rentOnly = filterOwned(allRent).filter(provider => !flat.find(item => item.provider_id === provider.provider_id));
    const providerLink = provider => directLinks.find(link => streamingProviderKey(link.name) === streamingProviderKey(provider.provider_name))?.url || '';
    const render = (provider, kind, suffix = '') => {
      const url = providerLink(provider);
      const content = `<img class="mds-provider-logo" src="${tmdbImage(provider.logo_path, 'original')}" alt="" loading="lazy">${escAttr(provider.provider_name)}${suffix}`;
      return url
        ? `<a class="mds-provider-pill ${kind}" style="text-decoration:none;cursor:pointer" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir ${escAttr(provider.provider_name)}">${content}<span aria-hidden="true">↗</span></a>`
        : `<span class="mds-provider-pill ${kind}">${content}</span>`;
    };
    let html = '';
    flat.slice(0, 5).forEach(provider => { html += render(provider, 'flatrate'); });
    rentOnly.slice(0, 3).forEach(provider => { html += render(provider, 'rent', ' (location)'); });
    if (!html) {
      const availableElsewhere = owned.length > 0 && (allFlat.length > 0 || allRent.length > 0);
      html = availableElsewhere
        ? '<span class="mds-provider-none">Disponible, mais pas sur tes plateformes</span>'
        : '<span class="mds-provider-none">Non disponible en streaming 🇧🇪</span>';
    }
    el.innerHTML = html;
    el.style.display = 'flex';
  } catch {
    el.style.display = 'none';
  }
}

// Le module chargé plus tôt garde l'affichage de disponibilité ; cette version
// ajoute seulement les destinations directes lorsque Watchmode en possède une.
window.fetchAndRenderProviders = fetchAndRenderProvidersWithLinks;
