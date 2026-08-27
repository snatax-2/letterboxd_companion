const { test, expect } = require('@playwright/test');

// Non-régression sur le système de design lui-même (phase 7 de l'audit) :
// vérifie sur les 6 thèmes que les jetons sémantiques restent RÉELLEMENT
// distincts et définis. C'est le filet qui manquait quand --gold et --blue
// se sont retrouvés identiques sur le thème par défaut, rendant le graphique
// d'activité mensuelle illisible (deux séries tracées dans la même couleur —
// corrigé en phase 4 par --chart-movie/--chart-tv, mais rien n'empêchait
// alors la même collision de se reproduire ailleurs).
//
// Ce test ne juge PAS l'esthétique : il vérifie des invariants structurels
// qu'aucun ajustement de palette ne doit casser en silence.

// Les deux thèmes de l'identité cible (ludex-dark / ludex-light) sont
// inclus dès leur introduction : c'est précisément sur eux que les
// invariants comptent le plus, puisque ce sont eux qui remplaceront les six
// autres à la fin de la migration.
const THEMES = ['ludex-dark', 'ludex-light', 'cinephile', 'technicolor'];

// Jetons qui doivent exister et ne jamais être vides, sur tous les thèmes.
const JETONS_REQUIS = [
  '--bg', '--surface', '--surface2', '--border', '--border-hi',
  '--text', '--text-hi', '--text-mid',
  '--gold', '--blue', '--red', '--green', '--orange',
  '--chart-movie', '--chart-tv',
  '--shadow-1', '--shadow-2', '--shadow-3',
  '--radius-pill', '--solid-fill-text',
  // Ajouté avec les thèmes Ludex : chaque SVG inline écrit
  // stroke-width="var(--icon-stroke, N)". Si le jeton disparaît d'un thème,
  // les icônes retombent silencieusement sur leur défaut littéral — un
  // mélange de 1.5 et de 2 selon l'icône, jamais cohérent.
  '--icon-stroke',
];

// Paires qui doivent rester visuellement distinctes. Chacune correspond à un
// endroit où deux valeurs identiques produisent une vraie perte d'information
// à l'écran, pas juste une maladresse de style.
const PAIRES_DISTINCTES = [
  ['--chart-movie', '--chart-tv'],   // les deux séries du graphique mensuel
  ['--bg', '--surface'],             // le fond des cartes doit se détacher de la page
  ['--surface', '--border'],         // le contour d'une carte doit se voir
  ['--text-hi', '--bg'],             // texte principal sur le fond
];

async function lireJetons(page, noms) {
  return page.evaluate((liste) => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const n of liste) out[n] = cs.getPropertyValue(n).trim();
    return out;
  }, noms);
}

// Résout une couleur CSS (y compris var(), color-mix(), noms) en RGB réel,
// en la faisant calculer par le navigateur plutôt qu'en la parsant à la main.
async function versRgb(page, valeur) {
  return page.evaluate((v) => {
    const sonde = document.createElement('span');
    sonde.style.color = v;
    document.body.appendChild(sonde);
    const rgb = getComputedStyle(sonde).color;
    sonde.remove();
    return rgb;
  }, valeur);
}

for (const theme of THEMES) {
  test.describe(`Jetons sémantiques — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem('lbx_onboarding_seen', '1');
        localStorage.setItem('lbx_settings', JSON.stringify({ theme: t }));
      }, theme);
      await page.route('**/api/search*', route => route.fulfill({ json: { results: [] } }));
      // Polices Google bloquées, même raisonnement que visual-regression.spec.js :
      // loadThemeFonts() (index.html) injecte un <link> bloquant vers
      // fonts.googleapis.com, dont la résolution peut prendre une dizaine de
      // secondes selon le réseau du runner. Ce test ne lit que des propriétés
      // personnalisées CSS — qu'une webfont ait été téléchargée ou non n'a
      // aucune incidence sur leur valeur. Sans ce blocage, chaque test coûtait
      // ~14s et la suite finissait par dépasser le délai sur les derniers
      // thèmes, un échec qui ne disait rien du CSS testé.
      await page.route('**fonts.googleapis.com**', route => route.abort());
      await page.route('**fonts.gstatic.com**', route => route.abort());
      await page.goto('/');
      await page.waitForTimeout(600);
    });

    test(`tous les jetons requis sont définis et non vides (${theme})`, async ({ page }) => {
      const jetons = await lireJetons(page, JETONS_REQUIS);
      const manquants = JETONS_REQUIS.filter(n => !jetons[n]);
      expect(manquants, `jetons vides ou absents : ${manquants.join(', ')}`).toHaveLength(0);
    });

    test(`les paires sémantiques restent distinctes (${theme})`, async ({ page }) => {
      const noms = [...new Set(PAIRES_DISTINCTES.flat())];
      const jetons = await lireJetons(page, noms);

      const collisions = [];
      for (const [a, b] of PAIRES_DISTINCTES) {
        // Comparaison sur la couleur RÉSOLUE : --chart-movie vaut var(--gold)
        // sur cinq thèmes, donc comparer les chaînes brutes ne dirait rien.
        const [ra, rb] = [await versRgb(page, jetons[a]), await versRgb(page, jetons[b])];
        if (ra === rb) collisions.push(`${a} == ${b} (${ra})`);
      }
      expect(collisions, `couleurs identiques : ${collisions.join(' | ')}`).toHaveLength(0);
    });

    test(`les trois niveaux d'élévation sont distincts entre eux (${theme})`, async ({ page }) => {
      const j = await lireJetons(page, ['--shadow-1', '--shadow-2', '--shadow-3']);
      const valeurs = [j['--shadow-1'], j['--shadow-2'], j['--shadow-3']];
      // Trois niveaux qui se ressembleraient ne donneraient aucune hiérarchie
      // de profondeur — c'est tout l'intérêt d'avoir une échelle.
      expect(new Set(valeurs).size, `élévations : ${JSON.stringify(valeurs)}`).toBe(3);
    });
  });
}
