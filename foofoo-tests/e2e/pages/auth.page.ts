import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { E2E_CONFIG } from '../e2e-config';

const C = E2E_CONFIG.copy.auth;

export class AuthPage extends BasePage {
  constructor(page: Page) { super(page); }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoSignIn(): Promise<void> {
    await this.page.goto(E2E_CONFIG.routes.signIn);
    await this.waitForLoad();
  }

  async gotoSignUp(): Promise<void> {
    await this.page.goto(E2E_CONFIG.routes.signUp);
    await this.waitForLoad();
  }

  // ── Sign In ────────────────────────────────────────────────────────────────

  async assertSignInPageLoaded(): Promise<void> {
    await expect(this.page.getByText(C.signInTitle)).toBeVisible();
  }

  async fillSignInForm(email: string, password: string): Promise<void> {
    await this.fillInput('Email', email);
    await this.fillInput('Password', password);
  }

  async submitSignIn(): Promise<void> {
    await this.page.getByText(C.signInBtn, { exact: true }).click();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.fillSignInForm(email, password);
    await this.submitSignIn();
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────

  async assertSignUpPageLoaded(): Promise<void> {
    await expect(this.page.getByText(C.signUpTitle)).toBeVisible();
  }

  async fillSignUpForm(name: string, email: string, password: string): Promise<void> {
    await this.fillInput('Full Name', name);
    await this.fillInput('Email', email);
    await this.fillInput('Password', password);
  }

  async submitSignUp(): Promise<void> {
    await this.page.getByText(C.signUpBtn, { exact: true }).click();
  }

  // ── Error handling ─────────────────────────────────────────────────────────

  async getErrorMessage(): Promise<string | null> {
    // Error box appears above the submit button in both auth screens
    const errLocator = this.page
      .locator('[style*="color: rgb(220"], [style*="color:#"], .error-box')
      .first();
    try {
      await errLocator.waitFor({ timeout: 3000 });
      return errLocator.innerText();
    } catch {
      return null;
    }
  }

  async waitForError(): Promise<void> {
    // Wait for any visible error to appear
    await this.page.waitForTimeout(2000);
  }

  // ── Navigation links ───────────────────────────────────────────────────────

  async clickForgotPassword(): Promise<void> {
    await this.page.getByText(C.forgotPassword).click();
  }

  async clickSwitchToSignUp(): Promise<void> {
    await this.page.getByText(C.switchToSignUp).last().click();
  }

  async clickSwitchToSignIn(): Promise<void> {
    await this.page.getByText(C.switchToSignIn).last().click();
  }
}
