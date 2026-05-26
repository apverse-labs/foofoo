import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { E2E_CONFIG } from '../e2e-config';

const C = E2E_CONFIG.copy.onboarding;

export class OnboardingPage extends BasePage {
  constructor(page: Page) { super(page); }

  // ── Step helpers ───────────────────────────────────────────────────────────

  async assertStep(n: number, title: string): Promise<void> {
    await expect(this.page.getByText(C.stepIndicator(n))).toBeVisible({
      timeout: E2E_CONFIG.timeouts.navigation,
    });
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async clickNext(): Promise<void> {
    await this.page.getByText(C.nextBtn, { exact: true }).click();
    await this.waitForAnimation();
  }

  // ── Step 1: Profile Setup ──────────────────────────────────────────────────

  async fillProfileSetup(opts: {
    name: string;
    username: string;
    city: string;
    state: string;
  }): Promise<void> {
    await this.fillInput('e.g. Priya Sharma', opts.name);
    await this.fillInput('letters, numbers, underscore (3–20)', opts.username);
    await this.fillInput('e.g. Mumbai', opts.city);
    // State picker
    await this.page.getByText('Select your state').first().click();
    await this.waitForAnimation();
    await this.page.getByText(opts.state, { exact: true }).first().click();
    await this.waitForAnimation();
  }

  // ── Step 2: Food Preference ────────────────────────────────────────────────

  async selectFoodPreference(pref: 'Veg' | 'Non-Veg' | 'Egg' | 'Vegan' | 'Jain'): Promise<void> {
    await this.page.getByText(pref, { exact: true }).first().click();
    await this.waitForAnimation();
    // Confirm the card is still visible (selection registered)
    await expect(this.page.getByText(pref).first()).toBeVisible();
  }

  async assertFoodPreferenceSelected(_pref: string): Promise<void> {
    // After selection, the card should appear highlighted (checkmark visible)
    await expect(this.page.getByText('✓').first()).toBeVisible();
  }

  // ── Step 3: Allergies ──────────────────────────────────────────────────────

  async assertNoAllergyToggleVisible(): Promise<void> {
    await expect(
      this.page.getByText(/no allergy|no known allergy/i)
    ).toBeVisible({ timeout: 5000 });
  }

  // ── Step 7: Notifications ──────────────────────────────────────────────────

  async assertFinalStep(): Promise<void> {
    await expect(this.page.getByText(C.stepIndicator(7))).toBeVisible({
      timeout: E2E_CONFIG.timeouts.navigation,
    });
  }

  async clickFinish(): Promise<void> {
    // Step 7's button might say "Finish" or "Get Started"
    const btn = this.page.getByText(/finish|get started|done/i).first();
    await btn.click();
    await this.page.waitForLoadState('networkidle');
  }
}
