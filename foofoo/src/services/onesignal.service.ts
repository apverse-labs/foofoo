/**
 * @summary Initialises OneSignal SDK and manages push notification lifecycle.
 *
 * @description
 * Handles OneSignal initialisation, permission requests, and push
 * subscription ID registration. Called once on app startup from _layout.tsx.
 * Stores the OneSignal subscription ID in profiles.onesignal_player_id so
 * the notification Edge Function can target this specific device via the
 * OneSignal REST API (`include_player_ids` / `include_subscription_ids`).
 *
 * Platform-aware: initialisation is skipped on web (browser push is Phase 2).
 *
 * NOTE — react-native-onesignal v5 API:
 * The v5 SDK is a major rewrite from v4. Method names changed (initialize,
 * Debug.setLogLevel, Notifications.requestPermission, User.pushSubscription).
 * v5 uses "subscription IDs" instead of "player IDs" but the column name
 * onesignal_player_id is kept for historical reasons.
 *
 * @calledBy app/_layout.tsx useEffect on mount
 */

import { Platform } from 'react-native';
import { API } from '../config/constants';
import { supabase } from './supabase';
import { Logger } from '../utils/systemLogger';

export const OneSignalService = {
  /**
   * @summary Initialises the OneSignal SDK with the app ID.
   *
   * @description
   * Must be called before any other OneSignal method.
   * Sets log level to Verbose in dev. Skipped on web.
   *
   * @returns {Promise<void>}
   * @throws Logs and swallows errors — never throws (notifications are non-critical)
   * @calledBy app/_layout.tsx on mount (before auth check)
   */
  async init(): Promise<void> {
    if (Platform.OS === 'web') {
      Logger.info('ONESIGNAL', 'Skipping init on web platform');
      return;
    }
    if (!API.ONESIGNAL_APP_ID) {
      Logger.warn('ONESIGNAL', 'ONESIGNAL_APP_ID is empty — skipping init');
      return;
    }
    try {
      const mod: any = await import('react-native-onesignal');
      const OneSignal = mod.OneSignal ?? mod.default;
      // v5: log level enum is exported from the module
      if (OneSignal?.Debug?.setLogLevel) {
        const verbose = mod.LogLevel?.Verbose ?? 6;
        OneSignal.Debug.setLogLevel(verbose);
      }
      OneSignal.initialize(API.ONESIGNAL_APP_ID);
      Logger.info('ONESIGNAL', 'SDK initialised', { appId: API.ONESIGNAL_APP_ID });
    } catch (error: any) {
      Logger.error('ONESIGNAL', 'SDK init failed', { error: error?.message });
    }
  },

  /**
   * @summary Requests push notification permission from the user.
   *
   * @description
   * Shows the system permission dialog on iOS.
   * Android 13+ also needs explicit permission (handled by SDK).
   * Called from onboarding Step 7 "Almost There" screen.
   *
   * @returns {Promise<boolean>} true if permission granted, false otherwise
   * @calledBy app/(onboarding)/step-7.tsx notification permission button
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const mod: any = await import('react-native-onesignal');
      const OneSignal = mod.OneSignal ?? mod.default;
      const accepted: boolean = await OneSignal.Notifications.requestPermission(true);
      Logger.info('ONESIGNAL', 'Permission requested', { accepted });
      return !!accepted;
    } catch (error: any) {
      Logger.error('ONESIGNAL', 'Permission request failed', { error: error?.message });
      return false;
    }
  },

  /**
   * @summary Registers the device with OneSignal and saves the subscription
   *   ID to the profiles table for server-side targeting.
   *
   * @description
   * Called after successful login. Reads the OneSignal v5 push subscription ID
   * and persists it to profiles.onesignal_player_id so the notification
   * Edge Function can target this specific device via OneSignal REST.
   *
   * @param {string} userId - Supabase auth UUID
   * @returns {Promise<void>}
   * @throws Logs but does not throw — push registration is non-critical
   * @calledBy app/index.tsx after session confirmed
   */
  async registerDevice(userId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const mod: any = await import('react-native-onesignal');
      const OneSignal = mod.OneSignal ?? mod.default;
      const sub = OneSignal.User?.pushSubscription;
      // v5 exposes both `id` (sync getter) and `getIdAsync()`
      let subscriptionId: string | null | undefined =
        typeof sub?.getIdAsync === 'function' ? await sub.getIdAsync() : sub?.id;

      if (!subscriptionId) {
        Logger.warn('ONESIGNAL', 'No subscription ID available yet — may need permission first');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_player_id: subscriptionId })
        .eq('id', userId);

      if (error) {
        Logger.error('ONESIGNAL', 'Failed to persist subscription ID', { error: error.message });
        return;
      }

      Logger.info('ONESIGNAL', 'Device registered', {
        userId: userId.slice(0, 8),
        playerId: subscriptionId.slice(0, 8) + '...',
      });
    } catch (error: any) {
      Logger.error('ONESIGNAL', 'Device registration failed', { error: error?.message });
    }
  },

  /**
   * @summary Registers v5 foreground + click handlers for push notifications.
   *
   * @description
   * v5: `Notifications.addEventListener('foregroundWillDisplay', ...)` is the
   * replacement for v4's setNotificationWillShowInForegroundHandler. We
   * deliberately do NOT call event.preventDefault(), which is what suppresses
   * the foreground banner — the user is already in-app, so no need to interrupt.
   * `addEventListener('click', ...)` replaces setNotificationOpenedHandler.
   *
   * @returns {void}
   * @calledBy app/_layout.tsx on mount (immediately after init)
   */
  setupNotificationHandlers(): void {
    if (Platform.OS === 'web') return;
    import('react-native-onesignal').then((mod: any) => {
      const OneSignal = mod.OneSignal ?? mod.default;
      try {
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
          const notification = event?.notification ?? event;
          Logger.info('ONESIGNAL', 'Notification received in foreground', {
            title: notification?.title,
            type: notification?.additionalData?.type,
          });
          // Suppress the system banner — user is in-app already
          if (typeof event?.preventDefault === 'function') {
            event.preventDefault();
          }
        });

        OneSignal.Notifications.addEventListener('click', (event: any) => {
          const data = event?.notification?.additionalData ?? event?.result?.notification?.additionalData;
          Logger.info('ONESIGNAL', 'Notification tapped', { type: data?.type });
          // Deep link routing handled by Expo Router via notification URL
        });
      } catch (error: any) {
        Logger.error('ONESIGNAL', 'Handler registration failed', { error: error?.message });
      }
    });
  },
};
