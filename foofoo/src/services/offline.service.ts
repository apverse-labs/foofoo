/**
 * @summary Manages offline plan caching and a pending-action sync queue.
 *
 * @description
 * Two capabilities:
 *   1. CACHE — when a plan loads successfully, persist it to AsyncStorage.
 *      On the next cold start with no connectivity, surface that cached plan
 *      instead of an empty screen.
 *   2. QUEUE — when a user fires a never/lock/log gesture while offline,
 *      append it to a per-user queue. On reconnect, drain the queue.
 *
 * AsyncStorage keys:
 *   - foofoo_plan_cache_<userId>_<planDate>      — { plan, cachedAt }
 *   - foofoo_pending_actions_<userId>            — PendingAction[]
 *
 * Fire-and-forget by design. Never throws to the caller; failures log + degrade.
 *
 * @calledBy useHomeScreen, feedback.repository (logSuggestionAction)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Logger } from '../utils/systemLogger';
import type { GeneratedPlan } from '../types';

export type PendingAction =
  | { type: 'never'; queuedAt?: string; dishId: number; reason?: string }
  | { type: 'lock'; queuedAt?: string; planId: string; lockedSlots: string[] }
  | { type: 'suggestion_log'; queuedAt?: string; logData: Record<string, unknown> };

const planKey = (userId: string, planDate: string) => `foofoo_plan_cache_${userId}_${planDate}`;
const queueKey = (userId: string) => `foofoo_pending_actions_${userId}`;

const MAX_QUEUE_SIZE = 100;
const QUEUE_TRIM_BATCH = 10;

export const OfflineService = {
  /**
   * @summary Caches today's plan so a cold-start offline still has something to show.
   * @param userId  Supabase auth UUID
   * @param planDate YYYY-MM-DD
   * @param plan    Full GeneratedPlan envelope
   */
  async cachePlan(userId: string, planDate: string, plan: GeneratedPlan): Promise<void> {
    try {
      const payload = JSON.stringify({ plan, cachedAt: new Date().toISOString() });
      await AsyncStorage.setItem(planKey(userId, planDate), payload);
      Logger.debug('OFFLINE', 'Plan cached', { date: planDate });
    } catch (err) {
      Logger.warn('OFFLINE', 'cachePlan failed', { error: (err as Error).message });
    }
  },

  /**
   * @summary Retrieves cached plan if present, else null.
   */
  async getCachedPlan(userId: string, planDate: string): Promise<GeneratedPlan | null> {
    try {
      const raw = await AsyncStorage.getItem(planKey(userId, planDate));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { plan: GeneratedPlan; cachedAt: string };
      Logger.info('OFFLINE', 'Serving cached plan', { date: planDate, cachedAt: parsed.cachedAt });
      return parsed.plan;
    } catch {
      return null;
    }
  },

  /**
   * @summary Appends an action to the user's pending-action queue.
   */
  async queueAction(userId: string, action: PendingAction): Promise<void> {
    try {
      const k = queueKey(userId);
      const raw = await AsyncStorage.getItem(k);
      let queue: PendingAction[] = raw ? JSON.parse(raw) : [];
      // Cap queue to MAX_QUEUE_SIZE — drop oldest QUEUE_TRIM_BATCH so a long
      // offline session doesn't grow AsyncStorage without bound.
      if (queue.length >= MAX_QUEUE_SIZE) {
        const dropped = queue.length - (MAX_QUEUE_SIZE - QUEUE_TRIM_BATCH);
        queue = queue.slice(dropped);
        Logger.warn('OFFLINE', 'Queue full — dropped oldest actions', { dropped });
      }
      queue.push({ ...action, queuedAt: new Date().toISOString() });
      await AsyncStorage.setItem(k, JSON.stringify(queue));
      Logger.info('OFFLINE', 'Action queued', { type: action.type, queueLen: queue.length });
    } catch (err) {
      Logger.warn('OFFLINE', 'queueAction failed', { error: (err as Error).message });
    }
  },

  /**
   * @summary Drains the queue on reconnect. Anything that fails to sync stays.
   */
  async syncPendingActions(userId: string): Promise<{ synced: number; failed: number }> {
    try {
      const k = queueKey(userId);
      const raw = await AsyncStorage.getItem(k);
      if (!raw) return { synced: 0, failed: 0 };
      const queue: PendingAction[] = JSON.parse(raw);
      if (queue.length === 0) return { synced: 0, failed: 0 };

      Logger.info('OFFLINE', `Syncing ${queue.length} pending actions`);
      const failed: PendingAction[] = [];

      for (const action of queue) {
        try {
          if (action.type === 'never') {
            const { error } = await supabase.from('never_list').insert({
              user_id: userId,
              dish_id: action.dishId,
              reason: action.reason ?? null,
              created_at: action.queuedAt,
              is_active: true,
            });
            if (error) throw error;
          } else if (action.type === 'lock') {
            const { error } = await supabase
              .from('planner')
              .update({ locked_slots: action.lockedSlots })
              .eq('id', action.planId);
            if (error) throw error;
          } else if (action.type === 'suggestion_log') {
            const { error } = await supabase.from('suggestion_logs').insert(action.logData);
            if (error) throw error;
          }
        } catch (err) {
          Logger.warn('OFFLINE', 'Sync failed for action', {
            type: action.type, error: (err as Error).message,
          });
          failed.push(action);
        }
      }

      if (failed.length === 0) {
        await AsyncStorage.removeItem(k);
        Logger.info('OFFLINE', 'All pending actions synced');
      } else {
        await AsyncStorage.setItem(k, JSON.stringify(failed));
      }

      return { synced: queue.length - failed.length, failed: failed.length };
    } catch (err) {
      Logger.warn('OFFLINE', 'syncPendingActions failed', { error: (err as Error).message });
      return { synced: 0, failed: 0 };
    }
  },
};
