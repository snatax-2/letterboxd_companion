const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Historique — parité films/séries : filtre par note (branche sur
// l'infrastructure déjà existante), suppression d'une seule saison (avec
// cas particulier si c'est la dernière -> retire toute la série).
//
// Ludex 2.0 : la gestion par saison (rouvrir/supprimer) a migré de l'ancien
// panneau extensible de la carte Historique vers la fiche détail de la
// série (voir buildSeasonProgressionSection, 19-tv-detail.js) — ces tests
// naviguent donc désormais via un clic sur la carte (ouvre la fiche) plutôt
// que via ".tv-show-seasons-fold summary", qui n'existe plus.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 2200 });
  await page.addInitScript(() => localStorage.setItem('lbx_onboarding_seen', '1'));
  await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
});

// ── LE FILTRE PAR NOTE N'EST PLUS ATTEIGNABLE ──────────────────────────
// Ce test cliquait une barre de l'histogramme "Distribution des notes" du
// profil (.histo-row) pour filtrer sur la tranche 9-10. Cet histogramme a
// été retiré en Ludex 2.0 (voir le commentaire d'index.html au-dessus de
// "Activité mensuelle", qui le remplace).
//
// C'était le SEUL point d'entrée de ce filtre. Vérifié dans le app.js
// construit : `activeScoreFilter` n'est jamais affecté à autre chose que
// null nulle part. Toute la mécanique existe encore et est correcte
// (SCORE_RANGES, isScoreInActiveRange, les branches de filtrage côté films
// ET séries, le badge qui vire à l'orange) — mais plus rien ne peut
// l'activer. La capacité elle-même est donc perdue, pas seulement son
// interface. C'est signalé comme trouvaille, pas corrigé ici : rétablir un
// point d'entrée est une décision produit.
//
// Ce que ce test vérifiait vraiment — qu'un filtre de l'historique
// s'applique AUSSI aux séries et que le badge de comptage le reflète —
// reste vérifiable sur le filtre "Coups de cœur", lui bien atteignable
// (#hist-liked-filter-btn).
test('un filtre de l\'historique s\'applique aussi aux series, badge reflete le filtrage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      {
        tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
        seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.0', stars: '', review: '', date: '2026-01-01T00:00:00.000Z' } },
          '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '4.0', stars: '', review: '', date: '2026-01-02T00:00:00.000Z' } },
        },
      },
      {
        tmdbTvId: 66732, title: 'Stranger Things', poster_path: '/p2.jpg', liked: true,
        seasons: { '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8, rating: { mode: 'detail', values: {}, score: '9.5', stars: '', review: '', date: '2026-01-03T00:00:00.000Z' } } },
      },
    ]));
  });

  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(400);

  // Sans filtre : les deux series sont la.
  await expect(page.locator('#tv-history-list .tv-show-card-open-btn')).toHaveCount(2);

  await page.click('#hist-liked-filter-btn');
  await page.waitForTimeout(400);

  // Seule Stranger Things est marquee "coup de coeur" (voir le seed).
  // Ludex 2.0 : plus de texte visible sur la carte (grille de posters) —
  // le titre vit dans aria-label de .tv-show-card-open-btn.
  const labels = await page.locator('#tv-history-list .tv-show-card-open-btn').evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
  expect(labels.some(l => l.includes('Stranger Things'))).toBe(true);
  expect(labels.some(l => l.includes('True Detective'))).toBe(false);
  await expect(page.locator('#hist-count-badge')).toContainText('1 / 2 série');
});

test('supprimer une seule saison depuis la fiche détail ne touche pas aux autres', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  // Route spécifique à la fiche détail (id=4607) : le mock générique du
  // beforeEach ({results:[]}) ferait échouer openTvDetailSheet (elle exige
  // data.name) et afficherait son état d'erreur plutôt que la vraie fiche.
  await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    genres: [], credits: { crew: [], cast: [] }, external_ids: {},
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);

  // 97ae807 : plus de <details> par saison (.tds-season-details) — des
  // onglets, et une seule ligne d'état avec ses actions pour la saison
  // active. Il faut donc sélectionner la saison 2 avant de la retirer.
  await page.click('.tds-season-tab[data-season-number="2"]');
  await page.waitForTimeout(300);
  await page.click('.tds-season-delete-btn[data-season-key="2"]');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(Object.keys(stored[0].seasons)).toEqual(['1']);
  expect(stored).toHaveLength(1); // la serie reste, il lui restait une saison
});

