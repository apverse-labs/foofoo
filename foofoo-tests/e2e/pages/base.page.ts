import { Page, expect } from '@playwright/test';
import { E2E_CONFIG } from '../e2e-config';

/**
 * Base page object — extended by every screen-specific page object.
 * Provides shared helpers: waitForPageLoad, waitForAnimation, safeClick, etc.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Wait for network idle + optional selector to confirm page loaded */
  async waitForLoad(confirmSelector?: string): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    if (confirmSelector) {
      await this.page.waitForSelector(confirmSelector, {
        timeout: E2E_CONFIG.timeouts.pageLoad,
      });
    }
  }

  /** Wait for CSS animations / transitions to finish */
  async waitForAnimation(): Promise<void> {
    await this.page.waitForTimeout(E2E_CONFIG.timeouts.animation);
  }

  /** Click element by visible text (works for RN Web Text→div) */
  async clickText(text: string): Promise<void> {
    await this.page.getByText(text, { exact: true }).first().click();
    await this.waitForAnimation();
  }

  /** Fill an input by placeholder (RN TextInput renders placeholder attribute) */
  async fillInput(placeholder: string, value: string): Promise<void> {
    const input = this.page.getByPlaceholder(placeholder);
    await input.click();
    await input.fill(value);
  }

  /** Take a named screenshot for the QA report */
  async screenshot(_name: string): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true, path: undefined });
  }

  /** Assert visible text exists on page */
  async assertText(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({
      timeout: E2E_CONFIG.timeouts.apiCall,
    });
  }

  /** Assert URL matches expected path */
  async assertRoute(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path.replace(/[()]/g, '\\$&')));
  }

  /** Get current URL */
  async currentURL(): Promise<string> {
    return this.page.url();
  }
}
