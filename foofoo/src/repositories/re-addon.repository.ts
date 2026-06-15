import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import { getWeekStartMondayIST } from './re-plan.repository';
import type {
  REAddonComponent,
  REDayAddonPlan,
  RESlotAddons,
  REWeeklyAddonPlan,
} from '../types';

const ENGINE_VERSION = 'classfirst_v1';

// ── Constants ────────────────────────────────────────────────────────────────

const SHORT_TO_FULL_DAY: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const EMPTY_SLOT_ADDONS: RESlotAddons = {
  breakfast: [],
  lunch: [],
  snack: [],
  dinner: [],
};

// ── Internal DB types ─────────────────────────────────────────────────────────

interface HouseholdAddonPlanRow {
  day_of_week: string;
  meal_slot: string;
  target_member_segment: string;
  addon_class_code: string;
  addon_class_name: string;
  attached_to_main_class_code: string | null;
}

interface UserAddonPlanRow {
  day_of_week: string;
  meal_slot: string;
  target_member_segment: string;
  addon_class_code: string;
  addon_class_name: string | null;
  attached_to_primary_class: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * @summary Convert a 3-letter day code from re_household_addon_plans to full name.
 */
export function expandDayCode(shortCode: string): string {
  return SHORT_TO_FULL_DAY[shortCode] ?? shortCode;
}

/**
 * @summary Normalise a meal_slot value from seed data to the check-constraint set.
 *
 * @description Seed data uses title-case ('Breakfast', 'Lunch', 'Snack', 'Dinner').
 *   Returns the value unchanged if it already matches; falls back to null for
 *   unknown values so callers can skip them.
 */
export function normaliseMealSlot(
  raw: string,
): 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' | null {
  const map: Record<string, 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };
  return map[raw.toLowerCase()] ?? null;
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * @summary Generate and persist the member-specific add-on plan for a user.
 *
 * @description
 *   1. Reads the user's persona_id from re_user_household_profiles.
 *   2. Fetches the matching rows from re_household_addon_plans.
 *   3. Maps short day codes (Mon/Tue/…) to full names (Monday/Tuesday/…).
 *   4. Upserts one row per (profile_id, plan_week_start, day_of_week, meal_slot,
 *      target_member_segment) into re_user_addon_plans.
 *
 *   This is a best-effort operation — failures are logged but do NOT propagate,
 *   so a DB issue here never blocks onboarding completion or weekly plan display.
 *
 * @param {string} userId - Supabase auth UID (== profiles.id).
 * @returns {Promise<void>}
 *
 * @calledBy re-plan.repository.ts → generateUserWeeklyPlan
 */
