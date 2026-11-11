import { defineConfig, devices } from '@playwright/test';

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'desktop', use: desktop, testIgnore: /\.(phone|reduced)\.spec\.ts$/ },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      testMatch: /\.phone\.spec\.ts$/,
    },
    { name: 'reduced', use: { ...desktop, reducedMotion: 'reduce' }, testMatch: /\.reduced\.spec\.ts$/ },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
