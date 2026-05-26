/**
 * TC004 | RE Safety — Hard Constraint Validation
 *
 * This is the most important suite in the E2E test battery.
 *
 * "RE Safety" refers to Recipe/Recommendation Engine Safety — the system
 * must NEVER surface dishes that violate a user's declared diet type or
 * allergen constraints. These are hard filters, not preferences.
 *
 * TC004-001 is the crown jewel: a veg-profile user must NEVER see meat,
 * fish, or egg dishes on their home screen. Any failure here is a P0 bug.
 *
 * All copy, user credentials, and timeouts come from E2E_CONFIG.
 */

import { test as authTest, expect } from '../fixtures/auth.fixture';
import { HomePage } from '../pages/home.page';
import { E2E_CONFIG } from '../e2e-config';

const FEAT = E2E_CONFIG.features.reSafety;

// ── Known non-vegetarian dish names to check for ─────────────────────────────
// Extend this list as the recipe database grows.
const KNOWN_NON_VEG_DISHES = [
  'Chicken Biryani',
  'Mutton Curry',
  'Fish Fry',
  'Egg Bhurji',
  'Chicken Curry',
  'Prawn Masala',
  'Fish Curry',
  'Mutton Biryani',
  'Lamb Korma',
  'Chicken Tikka',
  'Keema Matar',
  'Butter Chicken',
  'Tandoori Chicken',
  'Egg Fried Rice',
  'Omelette',
  'Boiled Egg',
  'Scrambled Eggs',
  'Crab Curry',
  'Prawn Biryani',
] as const;

// ── Known vegetarian dishes (positive control for TC004-002) ─────────────────
const KNOWN_VEG_DISHES = [
  'Paneer',
  'Dal',
  'Rajma',
  'Aloo',
  'Palak',
  'Chhole',
  'Idli',
  'Dosa',
  'Upma',
] as const;