test('supprimer la derniere saison retire toute la serie, avec message adapte', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lbx_tv_shows', JSON.stringify([
      { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
      } },
    ]));
  });
  await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    genres: [], credits: { crew: [], cast: [] }, external_ids: {},
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }],
  } }));
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.click('#nav-history');
  await page.waitForTimeout(400);
  await page.click('#hist-tab-tv');
  await page.waitForTimeout(300);
  await page.click('.tv-show-card-open-btn');
  await page.waitForSelector('#tv-detail-sheet.open');
  await page.waitForTimeout(400);

  await page.click('.tds-season-delete-btn');
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await expect(page.locator('#modal-body')).toContainText('retire toute la série');
  await page.click('#modal-confirm');
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
  expect(stored).toHaveLength(0);
  await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(0);
});

for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
  test(`accessibilite suppression de saison - ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      localStorage.setItem('lbx_tv_shows', JSON.stringify([
        { tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg', seasons: {
          '1': { seasonName: 'Saison 1', watchedEpisodes: [1], totalEpisodes: 8 },
          '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
        } },
      ]));
    }, theme);
    await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: {
      id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
      genres: [], credits: { crew: [], cast: [] }, external_ids: {},
      seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
    } }));
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    await page.click('.tv-show-card-open-btn');
    await page.waitForSelector('#tv-detail-sheet.open');
    await page.waitForTimeout(400);
    await page.click('.tds-season-delete-btn >> nth=0');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    // Attend la FIN du fondu d'ouverture avant de mesurer. #modal.open devient
    // "visible" dès que la boîte a une aire non nulle, mais l'overlay ET la
    // boîte sont encore en transition d'opacité (voir styles.css).
    // axe-core mesurait donc le contraste sur une couleur MÉLANGÉE avec le
    // fond, et rapportait 4.32:1 (Carnet) et 4.49:1 (Technicolor) là où la
    // palette réelle donne 4.70 et 4.66 — au-dessus du seuil de 4.5. Deux
    // faux positifs, uniquement sur le CI (assez lent pour que le scan tombe
    // en plein fondu) et jamais en local : c'est le test qui mesurait trop
    // tôt, pas les couleurs qui étaient fautives.
    await page.waitForFunction(
      () => {
        const overlay = document.querySelector('#modal');
        const boite = document.querySelector('#modal .modal-box');
        // Les DEUX doivent être à pleine opacité : l'overlay a sa propre
        // transition (--dur-base) et composite tout son contenu, donc une
        // boîte déjà opaque reste mélangée avec le fond tant que l'overlay
        // ne l'est pas. Mesuré : axe voyait #cc2836 au lieu de #DF2935.
        return overlay && boite
          && getComputedStyle(overlay).opacity === '1'
          && getComputedStyle(boite).opacity === '1';
      },
      undefined,
      { timeout: 5000 },
    );
    const results = await new AxeBuilder({ page }).include('#modal').analyze();
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  Fusionné depuis tv-shows-phase4.spec.js (renommage par comportement,
//  phase 6 de l'audit) — badge à deux compteurs, note globale de carte,
//  réouverture d'une saison depuis la fiche détail, suppression d'une série.
//
// 97ae807 a remplacé les <details> dépliables par saison
// (.tds-season-details + <summary>) par des onglets (.tds-season-tab) et
// une seule ligne d'état pour la saison active. Ludex 2.0 : passage en
// grille de posters — la liste de saisons dépliable et la réouverture
// d'une saison ont migré vers la fiche détail (voir
// buildSeasonProgressionSection, 19-tv-detail.js), donc ces tests ouvrent
// désormais la fiche (clic sur la carte) plutôt que ".tv-show-seasons-fold".

test.describe('Badge, note de carte, réouverture et suppression', () => {
  const BADGE_TV_FIXTURE = [
    {
      tmdbTvId: 4607, title: 'True Detective', poster_path: '/p1.jpg',
      seasons: {
        '1': { seasonName: 'Saison 1', watchedEpisodes: [1, 2, 3], totalEpisodes: 8, rating: {
          mode: 'detail',
          values: { scenario: '9', realisation: '9', photo: '9', acteurs: '9', ambiance: '9', rythme: '9', affect: '9' },
          score: '9.0', stars: '★★★★½', review: '', date: '2026-01-01T00:00:00.000Z',
        } },
        '2': { seasonName: 'Saison 2', watchedEpisodes: [1], totalEpisodes: 8 },
      },
    },
  ];

  const BADGE_TV_DETAIL_FIXTURE = {
    id: 4607, name: 'True Detective', poster_path: '/p1.jpg', first_air_date: '2014-01-12',
    genres: [], credits: { crew: [], cast: [] }, external_ids: {},
    seasons: [{ season_number: 1, name: 'Saison 1', episode_count: 8 }, { season_number: 2, name: 'Saison 2', episode_count: 8 }],
  };

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1600 });
    await page.addInitScript((fixture) => {
      localStorage.setItem('lbx_onboarding_seen', '1');
      localStorage.setItem('lbx_v2', JSON.stringify([
        { title: 'Film Test', tmdbId: '1', year: '2020', score: '7.5', mode: 'quick', values: { quick: 3.75 }, date: '2026-01-01', savedAt: '2026-01-01T10:00:00.000Z', poster: '' },
      ]));
      localStorage.setItem('lbx_tv_shows', JSON.stringify(fixture));
    }, BADGE_TV_FIXTURE);
    await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
    await page.route('**/api/search?tvId=4607*', route => route.fulfill({ json: BADGE_TV_DETAIL_FIXTURE }));
  });

  async function goToTvHistory(page) {
    await page.goto('/');
    await page.waitForTimeout(1400); // ecran de demarrage, duree minimale volontaire
    await page.click('#nav-history');
    await page.waitForTimeout(400);
    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
  }

  test('badge affiche les deux comptes, films par defaut, bascule vers series', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.click('#nav-history');
    await page.waitForTimeout(400);

    const badgeText = await page.locator('#hist-count-badge').textContent();
    expect(badgeText).toContain('1 film');
    expect(badgeText).toContain('1 série');
    await expect(page.locator('#history-list')).toBeVisible();
    await expect(page.locator('#tv-history-list')).toBeHidden();

    await page.click('#hist-tab-tv');
    await page.waitForTimeout(300);
    await expect(page.locator('#history-list')).toBeHidden();
    await expect(page.locator('#tv-history-list')).toBeVisible();
    await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(1);
  });

  test('carte de serie : note globale correcte, fiche détail montre les 2 saisons', async ({ page }) => {
    await goToTvHistory(page);
    // Ludex 2.0 : la note vit dans le badge superposé sur l'affiche.
    const cardScore = await page.locator('#tv-history-list .hist-grid-badge').textContent();
    expect(cardScore.trim()).toBe('9.0'); // 1 seule saison notee -> moyenne = sa propre note

    await page.click('.tv-show-card-open-btn');
    await page.waitForSelector('#tv-detail-sheet.open');
    await page.waitForTimeout(400);
    await expect(page.locator('.tds-season-tab')).toHaveCount(2);
    // Une seule ligne d'état est affichée à la fois : il faut sélectionner
    // l'onglet de la saison 2 pour lire sa progression.
    await page.click('.tds-season-tab[data-season-number="2"]');
    await page.waitForTimeout(300);
    await expect(page.locator('.tds-season-status').first()).toContainText('1/8 ép');
  });

  test('reouvrir une saison depuis la fiche détail repeuple le formulaire avec la vraie note', async ({ page }) => {
    await goToTvHistory(page);
    await page.click('.tv-show-card-open-btn');
    await page.waitForSelector('#tv-detail-sheet.open');
    await page.waitForTimeout(400);
    await page.click('.tds-season-tab[data-season-number="1"]'); // saison 1, notee
    await page.waitForTimeout(300);
    await page.click('.tds-season-reopen-btn');
    await page.waitForTimeout(400);

    await expect(page.locator('#tab-media-tv')).toHaveClass(/active/);
    await expect(page.locator('#scenario')).toHaveValue('9'); // pas la valeur neutre 5
  });

  test('supprimer une serie retire la carte et met a jour le badge', async ({ page }) => {
    await goToTvHistory(page);
    await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(1);

    await page.click('.tv-show-delete-btn');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.click('#modal-confirm');
    await page.waitForTimeout(300);

    await expect(page.locator('#tv-history-list .hist-grid-card')).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lbx_tv_shows')));
    expect(stored).toHaveLength(0);
    await expect(page.locator('#hist-count-badge')).toContainText('0 série');
  });

  for (const theme of ['default', 'carnet', 'filmnoir', 'cinephile', 'moderne', 'technicolor']) {
    test(`accessibilite historique series (badge/note/suppression) - ${theme}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('lbx_settings', JSON.stringify({ theme: t })), theme);
      await goToTvHistory(page);
      await page.click('.tv-show-card-open-btn');
      await page.waitForSelector('#tv-detail-sheet.open');
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      expect(bad, JSON.stringify(bad.map(v => v.id))).toHaveLength(0);
    });
  }
});
