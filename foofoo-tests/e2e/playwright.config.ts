import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { E2E_CONFIG } from './e2e-config';

// ─── Resolve app root (foofoo/) from this config file's location ─────────────
// playwright.config.ts lives at  foofoo-tests/e2e/playwright.config.ts
// The Expo app lives at          foofoo/
// So: __dirname/../../foofoo  =  <repo-root>/foofoo
const APP_ROOT = path.resolve(__dirname, '../../foofoo');

// ─── Determine whether we need to spin up a local dev server ─────────────────
// Use webServer only when no external BASE_URL is provided (i.e. VERCEL_URL
// secret is absent and the caller did not supply a custom base_url input).
// When VERCEL_URL is set the tests run against the already-deployed app.
const needsLocalServer =
  !process.env.VERCEL_URL &&
  (process.env.BASE_URL ?? 'http://localhost:8081') === 'http://localhost:8081';

export default defineConfig({
  testDir:      './specs',
  outputDir:    '../reports/e2e/artifacts',
  // Per-test wall-clock budget. Must exceed the longest single-step timeout
  // (apiCall, 20s) plus room for preceding steps in the same test (e.g.
  // TC001-002 navigates, fills a form, submits, then waits up to apiCall
  // for the post-sign-in redirect) — otherwise the global timeout fires
  // before the step's own timeout gets a chance to.
  timeout:       E2E_CONFIG.timeouts.apiCall + E2E_CONFIG.timeouts.pageLoad,
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
    // 3. Custom QA markdown/HTML summary — always registered so qa-summary.md
    //    is generated even when the CLI passes a separate --reporter flag.
    ['./reporters/qa-reporter.ts'],
    // 4. Console reporter — GitHub annotations in CI, list locally
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
    // Lets CI through Vercel's Deployment Protection login wall on preview/
    // branch URLs without disabling protection project-wide. No-op locally
    // and against unprotected deployments (header is simply ignored).
    ...(process.env.VERCEL_BYPASS_SECRET ? {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_SECRET,
      },
    } : {}),
  },

  // ─── Local dev-server (only when no external URL is configured) ───────────
  // Playwright starts this before the first test and kills it after the last.
  // `npx expo start --web --non-interactive` runs Metro + Expo web server on
  // port 8081. On first run it downloads dependencies if needed; the 2-minute
  // timeout gives it enough headroom. CI caches foofoo/node_modules via the
  // workflow's cache step, so subsequent runs start in ~10s.
  ...(needsLocalServer ? {
    webServer: {
      command: 'npx expo start --web --non-interactive --port 8081',
      url: 'http://localhost:8081',
      reuseExistingServer: !process.env.CI,
      cwd: APP_ROOT,
      timeout: 120_000,
      env: {
        // Forward Supabase credentials so the app can reach the backend.
        // These are injected via GitHub Actions secrets; locally they come
        // from foofoo/.env.local (Expo reads EXPO_PUBLIC_* automatically).
        EXPO_PUBLIC_SUPABASE_URL:      process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        CI: process.env.CI ?? '',
      },
    },
  } : {}),

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
