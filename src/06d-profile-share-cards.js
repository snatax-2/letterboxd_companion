// ═══════════════════════════════════════════
//  PROFIL — cartes à partager (dessin sur <canvas>)
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre le
// dessin sur <canvas> des images à télécharger/partager : la carte de
// profil ("Mon profil cinéphile") et la rétrospective annuelle
// ("Wrapped"). Les données qu'elles affichent sont calculées dans
// 06c-profile-stats.js.

function drawMiniRadarOnCanvas(ctx, cx, cy, radius, criteriaAverages, color, gridColor) {
  const keys = CRITERIA;
  const angleStep = (Math.PI * 2) / keys.length;

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  keys.forEach((k, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  keys.forEach((k, i) => {
    const val = criteriaAverages[k] || 0;
    const r = (val / 10) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Bande de perforations façon pellicule de film — juste décoratif, en haut et
// en bas de la carte, pour ancrer visuellement le thème "cinéma".
function drawFilmStripBand(ctx, y, w, color) {
  const holeW = 10, holeH = 6, gap = 8;
  ctx.fillStyle = color;
  for (let x = gap; x < w - gap; x += holeW + gap) {
    ctx.fillRect(x, y, holeW, holeH);
  }
}

function drawProfileShareCard(data) {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // certains environnements restrictifs renvoient null plutôt que de lever une erreur
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const gold = styles.getPropertyValue('--gold').trim() || accent;
  const border = styles.getPropertyValue('--border').trim() || '#333';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  // Fond en léger dégradé (pas un simple aplat) pour donner un peu de profondeur.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  drawFilmStripBand(ctx, 10, w, accent);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 26px "${fontHeading}", sans-serif`;
  ctx.fillText('LUDEX', w / 2, 52);
  ctx.fillStyle = textMid;
  ctx.font = `12px "${fontHeading}", sans-serif`;
  ctx.fillText('MON PROFIL CINÉPHILE', w / 2, 72);

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = textMid;
    ctx.font = '15px sans-serif';
    ctx.fillText('Note quelques films pour', w / 2, h / 2 - 8);
    ctx.fillText('débloquer ta carte de profil', w / 2, h / 2 + 16);
    drawFilmStripBand(ctx, h - 16, w, accent);
    return;
  }

  const { history, totalMinutes, memberSinceStr, topActor, topGenre, criteriaAverages, badges } = data;
  const avg = history.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0) / history.length;

  // Chiffre "héros" : le nombre de films, en très grand, façon Wrapped.
  ctx.fillStyle = textHi;
  ctx.font = `900 68px "${fontHeading}", sans-serif`;
  ctx.fillText(String(history.length), w / 2, 148);
  ctx.fillStyle = textMid;
  ctx.font = `bold 12px "${fontHeading}", sans-serif`;
  ctx.fillText('FILMS NOTÉS', w / 2, 168);

  // Note moyenne, mise en avant juste en dessous.
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`★ ${avg.toFixed(1)}/10 de moyenne`, w / 2, 196);

  // Mini-radar (mode détaillé utilisé) ou, à défaut, un genre/acteur mis en avant.
  if (criteriaAverages) {
    drawMiniRadarOnCanvas(ctx, w / 2, 275, 65, criteriaAverages, accent, border);
  } else {
    ctx.fillStyle = textMid;
    ctx.font = '13px sans-serif';
    ctx.fillText('Utilise le mode Détaillé pour', w / 2, 260);
    ctx.fillText('débloquer ton profil de goûts (radar)', w / 2, 280);
  }

  // Genre et acteur favoris, côte à côte.
  ctx.font = '11px sans-serif';
  ctx.fillStyle = textMid;
  ctx.fillText('GENRE FAVORI', w * 0.28, 345);
  ctx.fillText('ACTEUR FAVORI', w * 0.72, 345);
  ctx.fillStyle = textHi;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(topGenre || '—', w * 0.28, 365);
  ctx.fillText(topActor || '—', w * 0.72, 365);

  // Badges débloqués : jusqu'à 6 pastilles, pleines si débloquées.
  const unlocked = (badges || []).filter(b => b.unlocked).slice(0, 6);
  const badgeY = 400;
  const badgeR = 14;
  const totalBadgeWidth = unlocked.length * (badgeR * 2 + 10) - 10;
  let bx = w / 2 - totalBadgeWidth / 2 + badgeR;
  unlocked.forEach(() => {
    ctx.beginPath();
    ctx.arc(bx, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    bx += badgeR * 2 + 10;
  });
  if (unlocked.length > 0) {
    ctx.fillStyle = textMid;
    ctx.font = '10px sans-serif';
    ctx.fillText(`${unlocked.length} badge${unlocked.length > 1 ? 's' : ''} débloqué${unlocked.length > 1 ? 's' : ''}`, w / 2, badgeY + 32);
  }

  // Pied de carte : membre depuis + temps visionné.
  ctx.fillStyle = textMid;
  ctx.font = '11px sans-serif';
  ctx.fillText(`Membre depuis ${memberSinceStr || '—'} · ${formatWatchTime(totalMinutes)} de films`, w / 2, h - 26);

  drawFilmStripBand(ctx, h - 16, w, accent);
}

// Ludex 2.0 : partage natif (Web Share API) quand le navigateur le permet —
// repli sur le téléchargement classique sinon (desktop, ou navigateurs qui
// ne supportent pas le partage de FICHIERS spécifiquement, distinct du
// partage de simple texte/lien que beaucoup supportent déjà). .toBlob() +
// File plutôt que .toDataURL() seul : c'est ce qui permet de partager une
// vraie image, pas juste un lien vers elle.
document.getElementById('profile-share-btn').addEventListener('click', () => {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
    showToast("Ton navigateur ne permet pas de générer cette image.");
    return;
  }
  canvas.toBlob(async (blob) => {
    if (!blob) { showToast("Impossible de générer l'image."); return; }
    const file = new File([blob], 'ludex-profil.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ma carte de profil Ludex' });
        return; // partage réussi, rien de plus à faire
      } catch {
        if (e.name === 'AbortError') return; // l'utilisateur a juste annulé — pas une erreur à signaler
        // toute autre erreur (rare) : on retombe sur le téléchargement classique ci-dessous
      }
    }
    const link = document.createElement('a');
    link.download = 'ludex-profil.png';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Image téléchargée.');
  }, 'image/png');
});

