// L'encart "Activité mensuelle" du profil (renderMonthlyActivityChart,
// src/06c-profile-stats.js) affiche deux séries — films et séries — dans le
// même graphique en barres. Bug réel trouvé et corrigé : dans le thème par
// défaut, .month-chart-bar.movie et .tv utilisaient directement var(--gold)
// et var(--blue), qui valent LA MÊME chose dans ce thème (--orange: --gold:
// --blue: #C89B3C — un seul accent, délibéré, partagé par 26 autres usages).
// Les deux séries du graphique rendaient donc la même couleur, totalement
// indiscernables (capture d'écran à l'appui avant correction).
//
// Corrigé en introduisant --chart-movie/--chart-tv, des jetons dédiés au
// graphique, séparés des jetons d'accent — pour ne plus dépendre
// silencieusement de --blue si son usage en accent change un jour.

const { test, expect } = require('@playwright/test');

function seedHistory() {
  const now = new Date();
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
    return {
      title: `Film ${i}`, year: '2020', score: '7.0', mode: 'quick', values: { quick: 3.5 },
      date: d.toISOString().slice(0, 10), savedAt: d.toISOString(),
    };
  });
}
function seedTvShows() {
  const now = new Date();
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 12);
    return {
      tmdbTvId: 100 + i, title: `Serie ${i}`, poster_path: '',
      seasons: { '1': { seasonName: 'S1', watchedEpisodes: [1], totalEpisodes: 8,
        rating: { mode: 'quick', score: '8.0', date: d.toISOString() } } },
    };
  });
}

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`les barres films et series du graphique sont visuellement distinctes - ${theme}`, async ({ page }) => {
    await page.addInitScript((d) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: d.t }));
      localStorage.setItem('lbx_v2', JSON.stringify(d.h));
      localStorage.setItem('lbx_tv_shows', JSON.stringify(d.tv));
    }, { t: theme, h: seedHistory(), tv: seedTvShows() });
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-profile');
    await page.waitForTimeout(900);

    const couleurs = await page.evaluate(() => {
      const movie = document.querySelector('.month-chart-bar.movie');
      const tv = document.querySelector('.month-chart-bar.tv');
      return {
        movie: movie ? getComputedStyle(movie).backgroundColor : null,
        tv: tv ? getComputedStyle(tv).backgroundColor : null,
      };
    });
    expect(couleurs.movie).toBeTruthy();
    expect(couleurs.tv).toBeTruthy();
    expect(couleurs.movie, `films: ${couleurs.movie} vs series: ${couleurs.tv}`).not.toBe(couleurs.tv);
  });
}
