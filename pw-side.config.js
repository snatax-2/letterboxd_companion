const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e', outputDir: '/tmp/pw-side-results',
  fullyParallel: false, retries: 0, workers: 1, reporter: [['list']], timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:4195' },
  webServer: { command: 'python3 -m http.server 4195', url: 'http://127.0.0.1:4195', reuseExistingServer: true, timeout: 15000 },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
});
