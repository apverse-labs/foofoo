// DOC-26 / BUILD-10: Analytics & Experimentation metrics.
// Pure helpers are exported for unit testing.
// DB reads are from existing re_user_feedback + affinity tables (no new schema).

import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import type { REFeedbackSignal } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RESignalSummary {
  userId: string;
  totalSignals: number;
  bySignal: Record<REFeedbackSignal, number>;
}

export interface REAcceptanceMetrics {
  userId: string;
  totalSignals: number;
  positiveCount: number;  // LOCK + ACCEPT
  negativeCount: number;  // SWIPE_PAST + NOT_TODAY + NEVER
  acceptanceRate: number; // positiveCount / totalSignals
  neverRate: number;      // NEVER / totalSignals
  notTodayRate: number;   // NOT_TODAY / totalSignals
}

export interface REClassAcceptanceRow {
  mealClassCode: string;
  totalSignals: number;
  positiveCount: number;
  acceptanceRate: number;
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

const POSITIVE_SIGNALS = new Set<REFeedbackSignal>(['LOCK', 'ACCEPT', 'ADD_TO_GROCERY', 'TAP_RECIPE']);
const NEGATIVE_SIGNALS = new Set<REFeedbackSignal>(['SWIPE_PAST', 'NOT_TODAY', 'NEVER']);

/**
 * @summary Compute acceptance rate metrics from a signal count map.
 *
 * @description DOC-26 §5 core metrics: acceptance rate, never rate, not-today rate.
 *   Pure function — takes the signal summary, returns derived metrics.
 *
 * @param {string} userId
 * @param {Record<REFeedbackSignal, number>} bySignal - Raw signal counts.
 * @returns {REAcceptanceMetrics}
 */
export function computeAcceptanceMetrics(
  userId: string,
  bySignal: Partial<Record<REFeedbackSignal, number>>,
): REAcceptanceMetrics {
  let total = 0;
  let positive = 0;
  let negative = 0;
  let never = 0;
  let notToday = 0;

  for (const [signal, count] of Object.entries(bySignal) as [REFeedbackSignal, number][]) {
    total += count;
    if (POSITIVE_SIGNALS.has(signal)) positive += count;
    if (NEGATIVE_SIGNALS.has(signal)) negative += count;
    if (signal === 'NEVER') never += count;
    if (signal === 'NOT_TODAY') notToday += count;
  }

  return {
    userId,
    totalSignals: total,
    positiveCount: positive,
    negativeCount: negative,
    acceptanceRate: total > 0 ? positive / total : 0,
    neverRate: total > 0 ? never / total : 0,
    notTodayRate: total > 0 ? notToday / total : 0,
  };
}

/**
 * @summary Compute per-class acceptance from a list of (classCode, signal) pairs.
 *
 * @description DOC-26 §5: class acceptance rate = (LOCK+ACCEPT) / total signals per class.
 *   Pure function over in-memory data.
 *
 * @param {Array<{ mealClassCode: string; signal: REFeedbackSignal }>} rows
 * @returns {REClassAcceptanceRow[]}
 */
export function computeClassAcceptance(
  rows: Array<{ mealClassCode: string; signal: REFeedbackSignal }>,
): REClassAcceptanceRow[] {
  const byClass = new Map<string, { total: number; positive: number }>();

  for (const { mealClassCode, signal } of rows) {
    const existing = byClass.get(mealClassCode) ?? { total: 0, positive: 0 };
    existing.total += 1;
    if (POSITIVE_SIGNALS.has(signal)) existing.positive += 1;
    byClass.set(mealClassCode, existing);
  }

  return [...byClass.entries()].map(([mealClassCode, { total, positive }]) => ({
    mealClassCode,
    totalSignals: total,
    positiveCount: positive,
    acceptanceRate: total > 0 ? positive / total : 0,
  }));
}

// ── DB operations ─────────────────────────────────────────────────────────────

/**
 * @summary Fetch raw signal counts grouped by signal_type for a user.
 *
 * @param {string} userId
 * @returns {Promise<RESignalSummary>}
 */
export async function fetchUserSignalSummary(userId: string): Promise<RESignalSummary> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_feedback')
      .select('signal_type')
      .eq('profile_id', userId);
    if (error) throw error;

    const bySignal: Partial<Record<REFeedbackSignal, number>> = {};
    for (const row of (data ?? []) as { signal_type: REFeedbackSignal }[]) {
      bySignal[row.signal_type] = (bySignal[row.signal_type] ?? 0) + 1;
    }

    return {
      userId,
      totalSignals: (data ?? []).length,
      bySignal: bySignal as Record<REFeedbackSignal, number>,
    };
  } catch (err: unknown) {
    Logger.error('RE_ANALYTICS', 'fetchUserSignalSummary failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return { userId, totalSignals: 0, bySignal: {} as Record<REFeedbackSignal, number> };
  }
}

/**
 * @summary Compute acceptance metrics for a user from their feedback history.
 *
 * @param {string} userId
 * @returns {Promise<REAcceptanceMetrics>}
 */
export async function fetchUserAcceptanceMetrics(userId: string): Promise<REAcceptanceMetrics> {
  const summary = await fetchUserSignalSummary(userId);
  return computeAcceptanceMetrics(userId, summary.bySignal);
}

/**
 * @summary Compute per-class acceptance rates for a user.
 *
 * @description DOC-26 §5: class acceptance rate per meal_class_code.
 *   Only returns classes the user has interacted with.
 *
 * @param {string} userId
 * @returns {Promise<REClassAcceptanceRow[]>}
 */
export async function fetchClassAcceptanceMetrics(userId: string): Promise<REClassAcceptanceRow[]> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_feedback')
      .select('meal_class_code, signal_type')
      .eq('profile_id', userId);
    if (error) throw error;

    const rows = (data ?? []) as { meal_class_code: string; signal_type: REFeedbackSignal }[];
    return computeClassAcceptance(
      rows.map((r) => ({ mealClassCode: r.meal_class_code, signal: r.signal_type })),
    );
  } catch (err: unknown) {
    Logger.error('RE_ANALYTICS', 'fetchClassAcceptanceMetrics failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return [];
  }
}

/**
 * @summary Count hard-constraint violations across all user feedback.
 *
 * @description DOC-26 §5: constraint violation count should be zero in a healthy system.
 *   A violation is a NEVER signal that was later un-done via NEVER_REMOVE — meaning
 *   a dish was shown after a NEVER. In practice we count distinct dishOptionIds that
 *   have both a NEVER and a subsequent non-NEVER positive signal (LOCK/ACCEPT).
 *
 * @param {string} userId
 * @returns {Promise<number>} Number of apparent constraint violations.
 */
export async function fetchConstraintViolationCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_dish_affinity')
      .select('dish_option_id, is_never, accept_count, lock_count')
      .eq('profile_id', userId)
      .eq('is_never', true);
    if (error) throw error;

    // A violation = dish still marked is_never but has accept or lock count > 0
    // (means it was positively interacted with while on the Never list)
    return ((data ?? []) as { accept_count: number; lock_count: number }[])
      .filter((r) => r.accept_count > 0 || r.lock_count > 0)
      .length;
  } catch (err: unknown) {
    Logger.error('RE_ANALYTICS', 'fetchConstraintViolationCount failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return 0;
  }
}
