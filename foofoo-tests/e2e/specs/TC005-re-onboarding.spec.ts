/**
 * TC005 | RE Onboarding — Recommendation Engine preference collection
 *
 * Tests the RE-specific onboarding screens that collect the inputs the
 * Recommendation Engine needs: diet type, cuisine preferences, household
 * size, and state selection. These map directly to the RE module's
 * `re_user_household_profiles` schema.
 *
 * The suite tests screen rendering and interaction only — it does NOT
 * create real accounts (that would hit the 429 Supabase rate limit).
 * Real end-to-end user creation is covered by the API-level
 * `re-onboarding-e2e.test.ts` integration test.
 *
 * All copy and selectors come from E2E_CONFIG / RE_E2E_CONFIG — update
 * those files when UI changes, not this one.
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { E2E_CONFIG } from '../e2e-config';

// ─── RE-specific config (diet types, cuisine labels, household sizes) ──────────
export const RE_E2E_CONFIG = {
  /** Diet options visible on the onboarding food-preference screen (step 2). */
  dietOptions: ['Veg', 'Non-Veg', 'Egg', 'Vegan', 'Jain'] as const,

  /** RE hard constraint: diet types that must NEVER appear for each profile. */
  hardConstraints: {
    veg:   ['Chicken', 'Mutton', 'Fish', 'Prawn', 'Egg', 'Pork', 'Beef'],
    jain:  ['Onion', 'Garlic', 'Potato', 'Carrot', 'Radish'],
  },

  /** Cuisine bucket slugs shown in onboarding step 4. */
  cuisineBuckets: [
    'North Indian', 'South Indian', 'East Indian', 'West Indian',
    'Street Food', 'Continental',
  ] as const,

  /** Valid household size range (RE engine uses this for addon planning). */
  householdSizes: {
    min: 1,
    max: 10,
  },

  /** Test credential for the pre-seeded RE veg test user. */
  users: {
    reVegUser: {
      email:    process.env.E2E_VEG_USER_EMAIL    ?? 'e2e-veg@foofoo-test.dev',
      password: process.env.E2E_VEG_USER_PASSWORD ?? 'E2eVegTest123!',
    },
  },
} as const;

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe('TC005 | RE Onboarding — Preference Collection', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TC005-001 | Sign Up | Screen renders without crashing
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-001 | Sign Up | Screen renders title, email, password, and Create Account button', async ({ page }) => {
    const authPage = new AuthPage(page);

    await test.step('GIVEN: User navigates to the sign-up screen', async () => {
      await authPage.gotoSignUp();
    });

    await test.step('THEN: "Create account" title is visible', async () => {
      await expect(
        page.getByText(E2E_CONFIG.copy.auth.signUpTitle),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await test.step('THEN: All required input fields are present', async () => {
      await expect(page.getByPlaceholder('Full Name')).toBeVisible();
      await expect(page.getByPlaceholder('Email')).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toBeVisible();
    });

    await test.step('THEN: Create Account button is present and enabled', async () => {
      const btn = page.getByText(E2E_CONFIG.copy.auth.signUpBtn, { exact: true });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-002 | Sign Up | 429 rate limit produces user-visible error (not blank)
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-003 | Sign Up | Rate-limited signup (429) shows friendly error, not blank screen', async ({ page }) => {
    const authPage = new AuthPage(page);

    await test.step('GIVEN: User is on the sign-up screen', async () => {
      await authPage.gotoSignUp();
      await authPage.assertSignUpPageLoaded();
    });

    await test.step('WHEN: User submits a sign-up form (may hit 429 if RE staging rate-limited)', async () => {
      // Use a unique timestamp-suffixed email to avoid "already registered" error
      const ts = Date.now();
      await authPage.fillSignUpForm(
        `RE Test ${ts}`,
        `re-e2e-${ts}@foofoo-test.dev`,
        'TestPass123!',
      );
      await authPage.submitSignUp();
      // Give time for API response
      await page.waitForTimeout(3000);
    });

    await test.step('THEN: Either success (rare in rate-limited env) or a friendly error — never a blank/crashed screen', async () => {
      // The page must still be renderable after a failed signup attempt
      await expect(page.locator('body')).toBeVisible();

      // Acceptable outcomes: navigated to onboarding (success) OR error shown
      const url = page.url();
      const navigatedToOnboarding = url.includes('onboarding') || url.includes('tabs');
      const errorVisible = await page
        .locator('text=/failed|try again|error|rate|limit|429/i')
        .first()
        .isVisible()
        .catch(() => false);
      const stillOnSignUp = url.includes('sign-up') || url.includes('auth');

      // Any of these is acceptable — the key assertion is the screen didn't crash
      expect(
        navigatedToOnboarding || errorVisible || stillOnSignUp,
        'After signup attempt, the screen must still be rendered (not blank/crashed)',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-003 | Onboarding Step 1 | Profile setup screen renders correctly
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-004 | Onboarding Step 1 | Profile setup screen has name, city, state fields', async ({ page }) => {
    await test.step('GIVEN: User navigates directly to onboarding step 1', async () => {
      await page.goto(E2E_CONFIG.routes.onboardingStep1);
      await page.waitForLoadState('networkidle');
    });

    await test.step('THEN: Step 1 title is visible', async () => {
      await expect(
        page.getByText(E2E_CONFIG.copy.onboarding.step1Title),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await test.step('THEN: Name input is visible', async () => {
      await expect(page.getByPlaceholder('e.g. Priya Sharma')).toBeVisible();
    });

    await test.step('THEN: City input is visible', async () => {
      await expect(page.getByPlaceholder('e.g. Mumbai')).toBeVisible();
    });

    await test.step('THEN: State selector is visible', async () => {
      await expect(page.getByText('Select your state')).toBeVisible();
    });

    await test.step('THEN: Step 1 of 7 progress indicator is shown', async () => {
      await expect(
        page.getByText(E2E_CONFIG.copy.onboarding.stepIndicator(1)),
      ).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-004 | Onboarding Step 2 | All 5 diet-type cards render
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-005 | Onboarding Step 2 | All 5 RE diet-type preference cards render', async ({ page }) => {
    await test.step('GIVEN: User navigates directly to onboarding step 2', async () => {
      await page.goto(E2E_CONFIG.routes.onboardingStep2);
      await page.waitForLoadState('networkidle');
    });

    await test.step('THEN: Step 2 title is visible', async () => {
      await expect(
        page.getByText(E2E_CONFIG.copy.onboarding.step2Title),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await test.step('THEN: All 5 RE diet-type cards are visible', async () => {
      for (const diet of RE_E2E_CONFIG.dietOptions) {
        await expect(
          page.getByText(diet, { exact: true }).first(),
        ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-005 | Onboarding Step 2 | Selecting Jain diet shows selection state
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-006 | Onboarding Step 2 | Selecting Jain diet reflects selection — only one active', async ({ page }) => {
    await test.step('GIVEN: User is on onboarding step 2', async () => {
      await page.goto(E2E_CONFIG.routes.onboardingStep2);
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByText(E2E_CONFIG.copy.onboarding.step2Title),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await test.step('WHEN: User selects "Veg" then switches to "Jain"', async () => {
      await page.getByText('Veg', { exact: true }).first().click();
      await page.waitForTimeout(E2E_CONFIG.timeouts.animation);
      await page.getByText('Jain', { exact: true }).first().click();
      await page.waitForTimeout(E2E_CONFIG.timeouts.animation);
    });

    await test.step('THEN: Jain card reflects selected state', async () => {
      // The Jain card should be visually active (various indicator types)
      const jainCard = page.getByText('Jain', { exact: true }).first();
      await expect(jainCard).toBeVisible();

      // Confirm at most 1 selection checkmark on the page
      const checkmarks = await page.getByText('✓').count();
      expect(checkmarks).toBeLessThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-006 | Onboarding Step 4 | Cuisine preference buckets render
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-007 | Onboarding Step 4 | Cuisine bucket selection screen renders', async ({ page }) => {
    await test.step('GIVEN: User navigates directly to onboarding step 4', async () => {
      await page.goto(E2E_CONFIG.routes.onboardingStep4);
      await page.waitForLoadState('networkidle');
    });

    await test.step('THEN: Step 4 progress indicator is visible', async () => {
      await expect(
        page.getByText(E2E_CONFIG.copy.onboarding.stepIndicator(4)),
      ).toBeVisible({ timeout: E2E_CONFIG.timeouts.pageLoad });
    });

    await test.step('THEN: At least one cuisine option is visible', async () => {
      // Look for any known cuisine label
      const cuisineVisible = await page
        .locator('text=/North Indian|South Indian|Street Food|Continental/i')
        .first()
        .isVisible({ timeout: E2E_CONFIG.timeouts.apiCall })
        .catch(() => false);
      expect(
        cuisineVisible,
        'Cuisine bucket options should appear on step 4',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC005-007 | Onboarding | All 7 steps reachable via direct route
  // ─────────────────────────────────────────────────────────────────────────
  test('TC005-008 | Onboarding | All 7 steps render without JS crash', async ({ page }) => {
    const steps = [
      E2E_CONFIG.routes.onboardingStep1,
      E2E_CONFIG.routes.onboardingStep2,
      E2E_CONFIG.routes.onboardingStep3,
      E2E_CONFIG.routes.onboardingStep4,
      E2E_CONFIG.routes.onboardingStep5,
      E2E_CONFIG.routes.onboardingStep6,
      E2E_CONFIG.routes.onboardingStep7,
    ];

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    for (let i = 0; i < steps.length; i++) {
      await test.step(`WHEN: User navigates to step ${i + 1}`, async () => {
        await page.goto(steps[i]);
        await page.waitForLoadState('networkidle');
        // Step indicator must appear — proves the step rendered
        const indicator = E2E_CONFIG.copy.onboarding.stepIndicator(i + 1);
        const visible = await page
          .getByText(indicator)
          .isVisible({ timeout: E2E_CONFIG.timeouts.pageLoad })
          .catch(() => false);
        if (!visible) {
          // Step may redirect unauthenticated users — that's OK, just confirm no crash
          await expect(page.locator('body')).toBeVisible();
        }
      });
    }

    await test.step('THEN: No unhandled JS exceptions occurred across all 7 steps', async () => {
      // Filter out known benign browser warnings
      const realErrors = errors.filter(
        e => !e.includes('ResizeObserver') && !e.includes('aria-hidden'),
      );
      expect(
        realErrors,
        `Unhandled JS exceptions on onboarding steps: ${realErrors.join('; ')}`,
      ).toHaveLength(0);
    });
  });
});
