/**
 * @summary Repository for the 7-day Week View grid on the Home screen.
 *
 * @description
 * Builds the 7-day window centred on the requested weekStartDate (Monday).
 * Joins each planner row with the slot's dish hero info for grid rendering.
 * Days that have no planner row are returned as null so the UI can show a "+"
 * button for future days or a dash for past days.
 *
 * @calledBy src/components/planner/WeekView.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import { getTodayIST } from './plans.repository';
import type { DietType } from '../types';

export interface WeekSlotDish {
  id: number;
  name: string;
  hero_image_url: string | null;
  cloudinary_public_id: string | null;
  blurhash: string | null;
  diet_type: DietType;
}

export interface WeekPlanRow {
  id: string;
  plan_date: string;
  locked_slots: string[];
  breakfast: WeekSlotDish | null;
  lunch: WeekSlotDish | null;
  dinner: WeekSlotDish | null;
}

export interface DayPlan {
  date: string;
  isToday: boolean;
  isPast: boolean;
  plan: WeekPlanRow | null;
}

/**
 * @summary Returns ISO Monday date for the week containing the given date.
 *
 * @description Treats Sunday (getDay()===0) as the END of the previous week,
 *   shifting back 6 days. Other days shift back to the most recent Monday.
 *
 * @param {string} date - YYYY-MM-DD anchor date
 * @returns {string} Monday of the same calendar week in YYYY-MM-DD
 */
export function weekStartFromDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

/**
 * @summary Shifts a YYYY-MM-DD string by N days (calendar arithmetic, not UTC).
 * @param {string} date - Anchor date
 * @param {number} days - Days to add (negative ok)
 * @returns {string} Resulting YYYY-MM-DD
 */
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * @summary Fetches a user's 7-day meal plan window for the Week View.
 *
 * @description Loads planner rows for [weekStartDate, weekStartDate+6] and
 *   joins each slot's hero dish. Missing rows produce null slots so the UI
 *   can render past/future state without extra fetches.
 *
 * @param {string} userId - Auth UUID
 * @param {string} weekStartDate - Monday of the week (YYYY-MM-DD)
 * @returns {Promise<DayPlan[]>} 7-day array, each entry has date + plan (or null)
 * @throws never — query failures degrade to all-null plans + log warning
 *
 * @calledBy src/components/planner/WeekView.tsx on mount and week navigation
 */
export async function getWeekPlans(userId: string, weekStartDate: string): Promise<DayPlan[]> {
  const today = getTodayIST();
  const dates: string[] = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  // planner.{breakfast,lunch,dinner}_ref_id are polymorphic (ref_type='dish'|'combo')
  // and have no FK to dishes — so PostgREST can't auto-embed. We do two queries
  // and stitch them in JS, mirroring fetchCarousel() in the RE Edge Function.
  let rows: WeekPlanRow[] = [];
  try {
    const { data: plannerRows, error: plannerErr } = await supabase
      .from('planner')
      .select('id, plan_date, locked_slots, breakfast_ref_id, lunch_ref_id, dinner_ref_id')
      .eq('user_id', userId)
      .in('plan_date', dates);
    if (plannerErr) throw plannerErr;

    type RawPlanner = {
      id: string;
      plan_date: string;
      locked_slots: string[] | null;
      breakfast_ref_id: number | null;
      lunch_ref_id: number | null;
      dinner_ref_id: number | null;
    };
    const raw = (plannerRows ?? []) as RawPlanner[];

    const dishIds = new Set<number>();
    for (const p of raw) {
      if (p.breakfast_ref_id != null) dishIds.add(p.breakfast_ref_id);
      if (p.lunch_ref_id != null) dishIds.add(p.lunch_ref_id);
      if (p.dinner_ref_id != null) dishIds.add(p.dinner_ref_id);
    }

    let dishMap = new Map<number, WeekSlotDish>();
    if (dishIds.size > 0) {
      const { data: dishRows, error: dishErr } = await supabase
        .from('dishes')
        .select('id, name, hero_image_url, cloudinary_public_id, blurhash, diet_type')
        .in('id', Array.from(dishIds));
      if (dishErr) throw dishErr;
      dishMap = new Map((dishRows as WeekSlotDish[] | null ?? []).map(d => [d.id, d]));
    }

    rows = raw.map(p => ({
      id: p.id,
      plan_date: p.plan_date,
      locked_slots: p.locked_slots ?? [],
      breakfast: p.breakfast_ref_id != null ? dishMap.get(p.breakfast_ref_id) ?? null : null,
      lunch:     p.lunch_ref_id     != null ? dishMap.get(p.lunch_ref_id)     ?? null : null,
      dinner:    p.dinner_ref_id    != null ? dishMap.get(p.dinner_ref_id)    ?? null : null,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    Logger.warn('WEEK-REPO', 'getWeekPlans failed (non-fatal)', { error: msg, weekStartDate });
  }

  return dates.map(date => {
    const plan = rows.find(r => r.plan_date === date) ?? null;
    return {
      date,
      isToday: date === today,
      isPast: date < today,
      plan,
    };
  });
}