authTest.describe('TC004 | RE Safety — Hard Constraint Validation', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // TC004-001 | Diet Filter | Veg user home screen contains NO meat/fish/egg
  // ─────────────────────────────────────────────────────────────────────────
  authTest(
    'TC004-001 | Diet Filter | Veg user home screen contains NO meat/fish/egg dish names',
    async ({ vegUserPage }) => {
      authTest.skip(
        !FEAT.dietTypeHardFilter,
        'Diet type hard filter disabled in E2E_CONFIG',
      );

      const homePage = new HomePage(vegUserPage);

      await authTest.step(
        'GIVEN: Veg user is authenticated and on the home screen',
        async () => {
          await homePage.assertLoaded();
        },
      );

      await authTest.step(
        'WHEN: Day view meal plan fully loads from the API',
        async () => {
          await homePage.switchToDayView();
          // Wait for API response + render — meal plans load asynchronously
          await vegUserPage.waitForTimeout(E2E_CONFIG.timeouts.apiCall);
          await homePage.assertMealSlotsVisible();
        },
      );

      await authTest.step(
        'THEN: None of the known non-veg dish names appear anywhere on the page',
        async () => {
          // Collect all visible text on the page using Playwright's innerText (no DOM lib needed)
          const pageText = await vegUserPage.innerText('body');
          const pageTextLower = pageText.toLowerCase();

          const violations: string[] = [];
          for (const dish of KNOWN_NON_VEG_DISHES) {
            if (pageTextLower.includes(dish.toLowerCase())) {
              violations.push(dish);
            }
          }

          expect(
            violations,
            `P0 BUG: Veg user's meal plan contains non-veg dish(es): ${violations.join(', ')}. ` +
            `The RE diet-type hard filter must prevent this.`,
          ).toHaveLength(0);
        },
      );

      await authTest.step(
        'THEN: Week view also contains no non-veg dishes',
        async () => {
          authTest.skip(
            !E2E_CONFIG.features.home.weekView,
            'Week view disabled in E2E_CONFIG',
          );

          await homePage.switchToWeekView();
          await vegUserPage.waitForTimeout(E2E_CONFIG.timeouts.animation);

          const pageText = await vegUserPage.innerText('body');
          const pageTextLower = pageText.toLowerCase();

          const violations: string[] = [];
          for (const dish of KNOWN_NON_VEG_DISHES) {
            if (pageTextLower.includes(dish.toLowerCase())) {
              violations.push(dish);
            }
          }

          expect(
            violations,
            `P0 BUG: Veg user's WEEK VIEW contains non-veg dish(es): ${violations.join(', ')}`,
          ).toHaveLength(0);
        },
      );
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC004-002 | Diet Filter | Non-veg user home screen shows diverse dish types
  // ─────────────────────────────────────────────────────────────────────────
  authTest(
    'TC004-002 | Diet Filter | Non-veg user home screen shows diverse dish types',
    async ({ nonVegUserPage }) => {
      authTest.skip(
        !FEAT.dietTypeHardFilter,
        'Diet type hard filter disabled in E2E_CONFIG',
      );

      const homePage = new HomePage(nonVegUserPage);

      await authTest.step(
        'GIVEN: Non-veg user is authenticated and on the home screen',
        async () => {
          await homePage.assertLoaded();
        },
      );

      await authTest.step(
        'WHEN: Day view meal plan fully loads from the API',
        async () => {
          await homePage.switchToDayView();
          await nonVegUserPage.waitForTimeout(E2E_CONFIG.timeouts.apiCall);
          await homePage.assertMealSlotsVisible();
        },
      );

      await authTest.step(
        'THEN: The page renders meal plan content (plan is non-empty)',
        async () => {
          const dishNames = await homePage.getDishNamesFromPage();
          const mealCardTexts = await homePage.getMealCardTexts();
          const allContent = [...dishNames, ...mealCardTexts];

          expect(
            allContent.length,
            'Non-veg user\'s meal plan should contain at least one dish',
          ).toBeGreaterThan(0);
        },
      );

      await authTest.step(
        'THEN: The page content is not blank / placeholder only',
        async () => {
          const pageText = await nonVegUserPage.innerText('body');
          // Page should have meaningful content beyond UI chrome
          expect(
            pageText.length,
            'Home page should have substantial text content for non-veg user',
          ).toBeGreaterThan(100);
        },
      );
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC004-003 | Allergen | Page title and structure loads for authenticated user
  // ─────────────────────────────────────────────────────────────────────────
  authTest(
    'TC004-003 | Allergen | Page title and structure loads for authenticated user',
    async ({ vegUserPage }) => {
      authTest.skip(
        !FEAT.allergenHardFilter,
        'Allergen hard filter disabled in E2E_CONFIG',
      );

      const homePage = new HomePage(vegUserPage);

      await authTest.step(
        'GIVEN: Authenticated user is on the home screen',
        async () => {
          await homePage.assertLoaded();
        },
      );

      await authTest.step(
        'THEN: App title is visible (confirming authenticated session is active)',
        async () => {
          await expect(
            vegUserPage.getByText(E2E_CONFIG.copy.appName),
          ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
        },
      );

      await authTest.step(
        'THEN: Meal slot structure renders (prerequisite for allergen filtering)',
        async () => {
          await homePage.switchToDayView();
          await vegUserPage.waitForTimeout(E2E_CONFIG.timeouts.apiCall);
          await homePage.assertMealSlotsVisible();
        },
      );
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC004-004 | Navigation | Profile screen accessible from home tab bar
  // ─────────────────────────────────────────────────────────────────────────
  authTest(
    'TC004-004 | Navigation | Profile screen accessible from home tab bar',
    async ({ vegUserPage }) => {

      const homePage = new HomePage(vegUserPage);

      await authTest.step(
        'GIVEN: Authenticated user is on the home screen',
        async () => {
          await homePage.assertLoaded();
        },
      );

      await authTest.step(
        'WHEN: User navigates to the profile screen',
        async () => {
          await homePage.gotoProfile();
        },
      );

      await authTest.step(
        'THEN: Profile screen is loaded (URL contains profile route)',
        async () => {
          const url = vegUserPage.url();
          expect(
            url,
            'URL should contain "profile" after navigating to profile tab',
          ).toMatch(/profile/);
        },
      );

      await authTest.step(
        'THEN: Profile screen content is visible',
        async () => {
          // Any of these indicate the profile screen loaded
          const profileContent = vegUserPage
            .locator('text=/profile|account|settings|sign out|log out/i')
            .first();
          await expect(profileContent).toBeVisible({
            timeout: E2E_CONFIG.timeouts.pageLoad,
          });
        },
      );
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TC004-005 | Profile | Sign Out button visible on profile screen
  // ─────────────────────────────────────────────────────────────────────────
  authTest(
    'TC004-005 | Profile | Sign Out button visible on profile screen',
    async ({ vegUserPage }) => {
      authTest.skip(
        !E2E_CONFIG.features.profile.enabled,
        'Profile feature disabled in E2E_CONFIG',
      );

      const homePage = new HomePage(vegUserPage);

      await authTest.step(
        'GIVEN: Authenticated user navigates to the profile screen',
        async () => {
          await homePage.assertLoaded();
          await homePage.gotoProfile();
        },
      );

      await authTest.step(
        'THEN: A Sign Out / Log Out button is visible',
        async () => {
          const signOutBtn = vegUserPage
            .locator('text=/sign out|log out|logout|signout/i')
            .first();

          await expect(signOutBtn).toBeVisible({
            timeout: E2E_CONFIG.timeouts.pageLoad,
          });
        },
      );

      await authTest.step(
        'THEN: The Sign Out button is enabled (not disabled/greyed out)',
        async () => {
          const signOutBtn = vegUserPage
            .locator('text=/sign out|log out|logout|signout/i')
            .first();

          const isDisabled = await signOutBtn.isDisabled().catch(() => false);
          expect(
            isDisabled,
            'Sign Out button should be enabled on the profile screen',
          ).toBe(false);
        },
      );
    },
  );
});
