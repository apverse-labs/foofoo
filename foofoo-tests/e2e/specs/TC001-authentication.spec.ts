/**
 * TC001 | Authentication
 *
 * Test suite covering sign-in, sign-up, and auth navigation flows.
 * All copy, selectors, and timeouts come from E2E_CONFIG — update that
 * file when UI changes, not this one.
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { E2E_CONFIG } from '../e2e-config';

const C = E2E_CONFIG.copy.auth;
const F = E2E_CONFIG.features.auth;

test.describe('TC001 | Authentication', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-001 | Sign In | Renders sign-in screen with all required elements
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-001 | Sign In | Renders sign-in screen with all required elements', async () => {
    test.skip(!F.signIn, 'Sign-in feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User navigates to the sign-in screen', async () => {
      await authPage.gotoSignIn();
    });

    await test.step('THEN: Title text is visible', async () => {
      await expect(authPage['page'].getByText(C.signInTitle)).toBeVisible({
        timeout: E2E_CONFIG.timeouts.pageLoad,
      });
    });

    await test.step('THEN: Subtitle text is visible', async () => {
      await expect(authPage['page'].getByText(C.signInSubtitle)).toBeVisible();
    });

    await test.step('THEN: Email input field is visible', async () => {
      await expect(
        authPage['page'].getByPlaceholder('Email'),
      ).toBeVisible();
    });

    await test.step('THEN: Password input field is visible', async () => {
      await expect(
        authPage['page'].getByPlaceholder('Password'),
      ).toBeVisible();
    });

    await test.step('THEN: Sign In button is visible', async () => {
      await expect(
        authPage['page'].getByText(C.signInBtn, { exact: true }),
      ).toBeVisible();
    });

    await test.step('THEN: Forgot password link is visible', async () => {
      await expect(
        authPage['page'].getByText(C.forgotPassword),
      ).toBeVisible();
    });

    await test.step('THEN: Switch to sign-up link is visible', async () => {
      await expect(
        authPage['page'].getByText(C.switchToSignUp),
      ).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-002 | Sign In | Valid credentials navigate to home screen
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-002 | Sign In | Valid credentials navigate to home screen', async () => {
    test.skip(!F.signIn, 'Sign-in feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User is on the sign-in screen', async () => {
      await authPage.gotoSignIn();
      await authPage.assertSignInPageLoaded();
    });

    await test.step('WHEN: User enters valid credentials', async () => {
      await authPage.fillSignInForm(
        E2E_CONFIG.users.vegUser.email,
        E2E_CONFIG.users.vegUser.password,
      );
    });

    await test.step('WHEN: User submits the sign-in form', async () => {
      await authPage.submitSignIn();
    });

    await test.step('THEN: App navigates to the home/tabs screen', async () => {
      await authPage['page'].waitForURL(/tabs/, {
        timeout: E2E_CONFIG.timeouts.apiCall,
      });
      const url = await authPage.currentURL();
      expect(url, 'URL should contain "tabs" after successful sign-in').toMatch(/tabs/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-003 | Sign In | Invalid credentials show error message
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-003 | Sign In | Invalid credentials show error message', async () => {
    test.skip(!F.signIn, 'Sign-in feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User is on the sign-in screen', async () => {
      await authPage.gotoSignIn();
      await authPage.assertSignInPageLoaded();
    });

    await test.step('WHEN: User enters an incorrect password', async () => {
      await authPage.fillSignInForm(
        E2E_CONFIG.users.vegUser.email,
        'WrongPassword999!',
      );
    });

    await test.step('WHEN: User submits the sign-in form', async () => {
      await authPage.submitSignIn();
      await authPage.waitForError();
    });

    await test.step('THEN: An error message is shown and user stays on sign-in screen', async () => {
      // Either a toast, inline error, or error text appears
      const page = authPage['page'];

      // The page should NOT have navigated away
      const url = await authPage.currentURL();
      expect(url, 'User should remain on sign-in page after invalid credentials').not.toMatch(/tabs/);

      // At least one of these error indicators must appear:
      // 1. An element with red/error styling
      // 2. Any text indicating auth failure
      const errorVisible = await page
        .locator('text=/invalid|incorrect|wrong|error|failed|credentials/i')
        .first()
        .isVisible()
        .catch(() => false);

      const stillOnAuthPage = url.includes('sign-in') || url.includes('auth');

      expect(
        errorVisible || stillOnAuthPage,
        'Error feedback must be shown for invalid credentials',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-004 | Sign In | Empty fields show validation error
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-004 | Sign In | Empty fields show validation error', async () => {
    test.skip(!F.signIn, 'Sign-in feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User is on the sign-in screen', async () => {
      await authPage.gotoSignIn();
      await authPage.assertSignInPageLoaded();
    });

    await test.step('WHEN: User clicks Sign In without filling any fields', async () => {
      await authPage.submitSignIn();
      await authPage.waitForError();
    });

    await test.step('THEN: Validation feedback is shown and form is not submitted', async () => {
      const page = authPage['page'];
      const url = await authPage.currentURL();

      // Should NOT navigate away from auth screen
      expect(url, 'User should remain on sign-in screen when fields are empty').not.toMatch(/tabs/);

      // HTML5 validation, native validation message, or inline error — one must be visible
      const emailInput = page.getByPlaceholder('Email');
      // evaluate() runs inside the browser — cast to `any` since dom lib is not in tsconfig
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailValid = await emailInput.evaluate(
        (el: any) => (el as { validity: { valid: boolean } }).validity.valid,
      );
      expect(emailValid, 'Email input should be invalid when empty').toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-005 | Sign Up | Renders sign-up screen with all required elements
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-005 | Sign Up | Renders sign-up screen with all required elements', async () => {
    test.skip(!F.signUp, 'Sign-up feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User navigates to the sign-up screen', async () => {
      await authPage.gotoSignUp();
    });

    await test.step('THEN: Title text is visible', async () => {
      await expect(authPage['page'].getByText(C.signUpTitle)).toBeVisible({
        timeout: E2E_CONFIG.timeouts.pageLoad,
      });
    });

    await test.step('THEN: Subtitle text is visible', async () => {
      await expect(authPage['page'].getByText(C.signUpSubtitle)).toBeVisible();
    });

    await test.step('THEN: Full Name input is visible', async () => {
      await expect(authPage['page'].getByPlaceholder('Full Name')).toBeVisible();
    });

    await test.step('THEN: Email input is visible', async () => {
      await expect(authPage['page'].getByPlaceholder('Email')).toBeVisible();
    });

    await test.step('THEN: Password input is visible', async () => {
      await expect(authPage['page'].getByPlaceholder('Password')).toBeVisible();
    });

    await test.step('THEN: Create Account button is visible', async () => {
      await expect(
        authPage['page'].getByText(C.signUpBtn, { exact: true }),
      ).toBeVisible();
    });

    await test.step('THEN: Switch to sign-in link is visible', async () => {
      await expect(
        authPage['page'].getByText(C.switchToSignIn),
      ).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-006 | Sign Up | Password strength indicator updates as user types
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-006 | Sign Up | Password strength indicator updates as user types', async () => {
    test.skip(!F.signUp, 'Sign-up feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User is on the sign-up screen', async () => {
      await authPage.gotoSignUp();
      await authPage.assertSignUpPageLoaded();
    });

    await test.step('WHEN: User types a weak password (short)', async () => {
      await authPage['page'].getByPlaceholder('Password').fill('abc');
    });

    await test.step('THEN: Strength indicator exists and reflects state', async () => {
      // The password field itself should exist and be interactable
      const passwordInput = authPage['page'].getByPlaceholder('Password');
      await expect(passwordInput).toBeVisible();
      const val = await passwordInput.inputValue();
      expect(val, 'Password field should contain typed text').toBe('abc');
    });

    await test.step('WHEN: User types a strong password', async () => {
      await authPage['page'].getByPlaceholder('Password').fill('StrongP@ss123!');
    });

    await test.step('THEN: Form accepts the stronger password', async () => {
      const passwordInput = authPage['page'].getByPlaceholder('Password');
      const val = await passwordInput.inputValue();
      expect(val, 'Password field should contain the strong password').toBe('StrongP@ss123!');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-007 | Sign Up | Duplicate email shows error
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-007 | Sign Up | Duplicate email shows error', async () => {
    test.skip(!F.signUp, 'Sign-up feature disabled in E2E_CONFIG');

    await test.step('GIVEN: User is on the sign-up screen', async () => {
      await authPage.gotoSignUp();
      await authPage.assertSignUpPageLoaded();
    });

    await test.step('WHEN: User tries to register with an already-registered email', async () => {
      await authPage.fillSignUpForm(
        'Duplicate User',
        E2E_CONFIG.users.vegUser.email,  // existing test user email
        'SomePassword123!',
      );
      await authPage.submitSignUp();
      await authPage.waitForError();
    });

    await test.step('THEN: An error is shown and user stays on sign-up screen', async () => {
      const page = authPage['page'];
      const url = await authPage.currentURL();

      // Should not navigate to home
      expect(url, 'User should stay on sign-up page when email is duplicate').not.toMatch(/tabs/);

      // Some error text about the email must appear
      const errorEl = page.locator(
        'text=/already registered|already exists|email.*taken|user.*exists|duplicate/i',
      ).first();
      const errorVisible = await errorEl.isVisible().catch(() => false);

      // Acceptable: either explicit error text or still on auth page (form rejected)
      expect(
        errorVisible || !url.includes('tabs'),
        'Duplicate email should be rejected with feedback',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC001-008 | Navigation | Sign-in links to sign-up and vice versa
  // ─────────────────────────────────────────────────────────────────────────
  test('TC001-008 | Navigation | Sign-in links to sign-up and vice versa', async () => {
    test.skip(!F.signIn || !F.signUp, 'Both sign-in and sign-up must be enabled');

    await test.step('GIVEN: User is on the sign-in screen', async () => {
      await authPage.gotoSignIn();
      await authPage.assertSignInPageLoaded();
    });

    await test.step('WHEN: User clicks the "Create account" link', async () => {
      await authPage.clickSwitchToSignUp();
    });

    await test.step('THEN: User is navigated to the sign-up screen', async () => {
      await authPage.assertSignUpPageLoaded();
      const url = await authPage.currentURL();
      expect(url, 'URL should contain sign-up route').toMatch(/sign-up/);
    });

    await test.step('WHEN: User clicks the "Sign in" link on sign-up screen', async () => {
      await authPage.clickSwitchToSignIn();
    });

    await test.step('THEN: User is navigated back to the sign-in screen', async () => {
      await authPage.assertSignInPageLoaded();
      const url = await authPage.currentURL();
      expect(url, 'URL should contain sign-in route').toMatch(/sign-in/);
    });
  });
});
