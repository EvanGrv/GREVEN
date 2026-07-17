import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for critical navigation / interaction scenarios.
 * Boots the production build against a local server.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Each page boots a full WebGL scene; more parallel contexts than this
  // saturate the GPU and turn into flaky navigation timeouts.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