export async function generateUserAddonPlan(userId: string): Promise<void> {
  try {
    const { data: profile, error: profErr } = await supabaseRE
      .from('re_user_household_profiles')
      .select('persona_id')
      .eq('profile_id', userId)
      .maybeSingle();
    if (profErr) throw profErr;

    const personaId = (profile as { persona_id: string | null } | null)?.persona_id ?? null;
    if (!personaId) {
      Logger.warn('RE_ADDON', 'generateUserAddonPlan: no persona_id, skipping', { userId });
      return;
    }

    const { data: addonRows, error: addonErr } = await supabaseRE
      .from('re_household_addon_plans')
      .select(
        'day_of_week, meal_slot, target_member_segment, '
        + 'addon_class_code, addon_class_name, attached_to_main_class_code',
      )
      .eq('persona_id', personaId);
    if (addonErr) throw addonErr;

    const rows = (addonRows ?? []) as unknown as HouseholdAddonPlanRow[];
    if (rows.length === 0) {
      Logger.info('RE_ADDON', 'generateUserAddonPlan: no addon rows for persona', { userId, personaId });
      return;
    }

    const weekStart = getWeekStartMondayIST();

    const seen = new Set<string>();
    const upsertRows = rows.flatMap((r) => {
      const fullDay = expandDayCode(r.day_of_week);
      const slot = normaliseMealSlot(r.meal_slot);
      if (!slot) return [];
      const key = `${fullDay}|${slot}|${r.target_member_segment}|${r.addon_class_code}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        profile_id: userId,
        plan_week_start: weekStart,
        day_of_week: fullDay,
        meal_slot: slot,
        target_member_segment: r.target_member_segment,
        addon_class_code: r.addon_class_code,
        addon_class_name: r.addon_class_name,
        attached_to_primary_class: r.attached_to_main_class_code ?? null,
        engine_version: ENGINE_VERSION,
      }];
    });

    if (upsertRows.length === 0) {
      Logger.warn('RE_ADDON', 'generateUserAddonPlan: all rows filtered out', { userId, personaId });
      return;
    }

    const { error: upsertErr } = await supabaseRE
      .from('re_user_addon_plans')
      .upsert(upsertRows, {
        onConflict: 'profile_id,plan_week_start,day_of_week,meal_slot,target_member_segment,addon_class_code',
      });
    if (upsertErr) throw upsertErr;

    Logger.info('RE_ADDON', 'Addon plan generated', {
      userId, personaId, addons: upsertRows.length, weekStart,
    });
  } catch (err: unknown) {
    // Addon plan is secondary — log the failure but never block onboarding or
    // weekly plan display. The root cause can be investigated via system logs.
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_ADDON', 'generateUserAddonPlan failed (non-fatal)', { error: message, userId });
  }
}

/**
 * @summary Fetch the current-week member add-on plan for a user.
 *
 * @description Returns all addon components grouped by day → slot. Returns null
 *   if no addon plan exists (e.g., household has no special-needs members).
 *
 * @param {string} userId - Supabase auth UID.
 * @param {string} [weekStart] - ISO date (YYYY-MM-DD); defaults to current IST week.
 * @returns {Promise<REWeeklyAddonPlan | null>}
 *
 * @calledBy REPlanToday component, home screen.
 */
export async function fetchUserAddonPlan(
  userId: string,
  weekStart?: string,
): Promise<REWeeklyAddonPlan | null> {
  try {
    const ws = weekStart ?? getWeekStartMondayIST();
    const { data, error } = await supabaseRE
      .from('re_user_addon_plans')
      .select(
        'day_of_week, meal_slot, target_member_segment, '
        + 'addon_class_code, addon_class_name, attached_to_primary_class',
      )
      .eq('profile_id', userId)
      .eq('plan_week_start', ws);
    if (error) throw error;

    const rows = (data ?? []) as unknown as UserAddonPlanRow[];
    if (rows.length === 0) return null;

    const dayMap = new Map<string, RESlotAddons>();

    for (const r of rows) {
      if (!dayMap.has(r.day_of_week)) {
        dayMap.set(r.day_of_week, { ...EMPTY_SLOT_ADDONS, breakfast: [], lunch: [], snack: [], dinner: [] });
      }
      const slotAddons = dayMap.get(r.day_of_week)!;
      const component: REAddonComponent = {
        addonClassCode: r.addon_class_code,
        addonClassName: r.addon_class_name ?? r.addon_class_code,
        targetMemberSegment: r.target_member_segment,
        attachedToPrimaryClass: r.attached_to_primary_class,
      };
      const slot = r.meal_slot.toLowerCase() as 'breakfast' | 'lunch' | 'snack' | 'dinner';
      if (slot in slotAddons) {
        slotAddons[slot].push(component);
      }
    }

    const days: REDayAddonPlan[] = Array.from(dayMap.entries()).map(([day, addons]) => ({
      dayOfWeek: day,
      addons,
    }));

    return { profileId: userId, planWeekStart: ws, days, engineVersion: ENGINE_VERSION };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_ADDON', 'fetchUserAddonPlan failed', { error: message, userId });
    return null;
  }
}

/**
 * @summary Fetch today's addon components for a user, grouped by meal slot.
 *
 * @description Convenience helper used by REPlanToday to avoid loading the full
 *   7-day addon plan when only today is needed.
 *
 * @param {string} userId - Supabase auth UID.
 * @returns {Promise<RESlotAddons>} Always resolves (returns empty slot addons on error).
 *
 * @calledBy REPlanToday component.
 */
export async function fetchTodayAddons(userId: string): Promise<RESlotAddons> {
  try {
    const ws = getWeekStartMondayIST();
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      timeZone: 'Asia/Kolkata',
    });

    const { data, error } = await supabaseRE
      .from('re_user_addon_plans')
      .select(
        'meal_slot, target_member_segment, addon_class_code, addon_class_name, attached_to_primary_class',
      )
      .eq('profile_id', userId)
      .eq('plan_week_start', ws)
      .eq('day_of_week', today);
    if (error) throw error;

    const rows = (data ?? []) as unknown as UserAddonPlanRow[];
    const result: RESlotAddons = { breakfast: [], lunch: [], snack: [], dinner: [] };
    for (const r of rows) {
      const slot = r.meal_slot.toLowerCase() as 'breakfast' | 'lunch' | 'snack' | 'dinner';
      if (slot in result) {
        result[slot].push({
          addonClassCode: r.addon_class_code,
          addonClassName: r.addon_class_name ?? r.addon_class_code,
          targetMemberSegment: r.target_member_segment,
          attachedToPrimaryClass: r.attached_to_primary_class,
        });
      }
    }
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_ADDON', 'fetchTodayAddons failed', { error: message, userId });
    return { breakfast: [], lunch: [], snack: [], dinner: [] };
  }
}
