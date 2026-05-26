import { defineConfig, devices } from '@playwright/test';
import { E2E_CONFIG } from './e2e-config';

export default defineConfig({
  testDir:      './specs',
  outputDir:    '../reports/e2e/artifacts',
  timeout:       E2E_CONFIG.timeouts.pageLoad,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : 2,   // serial in CI for stable screenshots
  fullyParallel: false,

  expect: {
    timeout: E2E_CONFIG.timeouts.apiCall,
  },

  reporter: [
    // 1. Built-in HTML report (full traces, screenshots, video)
    ['html', {
      outputFolder: '../reports/e2e/html',
      open: 'never',
    }],
    // 2. JUnit XML (for CI badge integration)
    ['junit', {
      outputFile: '../reports/e2e/junit.xml',
    }],
    // 3. Custom QA markdown/HTML summary
    ['./reporters/qa-reporter.ts'],
    // 4. Console line reporter in CI
    ...(process.env.CI ? [['github'] as ['github']] : [['list'] as ['list']]),
  ],

  use: {
    baseURL:            E2E_CONFIG.baseURL,
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    trace:              'on-first-retry',
    actionTimeout:       E2E_CONFIG.timeouts.animation,
    navigationTimeout:   E2E_CONFIG.timeouts.navigation,
    locale:             'en-IN',
    timezoneId:         'Asia/Kolkata',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: E2E_CONFIG.viewports.desktop,
      },
    },
    {
      name: 'Mobile Safari (iPhone 14)',
      use: {
        ...devices['iPhone 14'],
        viewport: E2E_CONFIG.viewports.mobilePortrait,
      },
    },
    {
      name: 'Mobile Chrome (Android)',
      use: {
        ...devices['Pixel 7'],
        viewport: E2E_CONFIG.viewports.mobilePortrait,
      },
    },
  ],
});
