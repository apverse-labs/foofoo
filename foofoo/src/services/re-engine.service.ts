// DOC-23 / BUILD-08: App-facing RE service entry point.
// The app (and UI components) call ONLY these functions — never individual repositories.
// Internally: reads the user's assigned engine version, resolves the right engine, delegates.

import { supabaseRE } from './supabase-re';
import { resolveEngineVersion, createEngine } from '../re-engine/resolver/engineResolver';
import { Logger } from '../utils/systemLogger';
import type { MealPlanningREEngine, RETodayView } from '../re-engine/interface/MealPlanningREEngine';
import type { REFeedbackSignal } from '../types';

async function getEngine(userId: string): Promise<MealPlanningREEngine> {
  const { data } = await supabaseRE
    .from('profiles')
    .select('re_engine_version')
    .eq('id', userId)
    .maybeSingle();
  const version = resolveEngineVersion(
    (data as { re_engine_version?: string | null } | null)?.re_engine_version,
  );
  return createEngine(version);
}

/**
 * Return everything the home screen needs for today: day plan, dish candidates, add-ons.
 * Single round-trip from the component's perspective.
 */
export async function getTodayView(userId: string): Promise<RETodayView> {
  try {
    const engine = await getEngine(userId);
    return engine.getTodayView({ userId });
  } catch (err: unknown) {
    Logger.error('RE_ENGINE_SERVICE', 'getTodayView failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    throw err;
  }
}

/**
 * Trigger (re-)generation of the user's weekly class plan.
 * Call after onboarding completion or on manual user refresh.
 */
export async function generateWeeklyPlan(userId: string, forceRegenerate = false): Promise<void> {
  const engine = await getEngine(userId);
  await engine.generateWeeklyPlan({ userId, forceRegenerate });
}

/**
 * Record a dish feedback signal through the active engine.
 * Wrapper kept thin — signal routing is uniform across all current RE versions.
 */
export async function submitFeedback(
  userId: string,
  dishOptionId: string,
  mealClassCode: string,
  signal: REFeedbackSignal,
): Promise<void> {
  const engine = await getEngine(userId);
  await engine.recordFeedback({ userId, dishOptionId, mealClassCode, signal });
}
