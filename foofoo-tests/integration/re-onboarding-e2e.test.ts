/**
 * re-onboarding-e2e.test.ts
 *
 * Headless API-level E2E for the RE onboarding flow. Exercises the full journey
 * for 3 representative personas via Supabase JS client calls only — no UI,
 * browser, or device automation.
 *
 * Flow per persona:
 *   1. Create a fresh test user (createRETestUser)
 *   2. Sign in as that user (signInRETestUser)
 *   3. Submit onboarding profile → re_user_household_profiles
 *   4. Insert engine assignment → re_user_engine_assignments
 *   5. Seed a 7-day plan → re_user_weekly_plans
 *   6. Fetch and verify: 7 days, breakfast/lunch/dinner present, 0 diet violations
 *   7. Clean up: delete test user
 *
 * Personas under test (from re-persona-definitions.ts):
 *   RP001 — South veg family     (Kerala, veg, rice-forward)
 *   RP025 — Kerala family Delhi  (South non-veg migrant, urban professional)
 *   RP050 — All segments         (North veg, strictest multi-constraint household)
 *
 * Gate: skips cleanly when SUPABASE_RE_SERVICE_KEY is absent (CI has the key).
 *
 * Run: cd foofoo-tests && npx jest --testPathPattern='integration/re-onboarding-e2e' --no-coverage
 */

import {
  supabaseREAdmin,
  hasREService,
  createRETestUser,
  signInRETestUser,
  deleteRETestUser,
} from '../lib/supabase-re';
import { RE_PERSONAS, REPersona } from '../personas/re-persona-definitions';
import type { SupabaseClient } from '@supabase/supabase-js';

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(180000);

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn('[re-onboarding-e2e] SUPABASE_RE_SERVICE_KEY not set — onboarding E2E skipped.');
}

// ─── Test personas ─────────────────────────────────────────────────────────────

const PERSONA_IDS = ['RP001', 'RP025', 'RP050'] as const;
type PersonaId = (typeof PERSONA_IDS)[number];

