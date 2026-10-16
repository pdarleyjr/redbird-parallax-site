import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 4173);
const BASE = (process.env.BASE || '/redbird-parallax-site/').replace(/\/?$/, '/');
const baseURL = process.env.TEST_URL || `http://127.0.0.1:${PORT}${BASE}`;
const gl = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: process.env.TEST_URL ? undefined : { command: 'node scripts/serve.mjs', port: PORT, reuseExistingServer: true, env: { PORT: String(PORT), BASE } },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], launchOptions: gl } },
    { name: 'chromium-desktop', use: { viewport: { width: 1440, height: 1000 }, launchOptions: gl } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } }
  ]
});
