/**
 * POST /re-qa-run — DOC-23 §QA
 * Runs the full 6-check taxonomy QA suite and returns a structured report.
 * Requires service-role access.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const checkedAt = new Date().toISOString();

    const [classRes, dishRes, planRes, cohortRes, personaRes] = await Promise.all([
      supabase.from('re_meal_classes').select('meal_class_code, allowed_as_weekly_primary, diet_type'),
      supabase.from('re_class_dish_options').select('dish_option_id, meal_class_code, diet_type, allergen_ids'),
      supabase.from('re_weekly_class_plans').select('cohort_id, day_of_week, breakfast_primary_class, lunch_primary_class, snack_primary_class, dinner_primary_class'),
      supabase.from('re_cohorts').select('cohort_id, persona_id'),
      supabase.from('re_personas').select('persona_id'),
    ]);

    const classRows = (classRes.data ?? []) as Array<{ meal_class_code: string; allowed_as_weekly_primary: boolean; diet_type: string }>;
    const dishRows = (dishRes.data ?? []) as Array<{ dish_option_id: string; meal_class_code: string; diet_type: string; allergen_ids: number[] | null }>;
    const planRows = (planRes.data ?? []) as Array<Record<string, string | null>>;

    // Check 1: classes with no dishes
    const dishCountByClass: Record<string, number> = {};
    for (const d of dishRows) dishCountByClass[d.meal_class_code] = (dishCountByClass[d.meal_class_code] ?? 0) + 1;
    const classesWithNoDishes = classRows.filter((c) => !dishCountByClass[c.meal_class_code]).map((c) => c.meal_class_code);

    // Check 2: addon-only used as primary
    const addonOnly = new Set(classRows.filter((c) => !c.allowed_as_weekly_primary).map((c) => c.meal_class_code));
    const primaryCodes = new Set<string>();
    for (const p of planRows) {
      for (const col of ['breakfast_primary_class', 'lunch_primary_class', 'snack_primary_class', 'dinner_primary_class']) {
        if (p[col]) primaryCodes.add(p[col] as string);
      }
    }
    const addonAsPrimary = [...primaryCodes].filter((c) => addonOnly.has(c));

    // Check 3: diet tag mismatches
    const classDietMap: Record<string, string> = Object.fromEntries(classRows.map((c) => [c.meal_class_code, c.diet_type ?? 'any']));
    const dietMismatches = dishRows
      .filter((d) => {
        const allowed = classDietMap[d.meal_class_code] ?? 'any';
        if (allowed === 'any') return false;
        return allowed === 'veg' && d.diet_type.toLowerCase() !== 'veg';
      })
      .map((d) => `${d.dish_option_id} (class: ${d.meal_class_code}, dish: ${d.diet_type})`);

    // Check 4: dishes without allergen tagging
    const untaggedAllergens = dishRows
      .filter((d) => !d.allergen_ids || d.allergen_ids.length === 0)
      .map((d) => d.dish_option_id);

    // Check 5: cohorts with missing persona
    const validPersonas = new Set(((personaRes.data ?? []) as Array<{ persona_id: string }>).map((p) => p.persona_id));
    const cohortRows = (cohortRes.data ?? []) as Array<{ cohort_id: string; persona_id: string | null }>;
    const missingPersona = cohortRows
      .filter((c) => c.persona_id && !validPersonas.has(c.persona_id))
      .map((c) => `${c.cohort_id} → ${c.persona_id}`);

    // Check 6: weekly plan days with all-null slots
    const slotGaps = planRows
      .filter((p) => !p.breakfast_primary_class && !p.lunch_primary_class && !p.snack_primary_class && !p.dinner_primary_class)
      .map((p) => `cohort ${p.cohort_id ?? '?'} day ${p.day_of_week ?? '?'}`);

    const passed = classesWithNoDishes.length === 0 && addonAsPrimary.length === 0 &&
      dietMismatches.length === 0 && missingPersona.length === 0 && slotGaps.length === 0;

    const report = {
      classesWithNoDishes,
      dishesOnAddonOnlyClasses: addonAsPrimary,
      dietTagMismatches: dietMismatches,
      dishesWithoutAllergenTag: untaggedAllergens,
      cohortsWithMissingPersona: missingPersona,
      weeklyPlanSlotGaps: slotGaps,
      totalClasses: classRows.length,
      totalDishes: dishRows.length,
      passedAllChecks: passed,
      checkedAt,
    };

    return new Response(
      JSON.stringify({ success: true, data: report }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