// ═══════════════════════════════════════════
//  RÉTROSPECTIVE ANNUELLE ("WRAPPED")
// ═══════════════════════════════════════════
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatMonthLabel(monthKey) {
  // monthKey au format "2026-03"
  const [y, m] = monthKey.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// Année à retenir par défaut : la plus récente qui a des films notés (pas
// forcément l'année civile en cours, si l'utilisateur vient de commencer ou
// n'a rien noté depuis un moment).
function getWrappedDefaultYear(history) {
  const years = history
    .map(h => { const d = h.savedAt || h.date; return d ? parseInt(d.slice(0, 4), 10) : null; })
    .filter(Boolean);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
}

function buildWrappedSlides(stats) {
  const slides = [];

  slides.push(`
    <div class="wrapped-slide-eyebrow">Ton année ${stats.year}</div>
    <div class="wrapped-slide-big">${stats.totalFilms}</div>
    <div class="wrapped-slide-label">film${stats.totalFilms > 1 ? 's' : ''} noté${stats.totalFilms > 1 ? 's' : ''}</div>
    <div class="wrapped-slide-detail">Voyons ce que ${stats.totalFilms > 1 ? 'ces films disent' : 'ce film dit'} de ton année cinéma...</div>
  `);

  if (stats.topGenre || stats.topDirector) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Tes habitudes</div>
      ${stats.topGenre ? `<div class="wrapped-slide-label">🎭 Genre favori : ${escAttr(stats.topGenre.name)}</div><div class="wrapped-slide-detail">${stats.topGenre.count} film${stats.topGenre.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.topDirector ? `<div class="wrapped-slide-label" style="margin-top:22px;">🎬 Réalisateur favori : ${escAttr(stats.topDirector.name)}</div><div class="wrapped-slide-detail">${stats.topDirector.count} film${stats.topDirector.count > 1 ? 's' : ''}</div>` : ''}
    `);
  }

  if (stats.topMonth || stats.bestRated) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Les temps forts</div>
      ${stats.topMonth ? `<div class="wrapped-slide-label">📅 Mois le plus actif</div><div class="wrapped-slide-detail">${formatMonthLabel(stats.topMonth.name)} — ${stats.topMonth.count} film${stats.topMonth.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.bestRated ? `<div class="wrapped-slide-label" style="margin-top:22px;">⭐ Ton coup de cœur</div><div class="wrapped-slide-detail">${escAttr(stats.bestRated.title)} — ${stats.bestRated.score}/10</div>` : ''}
    `);
  }

  slides.push(`
    <div class="wrapped-slide-eyebrow">Le récap'</div>
    <div class="wrapped-slide-big" style="font-size:2.2rem;">${stats.avgScore.toFixed(1)}<span style="font-size:1.2rem;color:var(--text-mid);">/10</span></div>
    <div class="wrapped-slide-label">note moyenne de l'année</div>
    <div class="wrapped-slide-detail">${formatWatchTime(stats.totalMinutes)} passées devant l'écran</div>
  `);

  slides.push(`
    <div class="wrapped-slide-eyebrow">À partager</div>
    <div class="wrapped-share-canvas-wrap"><canvas id="wrapped-share-canvas" width="360" height="480"></canvas></div>
    <button type="button" class="wrapped-share-btn" id="wrapped-share-download-btn">Télécharger l'image</button>
  `);

  return slides;
}

