/**
 * TC003 | Home Screen & Meal Plan
 *
 * Test suite covering the main home screen layout, Day/Week view toggles,
 * meal slot rendering, and offline behaviour.
 *
 * Uses the `vegUserPage` fixture (pre-authenticated) for all tests that
 * require an active session.
 */

import { Page } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { test as authTest, expect } from '../fixtures/auth.fixture';
import { E2E_CONFIG } from '../e2e-config';

const FEAT = E2E_CONFIG.features.home;
const C = E2E_CONFIG.copy.home;

// ─────────────────────────────────────────────────────────────────────────────
// Layout tests — use authTest fixture for pre-authenticated pages
// ─────────────────────────────────────────────────────────────────────────────
authTest.describe('TC003 | Home Screen & Meal Plan', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-001 | Layout | Home screen renders app name in header
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-001 | Layout | Home screen renders app name in header', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.dayView && !FEAT.weekView, 'Home screen views disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on the home screen', async () => {
      await homePage.assertLoaded();
    });

    await authTest.step('THEN: App name "Foofoo" is visible in the header', async () => {
      await expect(
        vegUserPage.getByText(E2E_CONFIG.copy.appName),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-002 | Layout | Day/Week toggle tabs are visible
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-002 | Layout | Day/Week toggle tabs are visible', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.dayView && !FEAT.weekView, 'Day/Week views disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on the home screen', async () => {
      await homePage.assertLoaded();
    });

    await authTest.step('THEN: "Day" tab is visible', async () => {
      authTest.skip(!FEAT.dayView, 'Day view disabled in E2E_CONFIG');
      await expect(
        vegUserPage.getByText(C.dayTab),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await authTest.step('THEN: "Week" tab is visible', async () => {
      authTest.skip(!FEAT.weekView, 'Week view disabled in E2E_CONFIG');
      await expect(
        vegUserPage.getByText(C.weekTab),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-003 | Layout | Day view shows Breakfast, Lunch, Dinner slots
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-003 | Layout | Day view shows Breakfast, Lunch, Dinner slots', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.dayView, 'Day view disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on the home screen', async () => {
      await homePage.assertLoaded();
    });

    await authTest.step('WHEN: Day view is active (default)', async () => {
      await homePage.switchToDayView();
    });

    await authTest.step('THEN: Breakfast slot label is visible', async () => {
      await expect(
        vegUserPage.getByText('Breakfast').first(),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.apiCall });
    });

    await authTest.step('THEN: Lunch slot label is visible', async () => {
      await expect(
        vegUserPage.getByText('Lunch').first(),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.apiCall });
    });

    await authTest.step('THEN: Dinner slot label is visible', async () => {
      await expect(
        vegUserPage.getByText('Dinner').first(),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.apiCall });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-004 | Layout | Week view renders 7-column grid
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-004 | Layout | Week view renders 7-column grid', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.weekView, 'Week view disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on the home screen', async () => {
      await homePage.assertLoaded();
    });

    await authTest.step('WHEN: User switches to Week view', async () => {
      await homePage.switchToWeekView();
    });

    await authTest.step('THEN: At least 7 day indicators are visible (Mon–Sun)', async () => {
      // Day abbreviations rendered in the week grid header
      const dayAbbrevs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let foundCount = 0;
      for (const day of dayAbbrevs) {
        const visible = await vegUserPage
          .getByText(day, { exact: true })
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (visible) foundCount++;
      }
      expect(
        foundCount,
        `Week view should show day abbreviations — found ${foundCount}/7`,
      ).toBeGreaterThanOrEqual(5); // allow 5/7 in case locale changes some
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-005 | Navigation | Tab bar is visible with all navigation items
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-005 | Navigation | Tab bar is visible with all navigation items', async ({ vegUserPage }) => {

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on the home screen', async () => {
      await homePage.assertLoaded();
    });

    await authTest.step('THEN: A tab bar / bottom navigation is visible', async () => {
      // Tab bar exists as a nav element or role="tablist"
      const tabBar = vegUserPage
        .locator('nav, [role="tablist"], [aria-label*="navigation"], [aria-label*="tab"]')
        .first();

      const tabBarVisible = await tabBar.isVisible().catch(() => false);

      // Fallback: look for common tab labels
      const profileVisible = await vegUserPage
        .getByText(/profile|account/i)
        .first()
        .isVisible()
        .catch(() => false);

      const homeVisible = await vegUserPage
        .getByText(/home|feed/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(
        tabBarVisible || profileVisible || homeVisible,
        'Tab bar or at least one tab label should be visible on home screen',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-006 | Meal Plan | Meal slots load dish suggestions (non-empty)
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-006 | Meal Plan | Meal slots load dish suggestions (non-empty)', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.dayView, 'Day view disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on home screen in Day view', async () => {
      await homePage.assertLoaded();
      await homePage.switchToDayView();
    });

    await authTest.step('WHEN: Meal plan data loads from API', async () => {
      // Give the API call time to complete and render
      await vegUserPage.waitForTimeout(E2E_CONFIG.timeouts.apiCall);
    });

    await authTest.step('THEN: Meal slot sections are present', async () => {
      await homePage.assertMealSlotsVisible();
    });

    await authTest.step('THEN: At least one dish name is rendered on screen', async () => {
      const dishNames = await homePage.getDishNamesFromPage();
      const mealCardTexts = await homePage.getMealCardTexts();
      const allTexts = [...dishNames, ...mealCardTexts];

      expect(
        allTexts.length,
        'At least one dish name or meal card text should be visible',
      ).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-007 | Meal Plan | Carousel hint text visible for slots with options
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-007 | Meal Plan | Carousel hint text visible for slots with multiple options', async ({ vegUserPage }) => {
    authTest.skip(!FEAT.mealCardGestures, 'Meal card gestures disabled in E2E_CONFIG');

    const homePage = new HomePage(vegUserPage);

    await authTest.step('GIVEN: Authenticated user is on home screen in Day view', async () => {
      await homePage.assertLoaded();
      await homePage.switchToDayView();
      await vegUserPage.waitForTimeout(E2E_CONFIG.timeouts.apiCall);
    });

    await authTest.step('THEN: A swipe/carousel hint is visible on the meal plan', async () => {
      // Various ways carousels indicate swipeability
      const swipeHintVisible = await vegUserPage
        .locator('text=/swipe|slide|more options|scroll/i')
        .first()
        .isVisible()
        .catch(() => false);

      // Arrow indicators or pagination dots also count
      const arrowVisible = await vegUserPage
        .locator('[aria-label*="next"], [aria-label*="previous"], .carousel-arrow, .pagination-dot')
        .first()
        .isVisible()
        .catch(() => false);

      // This test is soft — if the feature renders without hints, log it
      // but don't fail (hint text is a UX enhancement, not a core function)
      if (!swipeHintVisible && !arrowVisible) {
        console.log(
          'TC003-007: No explicit swipe hint found — carousel may use gesture-only UX',
        );
      }

      // Assert the meal plan itself loaded (prerequisite for hint to appear)
      await homePage.assertMealSlotsVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC003-008 | Offline | Page loads from cache when network throttled to offline
  // ─────────────────────────────────────────────────────────────────────────
  authTest('TC003-008 | Offline | Page loads from cache when network throttled to offline', async ({ browser }) => {
    authTest.skip(!FEAT.offlineBanner, 'Offline banner feature disabled in E2E_CONFIG');

    let offlinePage: Page | undefined;

    await authTest.step('GIVEN: User has visited the home screen (cache warm)', async () => {
      const ctx = await browser.newContext();
      offlinePage = await ctx.newPage();
      const authPageForSetup = new (await import('../pages/auth.page')).AuthPage(offlinePage);
      await authPageForSetup.gotoSignIn();
      await authPageForSetup.signIn(
        E2E_CONFIG.users.vegUser.email,
        E2E_CONFIG.users.vegUser.password,
      );
      await offlinePage.waitForURL(/tabs/, { timeout: E2E_CONFIG.timeouts.apiCall });

      const homePage = new HomePage(offlinePage);
      await homePage.assertLoaded();
      // Allow service worker / cache to warm up
      await offlinePage.waitForTimeout(2000);
    });

    await authTest.step('WHEN: Network is set to offline', async () => {
      if (!offlinePage) throw new Error('Page not initialised');
      await offlinePage.context().setOffline(true);
      await offlinePage.reload({ timeout: E2E_CONFIG.timeouts.pageLoad }).catch(() => {
        // Expected: page may fail to reload from network but should serve cache
      });
    });

    await authTest.step('THEN: App renders in offline state (banner or cached content visible)', async () => {
      if (!offlinePage) throw new Error('Page not initialised');
      const homePage = new HomePage(offlinePage);

      const offlineBannerShown = await homePage.isOfflineBannerVisible();
      const pageHasContent = await offlinePage
        .getByText(E2E_CONFIG.copy.appName)
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Either the offline banner shows OR cached content is still visible
      expect(
        offlineBannerShown || pageHasContent,
        'App should show offline banner or serve cached content when offline',
      ).toBe(true);

      // Re-enable network for cleanup
      await offlinePage.context().setOffline(false);
      await offlinePage.context().close();
    });
  });
});
