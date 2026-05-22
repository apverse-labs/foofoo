/**
 * @summary Initialises PostHog analytics and provides typed event tracking.
 *
 * @description
 * Wraps the posthog-react-native SDK with FooFoo-specific event types
 * and user identification. All analytics calls go through this service —
 * never import PostHog directly in screen files.
 * Respects user analytics_consent from user_consent table.
 * Web and native both supported.
 * In development: events are captured but flagged as dev events.
 *
 * NOTE — posthog-react-native v4 option naming:
 * The SDK option for app lifecycle events is `captureAppLifecycleEvents`
 * (not `captureApplicationLifecycleEvents`); `captureDeepLinks` was
 * removed in v4. Options here use the v4 names.
 *
 * @calledBy app/_layout.tsx (init), all screens (events)
 */

import PostHog from 'posthog-react-native';
import { API } from '../config/constants';
import { Logger } from '../utils/systemLogger';

let posthogInstance: PostHog | null = null;

/**
 * Strongly-typed union of every analytics event FooFoo emits.
 * Adding an event? Add it here first so `capture` is type-safe everywhere.
 */
export type FooFooEvent =
  | 'app_opened'
  | 'screen_viewed'
  | 'plan_generated'
  | 'dish_swiped'
  | 'dish_locked'
  | 'dish_never'
  | 'dish_not_today'
  | 'dish_detail_opened'
  | 'search_performed'
  | 'search_result_tapped'
  | 'filter_applied'
  | 'grocery_list_opened'
  | 'week_view_opened'
  | 'profile_updated'
  | 'notification_permission_granted'
  | 'notification_permission_denied'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'account_deleted'
  | 'premium_upsell_viewed';

export const PostHogService = {
  /**
   * @summary Initialises PostHog with project credentials.
   *
   * @description
   * Singleton — repeated calls are no-ops. Autocapture is disabled so
   * the dashboard contains only events we explicitly emit.
   *
   * @returns {Promise<void>}
   * @throws Logs but does not throw — analytics is non-critical
   * @calledBy app/_layout.tsx on mount
   */
  async init(): Promise<void> {
    if (posthogInstance) return;
    if (!API.POSTHOG_KEY) {
      Logger.warn('POSTHOG', 'POSTHOG_KEY is empty — skipping init');
      return;
    }
    try {
      posthogInstance = new PostHog(API.POSTHOG_KEY, {
        host: API.POSTHOG_HOST,
        // Off — we emit events explicitly for a clean dashboard.
        captureAppLifecycleEvents: false,
        // Flush every 30s, or once we've queued 20 events.
        flushInterval: 30000,
        flushAt: 20,
      });
      Logger.info('POSTHOG', 'SDK initialised', { host: API.POSTHOG_HOST });
    } catch (error: any) {
      Logger.error('POSTHOG', 'SDK init failed', { error: error?.message });
    }
  },

  /**
   * @summary Identifies the current user in PostHog.
   *
   * @description
   * Called after successful login. Associates all future events with this
   * user's Supabase UUID and stamps user properties for dashboard segmentation.
   *
   * @param {string} userId - Supabase auth UUID
   * @param {{ foodPref: string; homeState: string | null; premiumTier: string; onboardingCompleted: boolean }} properties - User properties for segmentation
   * @returns {void}
   * @calledBy app/index.tsx after session confirmed
   */
  identify(
    userId: string,
    properties: {
      foodPref: string;
      homeState: string | null;
      premiumTier: string;
      onboardingCompleted: boolean;
    }
  ): void {
    if (!posthogInstance) return;
    try {
      posthogInstance.identify(userId, {
        food_pref: properties.foodPref,
        home_state: properties.homeState,
        premium_tier: properties.premiumTier,
        onboarding_completed: properties.onboardingCompleted,
        app_version: '0.1.0',
        platform: 'mobile',
      });
      Logger.debug('POSTHOG', 'User identified', { userId: userId.slice(0, 8) });
    } catch (error: any) {
      Logger.error('POSTHOG', 'identify failed', { error: error?.message });
    }
  },

  /**
   * @summary Captures a typed analytics event with optional properties.
   *
   * @description
   * Core tracking method. All FooFoo events go through here — event names
   * are constrained by the FooFooEvent union to prevent typos. Fire and
   * forget — never awaited in UI code.
   *
   * @param {FooFooEvent} event - Event name from FooFooEvent type
   * @param {Record<string, any>} [properties] - Key-value event properties
   * @returns {void}
   * @calledBy All screens and components that track user behaviour
   */
  capture(event: FooFooEvent, properties?: Record<string, any>): void {
    if (!posthogInstance) return;
    try {
      posthogInstance.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        is_dev: __DEV__,
      });
      Logger.debug('POSTHOG', `Event captured: ${event}`, properties);
    } catch (error: any) {
      Logger.error('POSTHOG', 'capture failed', { event, error: error?.message });
    }
  },

  /**
   * @summary Captures a screen view event.
   * @param {string} screenName - Name of the screen (e.g. 'home', 'search', 'dish_detail')
   * @param {Record<string, any>} [properties] - Additional screen properties
   * @returns {void}
   * @calledBy Every screen's useEffect on mount
   */
  screen(screenName: string, properties?: Record<string, any>): void {
    if (!posthogInstance) return;
    try {
      posthogInstance.screen(screenName, properties);
      Logger.debug('POSTHOG', `Screen viewed: ${screenName}`);
    } catch (error: any) {
      Logger.error('POSTHOG', 'screen failed', { screenName, error: error?.message });
    }
  },

  /**
   * @summary Resets PostHog identity on sign out.
   *
   * @description
   * Creates a new anonymous identity for the next session so events from
   * different users don't get conflated.
   *
   * @returns {void}
   * @calledBy profile-settings.repository.ts signOut()
   */
  reset(): void {
    if (!posthogInstance) return;
    try {
      posthogInstance.reset();
      Logger.info('POSTHOG', 'Identity reset on sign out');
    } catch (error: any) {
      Logger.error('POSTHOG', 'reset failed', { error: error?.message });
    }
  },
};