function drawWrappedShareCard(stats) {
  const canvas = document.getElementById('wrapped-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 24px "${fontHeading}", sans-serif`;
  ctx.fillText(`LUDEX WRAPPED ${stats.year}`, w / 2, 55);

  ctx.fillStyle = textHi;
  ctx.font = `900 80px "${fontHeading}", sans-serif`;
  ctx.fillText(String(stats.totalFilms), w / 2, 175);
  ctx.fillStyle = textMid;
  ctx.font = `bold 13px "${fontHeading}", sans-serif`;
  ctx.fillText(`FILM${stats.totalFilms > 1 ? 'S' : ''} EN ${stats.year}`, w / 2, 198);

  const rows = [
    ['Note moyenne', `${stats.avgScore.toFixed(1)}/10`],
    ['Genre favori', stats.topGenre?.name || '—'],
    ['Réalisateur favori', stats.topDirector?.name || '—'],
    ['Coup de cœur', stats.bestRated?.title || '—'],
    ['Temps visionné', formatWatchTime(stats.totalMinutes)],
  ];
  let y = 250;
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = textMid;
    ctx.font = '11px sans-serif';
    ctx.fillText(label.toUpperCase(), 30, y);
    ctx.fillStyle = textHi;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(val, 30, y + 22);
    y += 46;
  });
}

(function initWrappedModal() {
  const modal = document.getElementById('wrapped-modal');
  const entryCard = document.getElementById('wrapped-entry-card');
  const closeBtn = document.getElementById('wrapped-close-btn');
  const slidesEl = document.getElementById('wrapped-slides');
  const dotsEl = document.getElementById('wrapped-dots');
  const prevBtn = document.getElementById('wrapped-prev-btn');
  const nextBtn = document.getElementById('wrapped-next-btn');
  if (!modal || !entryCard) return;

  let slides = [];
  let current = 0;

  function renderCurrentSlide() {
    slidesEl.innerHTML = slides.map((html, i) =>
      `<div class="wrapped-slide${i === current ? ' active' : ''}${i < current ? ' leaving-left' : ''}">${html}</div>`
    ).join('');
    dotsEl.innerHTML = slides.map((_, i) => `<span class="onboarding-dot${i === current ? ' active' : ''}"></span>`).join('');
    prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === slides.length - 1 ? 'Fermer' : 'Suivant';

    if (current === slides.length - 1) {
      const shareBtn = document.getElementById('wrapped-share-download-btn');
      drawWrappedShareCard(window._currentWrappedStats);
      shareBtn?.addEventListener('click', () => {
        const canvas = document.getElementById('wrapped-share-canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ludex-wrapped-${window._currentWrappedStats.year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Image téléchargée.');
      });
    }
  }

  entryCard.addEventListener('click', () => {
    const history = loadHistory();
    const year = getWrappedDefaultYear(history);
    const stats = computeWrappedStats(history, year);
    window._currentWrappedStats = stats;
    slides = buildWrappedSlides(stats);
    current = 0;
    renderCurrentSlide();
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    closeBtn.focus();
  });

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { closeModal(modal); return; }
    current++;
    renderCurrentSlide();
  });
  prevBtn.addEventListener('click', () => {
    if (current === 0) return;
    current--;
    renderCurrentSlide();
  });
  closeBtn.addEventListener('click', () => closeModal(modal));
})();

