import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { E2E_CONFIG } from '../e2e-config';

const C = E2E_CONFIG.copy.home;

export class HomePage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.page.goto(E2E_CONFIG.routes.home);
    await this.waitForLoad();
  }

  // ── View toggles ───────────────────────────────────────────────────────────

  async assertLoaded(): Promise<void> {
    // App name in header should be visible. LoadingScreen and the loaded
    // home view each render their own "Foofoo" header and are mutually
    // exclusive in React state, but during the loading->loaded transition
    // (and web hydration) both nodes can be momentarily present in the DOM,
    // so match the first rather than requiring exactly one.
    await expect(this.page.getByText(E2E_CONFIG.copy.appName).first()).toBeVisible({
      timeout: E2E_CONFIG.timeouts.pageLoad,
    });
    // Wait for the loading skeleton to clear so subsequent assertions run
    // against the fully-loaded home view, not the transitional state.
    await this.page.getByText(/breakfast|lunch|dinner/i).first().waitFor({
      state: 'visible',
      timeout: E2E_CONFIG.timeouts.pageLoad,
    }).catch(() => {});
    // Either Day or Week tab should be visible
    const dayOrWeek = this.page.getByText(C.dayTab).or(this.page.getByText(C.weekTab));
    await expect(dayOrWeek.first()).toBeVisible();
  }

  async switchToWeekView(): Promise<void> {
    await this.page.getByText(C.weekTab).click();
    await this.waitForAnimation();
  }

  async switchToDayView(): Promise<void> {
    await this.page.getByText(C.dayTab).click();
    await this.waitForAnimation();
  }

  // ── Meal slots ─────────────────────────────────────────────────────────────

  async assertMealSlotsVisible(): Promise<void> {
    // Breakfast / Lunch / Dinner slot labels appear in the plan
    const slots = ['Breakfast', 'Lunch', 'Dinner'];
    for (const slot of slots) {
      await expect(this.page.getByText(slot).first()).toBeVisible({
        timeout: E2E_CONFIG.timeouts.apiCall,
      });
    }
  }

  async getMealCardTexts(): Promise<string[]> {
    // Meal cards contain dish names — collect all visible text blocks on home screen
    const cards = await this.page
      .locator('[data-testid*="meal-card"], .meal-card')
      .allTextContents();
    return cards;
  }

  async getDishNamesFromPage(): Promise<string[]> {
    // Fallback: collect all dish name text visible on screen
    // Dish names appear as prominent text in each carousel slot
    await this.waitForAnimation();
    const headings = await this.page.locator('h2, h3').allTextContents();
    return headings.filter(t => t.trim().length > 2);
  }

  // ── Offline banner ─────────────────────────────────────────────────────────

  async isOfflineBannerVisible(): Promise<boolean> {
    try {
      return await this.page.getByText(C.offlineBanner).isVisible();
    } catch {
      return false;
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoProfile(): Promise<void> {
    await this.page.goto(E2E_CONFIG.routes.profile);
    await this.waitForLoad();
  }

  async gotoSearch(): Promise<void> {
    // Search icon in top bar
    await this.page
      .getByRole('link', { name: /search/i })
      .click()
      .catch(async () => {
        await this.page.goto(E2E_CONFIG.routes.search);
      });
    await this.waitForLoad();
  }
}