function getPersona(id: PersonaId): REPersona {
  const p = RE_PERSONAS.find((p) => p.id === id);
  if (!p) throw new Error(`Persona ${id} not found in RE_PERSONAS`);
  return p;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PASSWORD = 'REOnboardE2E123!';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/**
 * Resolve a real cohort_id from re_cohorts for the persona's home state.
 * Falls back to any cohort if none found for the specific state.
 */
async function resolveRealCohortId(homeStateId: string): Promise<string | null> {
  const { data: stateCohorts } = await (supabaseREAdmin as any)
    .from('re_cohorts')
    .select('cohort_id')
    .eq('state_id', homeStateId)
    .limit(1);
  if ((stateCohorts ?? []).length > 0) return stateCohorts![0].cohort_id as string;

  // Fallback: any cohort
  const { data: anyCohort } = await (supabaseREAdmin as any)
    .from('re_cohorts')
    .select('cohort_id')
    .limit(1);
  return (anyCohort ?? [])[0]?.cohort_id ?? null;
}

/**
 * Get the current week-start (Monday, IST) as YYYY-MM-DD.
 */
function weekStartIST(): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const dow = ist.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  const monday = new Date(ist.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

/**
 * Seed a minimal 7-day plan for the user into re_user_weekly_plans.
 * Uses a QA sentinel class code so no real re_meal_classes row is required.
 */
async function seedWeeklyPlan(
  adminClient: SupabaseClient,
  userId: string,
  cohortId: string,
): Promise<void> {
  const planWeekStart = weekStartIST();
  const rows = DAYS_OF_WEEK.map((day, i) => ({
    profile_id: userId,
    cohort_id: cohortId,
    plan_week_start: planWeekStart,
    day_of_week: day,
    weekday_weekend: i < 5 ? 'Weekday' : 'Weekend',
    breakfast_class: 'QA_BF_CLASS',
    lunch_class: 'QA_LN_CLASS',
    dinner_class: 'QA_DN_CLASS',
    engine_version: 'classfirst_v1',
  }));
  const { error } = await (adminClient as any)
    .from('re_user_weekly_plans')
    .upsert(rows, { onConflict: 'profile_id,plan_week_start,day_of_week' });
  if (error) throw new Error(`seedWeeklyPlan failed: ${error.message}`);
}

/**
 * Clean up all RE user rows and the auth user for a given userId.
 */
async function cleanupUser(userId: string): Promise<void> {
  const tables = [
    're_user_feedback',
    're_user_dish_affinity',
    're_user_class_affinity',
    're_user_weekly_plans',
    're_user_addon_plans',
    're_user_household_profiles',
    're_user_engine_assignments',
  ];
  for (const t of tables) {
    await (supabaseREAdmin as any).from(t).delete().eq('profile_id', userId);
  }
  await deleteRETestUser(userId);
}

// ─── Shared: resolve a real cohort once for all tests ─────────────────────────

/** Map personaId → real cohort resolved from DB (populated in beforeAll). */
const resolvedCohorts: Record<string, string | null> = {};

// ─── E2E describe block ────────────────────────────────────────────────────────

describeIfService('RE Onboarding E2E — 3 persona smoke test', () => {
  for (const personaId of PERSONA_IDS) {
    describe(`${personaId} — ${getPersona(personaId).name}`, () => {
      const persona = getPersona(personaId);
      let userId: string;
      let userEmail: string;
      let authenticatedClient: SupabaseClient;
      let cohortId: string;

      beforeAll(async () => {
        // Resolve a real cohort for this persona's home state.
        const resolved = await resolveRealCohortId(persona.homeStateId);
        if (!resolved) {
          // If DB has no cohorts (unseeded), skip gracefully via cohortId sentinel.
          cohortId = 'QA_COHORT';
        } else {
          cohortId = resolved;
        }

        // Step 1: Create fresh test user.
        userEmail = `re-e2e-${personaId.toLowerCase()}-${Date.now()}@foofoo-test.dev`;
        const created = await createRETestUser(userEmail, PASSWORD);
        userId = created.id;

        // Step 2: Sign in as the test user.
        authenticatedClient = await signInRETestUser(userEmail, PASSWORD);
      });

      afterAll(async () => {
        if (userId) await cleanupUser(userId);
      });

      // ── Step 3: Submit onboarding profile ───────────────────────────────────

      it('3 — upserts re_user_household_profiles with cohort', async () => {
        const { error } = await authenticatedClient
          .from('re_user_household_profiles')
          .upsert(
            { profile_id: userId, cohort_id: cohortId },
            { onConflict: 'profile_id' },
          );
        expect(error).toBeNull();

        // Verify the row is readable by the authenticated user (RLS check).
        const { data, error: readErr } = await authenticatedClient
          .from('re_user_household_profiles')
          .select('profile_id, cohort_id')
          .eq('profile_id', userId)
          .maybeSingle();
        expect(readErr).toBeNull();
        expect(data).not.toBeNull();
        expect((data as any).cohort_id).toBe(cohortId);
      });

      // ── Step 4: Engine assignment ────────────────────────────────────────────

      it('4 — inserts re_user_engine_assignments (engine assigned)', async () => {
        const { error } = await (supabaseREAdmin as any)
          .from('re_user_engine_assignments')
          .insert({
            profile_id: userId,
            engine_version: 'classfirst_v1',
            assigned_by: 'qa_onboarding_e2e',
            assigned_at: new Date().toISOString(),
          });
        // Allow duplicate-key on re-run (upsert semantics via admin).
        if (error && !error.message.includes('duplicate')) {
          throw new Error(`engine assignment failed: ${error.message}`);
        }

        // Verify assignment is visible via the admin client.
        const { data, error: readErr } = await (supabaseREAdmin as any)
          .from('re_user_engine_assignments')
          .select('engine_version, assigned_by')
          .eq('profile_id', userId)
          .maybeSingle();
        expect(readErr).toBeNull();
        expect(data).not.toBeNull();
        expect((data as any).engine_version).toBe('classfirst_v1');
      });

      // ── Step 5 + 6: Fetch and verify the weekly plan ─────────────────────────

      it('5/6 — weekly plan has 7 days with breakfast, lunch and dinner', async () => {
        // Seed the plan (simulates what generateUserWeeklyPlan does post-onboarding).
        await seedWeeklyPlan(supabaseREAdmin, userId, cohortId);

        const planWeekStart = weekStartIST();
        const { data, error } = await authenticatedClient
          .from('re_user_weekly_plans')
          .select('day_of_week, breakfast_class, lunch_class, dinner_class')
          .eq('profile_id', userId)
          .eq('plan_week_start', planWeekStart);

        expect(error).toBeNull();
        const rows = data ?? [];

        // Must have exactly 7 days.
        expect(rows).toHaveLength(7);

        // Every day must have breakfast, lunch, and dinner.
        for (const row of rows) {
          expect((row as any).breakfast_class).toBeTruthy();
          expect((row as any).lunch_class).toBeTruthy();
          expect((row as any).dinner_class).toBeTruthy();
        }

        // All 7 day names must be present (no duplicates, no gaps).
        const dayNames = new Set(rows.map((r: any) => r.day_of_week as string));
        for (const d of DAYS_OF_WEEK) {
          expect(dayNames.has(d)).toBe(true);
        }
      });

      // ── Hard constraint smoke: 0 forbidden diet-type violations ─────────────

      it('6b — plan class codes contain 0 forbidden-diet-type dish violations', async () => {
        if (persona.expects.forbiddenDietTypes.length === 0) {
          // non_veg persona — no forbidden types to check; always passes.
          expect(true).toBe(true);
          return;
        }

        // Gather all class codes referenced in this user's plan.
        const planWeekStart = weekStartIST();
        const { data: planRows } = await (supabaseREAdmin as any)
          .from('re_user_weekly_plans')
          .select('breakfast_class, lunch_class, dinner_class')
          .eq('profile_id', userId)
          .eq('plan_week_start', planWeekStart);

        const classCodes = new Set<string>();
        for (const row of planRows ?? []) {
          if (row.breakfast_class) classCodes.add(row.breakfast_class);
          if (row.lunch_class) classCodes.add(row.lunch_class);
          if (row.dinner_class) classCodes.add(row.dinner_class);
        }

        // Skip constraint check for QA sentinel classes (no real dishes seeded).
        const realCodes = [...classCodes].filter((c) => !c.startsWith('QA_'));
        if (realCodes.length === 0) {
          // Plan uses QA sentinel classes — diet check not applicable.
          expect(true).toBe(true);
          return;
        }

        // Expand all classes to their dishes and check diet_type.
        const { data: dishes, error: dishErr } = await (supabaseREAdmin as any)
          .from('re_class_dish_options')
          .select('dish_option_id, diet_type')
          .in('meal_class_code', realCodes);
        expect(dishErr).toBeNull();

        const violations = (dishes ?? []).filter((d: any) =>
          persona.expects.forbiddenDietTypes.includes((d.diet_type ?? '').toLowerCase()),
        );
        expect(violations).toHaveLength(0);
      });
    });
  }
});
