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
    },
  ],
});
