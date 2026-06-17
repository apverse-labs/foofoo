import { test as base, Page } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { E2E_CONFIG } from '../e2e-config';

/**
 * Extends Playwright base test with pre-authenticated pages.
 * Uses a fresh browser context per fixture, signs in the test user,
 * and waits for the home screen before handing the page to the test.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth.fixture';
 *   test('my test', async ({ vegUserPage }) => { ... });  
 */

type AuthFixtures = {
  /** Page pre-signed-in as the veg test user */
  vegUserPage: Page;
  /** Page pre-signed-in as the non-veg test user */
  nonVegUserPage: Page;
  /** Unauthenticated AuthPage instance for auth-flow tests */
  authPage: AuthPage;
};

export const test = base.extend<AuthFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  vegUserPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const auth = new AuthPage(page);

    await auth.gotoSignIn();
    await auth.signIn(
      E2E_CONFIG.users.vegUser.email,
      E2E_CONFIG.users.vegUser.password,
    );

    // Wait for redirect away from auth screens after successful sign-in.
    // Expo Router strips group names from URLs, so /(tabs) becomes / — we check
    // that the URL is no longer on a sign-in or auth-gate page instead.
    await page.waitForURL(
      url => !url.href.includes('sign-in') && !url.href.includes('auth-gate'),
      { timeout: E2E_CONFIG.timeouts.apiCall },
    );

    await use(page);
    await ctx.close();
  },

  nonVegUserPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const auth = new AuthPage(page);

    await auth.gotoSignIn();
    await auth.signIn(
      E2E_CONFIG.users.nonVegUser.email,
      E2E_CONFIG.users.nonVegUser.password,
    );

    await page.waitForURL(
      url => !url.href.includes('sign-in') && !url.href.includes('auth-gate'),
      { timeout: E2E_CONFIG.timeouts.apiCall },
    );

    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
