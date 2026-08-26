// Configuration Playwright — tests de bout en bout dans un VRAI navigateur
// (Chromium), contrairement à la suite `npm test` qui teste la logique pure
// en Node/jsdom sans rendu CSS réel. Complémentaire, pas un remplacement :
// c'est ici qu'on attrape les bugs de rendu/interaction (le swipe d'onglet,
// le remplissage des étoiles, etc.) que jsdom ne peut pas voir.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // les tests partagent le même localStorage/serveur ; on évite les interférences
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 10_000,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] }, // viewport mobile + touch activé, indispensable pour tester le swipe
      testIgnore: /(^|[\\/])desktop-[^\\/]*\.spec\.js$/, // ces specs n'ont de sens qu'au-dessus de 1024px
    },
    // Le reste de la suite tourne sur un gabarit Pixel 7 (412px), c'est-à-dire
    // ENTIÈREMENT sous les seuils responsive (861px et 1024px). Les règles
    // desktop n'étaient donc couvertes par aucun test : c'est ainsi qu'un
    // `column-count: 2` a pu rendre 34 films sur 40 inatteignables sans faire
    // rougir quoi que ce soit. Ce projet ne fait tourner que les specs
    // desktop-*, sur un vrai gabarit de bureau.
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testMatch: /(^|[\\/])desktop-[^\\/]*\.spec\.js$/,
    },
  ],
});
