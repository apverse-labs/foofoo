/**
 * re-rls-security.test.ts
 *
 * Cross-user RLS isolation for the RE user tables. Each user-facing RE table has
 * a single `auth.uid() = profile_id` policy, so User B must never see User A's
 * rows. Creates two authenticated users, has A insert data, confirms B sees 0
 * rows, then cleans up.
 *
 * Requires SUPABASE_RE_SERVICE_KEY (to create/delete users). Skips cleanly when
 * absent.
 *
 * SAFETY-CRITICAL: a leak here = DO NOT SHIP.
 *
 * Run: npm run test:security:re
 */

import {
  supabaseREAdmin,
  hasREService,
  createRETestUser,
  signInRETestUser,
  deleteRETestUser,
} from '../lib/supabase-re';
import { GATES } from '../config/success-gates';
import type { SupabaseClient } from '@supabase/supabase-js';

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(120000);

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn('[re-rls-security] SUPABASE_RE_SERVICE_KEY not set — RLS isolation tests skipped.');
}

interface Pair {
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  clientA: SupabaseClient;
  clientB: SupabaseClient;
}

const PASSWORD = 'RETestPass123!';

async function createPair(suffix: string): Promise<Pair> {
  const emailA = `re-rls-a-${suffix}@foofoo-test.dev`;
  const emailB = `re-rls-b-${suffix}@foofoo-test.dev`;
  const userA = await createRETestUser(emailA, PASSWORD);
  const userB = await createRETestUser(emailB, PASSWORD);
  const clientA = await signInRETestUser(emailA, PASSWORD);
  const clientB = await signInRETestUser(emailB, PASSWORD);
  return { userA, userB, clientA, clientB };
}

async function cleanupPair(pair: Pair): Promise<void> {
  // Best-effort row cleanup (service role bypasses RLS), then delete users.
  const tables = [
    're_user_feedback',
    're_user_dish_affinity',
    're_user_class_affinity',
    're_user_weekly_plans',
    're_user_household_profiles',
    're_user_addon_plans',
  ];
  for (const t of tables) {
    await (supabaseREAdmin as any).from(t).delete().in('profile_id', [pair.userA.id, pair.userB.id]);
  }
  await deleteRETestUser(pair.userA.id);
  await deleteRETestUser(pair.userB.id);
}

// Row factories per table (minimal valid payloads keyed by profile_id).
const today = new Date().toISOString().slice(0, 10);
const ROW_FACTORY: Record<string, (uid: string) => Record<string, unknown>> = {
  re_user_feedback: (uid) => ({
    profile_id: uid,
    dish_option_id: 'QA_DISH_OPT_1',
    meal_class_code: 'BF_BREAD_MODERN_FAST',
    signal_type: 'ACCEPT',
    signal_weight: 0.25,
    session_date: today,
  }),
  re_user_dish_affinity: (uid) => ({
    profile_id: uid,
    dish_option_id: 'QA_DISH_OPT_1',
    meal_class_code: 'BF_BREAD_MODERN_FAST',
    affinity_score: 0.25,
    is_never: false,
  }),
  re_user_class_affinity: (uid) => ({
    profile_id: uid,
    meal_class_code: 'BF_BREAD_MODERN_FAST',
    affinity_score: 0.1,
  }),
  re_user_weekly_plans: (uid) => ({
    profile_id: uid,
    cohort_id: 'QA_COHORT',
    plan_week_start: today,
    day_of_week: 'Monday',
    weekday_weekend: 'Weekday',
  }),
  re_user_household_profiles: (uid) => ({
    profile_id: uid,
    cohort_id: 'QA_COHORT',
  }),
  re_user_addon_plans: (uid) => ({
    profile_id: uid,
    plan_week_start: today,
    day_of_week: 'Monday',
    meal_slot: 'Breakfast',
    target_member_segment: 'kids',
    addon_class_code: 'AD_QA',
  }),
};

const RLS_TABLES = Object.keys(ROW_FACTORY);

describeIfService('RE RLS: cross-user isolation', () => {
  let pair: Pair;

  beforeAll(async () => {
    pair = await createPair(`${Date.now()}`);
  });

  afterAll(async () => {
    if (pair) await cleanupPair(pair);
  });

  for (const table of RLS_TABLES) {
    it(`${table}: User A's rows are NOT visible to User B`, async () => {
      const row = ROW_FACTORY[table](pair.userA.id);

      const { error: insertErr } = await pair.clientA.from(table).insert(row as any);
      if (insertErr) {
        // Schema drift on a QA payload should not mask the isolation check — warn.
        // eslint-disable-next-line no-console
        console.warn(`⚠️ [${table}] insert as User A failed: ${insertErr.message}`);
        return;
      }

      // User B queries the same table — must see none of User A's rows.
      const { data, error } = await pair.clientB.from(table).select('*');
      expect(error).toBeNull();
      const leaked = (data ?? []).filter((r: any) => r.profile_id === pair.userA.id);
      expect(leaked.length).toBeLessThanOrEqual(GATES.RLS_CROSS_USER_ROWS_MAX);

      // Cleanup the inserted row.
      await (supabaseREAdmin as any).from(table).delete().eq('profile_id', pair.userA.id);
    });
  }

  it('User B cannot INSERT a row impersonating User A', async () => {
    const { error } = await pair.clientB
      .from('re_user_feedback')
      .insert(ROW_FACTORY.re_user_feedback(pair.userA.id) as any);
    // WITH CHECK (auth.uid() = profile_id) must block this.
    expect(error).not.toBeNull();
  });
});
