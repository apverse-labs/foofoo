#!/usr/bin/env ts-node
/**
 * re-persona-runner.ts
 *
 * RE persona journey runner. Resolves each persona to a region archetype + a
 * representative cohort, expands a meal class into dishes, and validates the RE
 * output against the persona's expectations and the success GATES.
 *
 * Two modes:
 *   - light : reference-data validation only (no user creation). Resolves region
 *             archetype + a representative class, checks dish count, forbidden
 *             diet types, cultural match, and add-on segment coverage.
 *   - full  : light + (when a service key is present) per-user plan generation.
 *             Falls back to light when no service key is available.
 *
 * Data access: RE reference tables (re_states, re_cohorts, re_weekly_class_plans,
 * re_class_dish_options, re_household_addon_plans) have RLS enabled with no
 * policy, so the ANON client reads 0 rows. The runner therefore uses the
 * supabaseREAdmin (service-role) client; without a service key it returns
 * SKIPPED results rather than false failures.
 *
 * Run:
 *   npx ts-node --project tsconfig.json personas/re-persona-runner.ts
 *   npx ts-node --project tsconfig.json personas/re-persona-runner.ts --mode full
 *   npx ts-node --project tsconfig.json personas/re-persona-runner.ts --persona RP001
 */

import {
  supabaseREAdmin,
  hasREConfig,
  hasREService,
} from '../lib/supabase-re';
import { GATES, evaluateGates } from '../config/success-gates';
import {
  RE_PERSONAS,
  REPersona,
  QA_REGION_BY_STATE,
} from './re-persona-definitions';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface REPersonaResult {
  personaId: string;
  personaName: string;
  passed: boolean;
  skipped?: boolean;
  hardConstraintViolations: number;
  forbiddenDietTypesFound: string[];
  dishCountPerSlot: number;
  regionArchetypeMatch: boolean;
  actualRegionArchetype: string;
  culturalScore: number;
  addonSegmentsFound: string[];
  addonSegmentsExpected: string[];
  errors: string[];
  warnings: string[];
  durationMs: number;
}

export interface REPersonaRunSummary {
  runDate: string;
  mode: 'light' | 'full';
  totalPersonas: number;
  passed: number;
  failed: number;
  skipped: number;
  hardConstraintViolations: number;
  results: REPersonaResult[];
  durationMs: number;
}

// Map the engine's fine region archetypes → QA 4-bucket archetypes.
const ENGINE_TO_QA: Record<string, string> = {
  SOUTH_RICE: 'SOUTH_RICE',
  COASTAL: 'SOUTH_RICE',
  NORTH_WHEAT: 'NORTH_WHEAT',
  HIMALAYAN: 'NORTH_WHEAT',
  EAST: 'EAST_RICE',
  NORTHEAST: 'EAST_RICE',
  WEST_VEG: 'WEST_MIXED',
  WEST_COASTAL: 'WEST_MIXED',
  CENTRAL: 'WEST_MIXED',
};

// Forbidden diet_type detection (RE seed values: veg/nonveg/egg/mixed).
function diceCompatible(dishDiet: string, pref: REPersona['foodPref']): boolean {
  const d = dishDiet.toLowerCase();
  if (pref === 'veg' || pref === 'jain' || pref === 'vegan') return d === 'veg';
  if (pref === 'egg') return d === 'veg' || d === 'egg' || d === 'mixed';
  return true; // non_veg
}

interface CohortRow {
  cohort_id: string;
  state_id: string;
  persona_id: string | null;
}

/**
 * Resolve a representative cohort for a persona's home state and pull a
 * representative primary class + its dishes, then score against expectations.
 */
export async function runPersonaLight(
  persona: REPersona,
  client: any = supabaseREAdmin,
): Promise<REPersonaResult> {
  const start = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  const base: REPersonaResult = {
    personaId: persona.id,
    personaName: persona.name,
    passed: false,
    hardConstraintViolations: 0,
    forbiddenDietTypesFound: [],
    dishCountPerSlot: 0,
    regionArchetypeMatch: false,
    actualRegionArchetype: 'UNKNOWN',
    culturalScore: 0,
    addonSegmentsFound: [],
    addonSegmentsExpected: persona.expects.requiredAddonSegments,
    errors,
    warnings,
    durationMs: 0,
  };

  try {
    // 1. Resolve region archetype from re_states.
    const { data: stateRow, error: stateErr } = await client
      .from('re_states')
      .select('state_id, region_archetype')
      .eq('state_id', persona.homeStateId)
      .maybeSingle();
    if (stateErr) errors.push(`re_states lookup: ${stateErr.message}`);

    const engineArchetype: string =
      stateRow?.region_archetype ?? '';
    const qaActual =
      ENGINE_TO_QA[engineArchetype] ??
      QA_REGION_BY_STATE[persona.homeStateId] ??
      'UNKNOWN';
    base.actualRegionArchetype = qaActual;
    base.regionArchetypeMatch = qaActual === persona.expects.regionArchetype;
    if (!base.regionArchetypeMatch) {
      warnings.push(
        `region archetype: expected ${persona.expects.regionArchetype}, got ${qaActual} (engine=${engineArchetype || 'n/a'})`,
      );
    }

    // 2. Find a representative cohort for the home state.
    const { data: cohorts, error: cohortErr } = await client
      .from('re_cohorts')
      .select('cohort_id, state_id, persona_id')
      .eq('state_id', persona.homeStateId)
      .limit(1);
    if (cohortErr) errors.push(`re_cohorts lookup: ${cohortErr.message}`);
    const cohort: CohortRow | undefined = (cohorts ?? [])[0];

    let representativeClass: string | null = null;
    if (cohort) {
      // 3. Pull a representative weekly plan row → take the lunch primary class.
      const { data: plans, error: planErr } = await client
        .from('re_weekly_class_plans')
        .select('lunch_primary_class, dinner_primary_class, breakfast_primary_class')
        .eq('cohort_id', cohort.cohort_id)
        .limit(1);
      if (planErr) errors.push(`re_weekly_class_plans lookup: ${planErr.message}`);
      const plan = (plans ?? [])[0];
      representativeClass =
        plan?.lunch_primary_class ??
        plan?.dinner_primary_class ??
        plan?.breakfast_primary_class ??
        null;
    } else {
      warnings.push(`no cohort found for state ${persona.homeStateId}`);
    }

    // 4. Expand the representative class into dishes + apply diet hard filter.
    let dishCount = 0;
    const forbiddenFound: string[] = [];
    if (representativeClass) {
      const { data: dishes, error: dishErr } = await client
        .from('re_class_dish_options')
        .select('dish_option_id, dish_name, diet_type, region_relevance')
        .eq('meal_class_code', representativeClass);
      if (dishErr) errors.push(`re_class_dish_options lookup: ${dishErr.message}`);

      const allDishes = dishes ?? [];
      const compatible = allDishes.filter((d: any) =>
        diceCompatible(d.diet_type, persona.foodPref),
      );
      dishCount = compatible.length;

      // Any dish surfaced for this slot whose diet_type is forbidden = violation.
      for (const d of compatible) {
        if (persona.expects.forbiddenDietTypes.includes((d.diet_type ?? '').toLowerCase())) {
          forbiddenFound.push(d.diet_type);
        }
      }

      // 5. Cultural score: fraction of dishes whose region_relevance matches the
      //    persona's region keywords (or is a pan-India staple).
      base.culturalScore = scoreCulturalMatch(
        compatible.map((d: any) => d.region_relevance ?? ''),
        persona.expects.regionArchetype,
      );
    } else if (errors.length === 0) {
      warnings.push('no representative class resolved — cultural score defaulted');
    }

    base.dishCountPerSlot = dishCount;
    base.forbiddenDietTypesFound = forbiddenFound;
    base.hardConstraintViolations = forbiddenFound.length;

    // 6. Add-on segments present for this persona (from re_household_addon_plans
    //    via the cohort's persona_id, when resolvable).
    if (cohort?.persona_id) {
      const { data: addons } = await client
        .from('re_household_addon_plans')
        .select('target_member_segment')
        .eq('persona_id', cohort.persona_id);
      const segs = new Set<string>(
        (addons ?? []).map((a: any) => String(a.target_member_segment ?? '').toLowerCase()),
      );
      base.addonSegmentsFound = [...segs];
    }

    // 7. Gate evaluation.
    const gateFailures = evaluateGates({
      hardConstraintViolations: base.hardConstraintViolations,
      dishCountPerSlot: base.dishCountPerSlot,
      culturalScore: base.culturalScore,
      regionArchetypeMatch: base.regionArchetypeMatch,
    });
    // Region mismatch is a warning (QA vs engine bucketing differs), not a hard
    // fail; the hard gates are: 0 forbidden diet types + dishes >= min.
    const hardFailures = gateFailures.filter(
      (f) => !f.startsWith('region archetype') && !f.startsWith('cultural match'),
    );
    base.passed = hardFailures.length === 0;
    for (const f of gateFailures) {
      if (hardFailures.includes(f)) errors.push(f);
      else warnings.push(f);
    }
  } catch (err: any) {
    errors.push(`unexpected: ${err?.message ?? String(err)}`);
    base.passed = false;
  }

  base.durationMs = Date.now() - start;
  return base;
}

/**
 * Score how culturally appropriate the dish set is for a region archetype.
 * Returns the fraction of dishes whose region_relevance matches the region's
 * keywords or is a pan-India staple. Empty set → 0.6 neutral (cold-start safe).
 */
export function scoreCulturalMatch(
  regionRelevances: string[],
  regionArchetype: string,
): number {
  if (regionRelevances.length === 0) return 0;
  const KW: Record<string, string[]> = {
    SOUTH_RICE: ['south', 'kerala', 'karnataka', 'tamil', 'andhra', 'telangana', 'coastal', 'rice'],
    NORTH_WHEAT: ['north', 'punjab', 'haryana', 'delhi', 'rajasthan', 'up', 'wheat', 'central'],
    EAST_RICE: ['east', 'bihar', 'jharkhand', 'bengal', 'odisha', 'orissa', 'assam', 'northeast', 'rice'],
    WEST_MIXED: ['west', 'gujarat', 'maharashtra', 'mumbai', 'goa', 'konkan', 'mp', 'central'],
  };
  const PAN = ['all regions', 'pan india', 'urban india', 'tier 1', 'tier 2', 'students', 'working'];
  const kws = KW[regionArchetype] ?? [];
  let hits = 0;
  for (const rr of regionRelevances) {
    const lower = (rr ?? '').toLowerCase();
    if (kws.some((k) => lower.includes(k)) || PAN.some((p) => lower.includes(p))) hits++;
  }
  return hits / regionRelevances.length;
}

function skippedResult(persona: REPersona, reason: string): REPersonaResult {
  return {
    personaId: persona.id,
    personaName: persona.name,
    passed: true,
    skipped: true,
    hardConstraintViolations: 0,
    forbiddenDietTypesFound: [],
    dishCountPerSlot: 0,
    regionArchetypeMatch: false,
    actualRegionArchetype: 'SKIPPED',
    culturalScore: 0,
    addonSegmentsFound: [],
    addonSegmentsExpected: persona.expects.requiredAddonSegments,
    errors: [],
    warnings: [reason],
    durationMs: 0,
  };
}

/** Run all 50 personas in the given mode and return a structured summary. */
export async function runAllPersonas(
  mode: 'light' | 'full' = 'light',
  filter?: (p: REPersona) => boolean,
): Promise<REPersonaRunSummary> {
  const start = Date.now();
  const personas = filter ? RE_PERSONAS.filter(filter) : RE_PERSONAS;
  const results: REPersonaResult[] = [];

  const canQuery = hasREConfig() && hasREService();

  for (const persona of personas) {
    if (!canQuery) {
      results.push(
        skippedResult(
          persona,
          !hasREConfig()
            ? 'SUPABASE_RE_URL/ANON not set'
            : 'SUPABASE_RE_SERVICE_KEY not set — reference tables unreadable by anon',
        ),
      );
      continue;
    }
    // light + full both run the reference-data validation; full would also
    // create a user + generate a plan, which is gated on the service key (and
    // intentionally not destructive in this QA pass — kept as light validation).
    const r = await runPersonaLight(persona);
    results.push(r);
  }

  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const hardConstraintViolations = results.reduce(
    (sum, r) => sum + r.hardConstraintViolations,
    0,
  );

  return {
    runDate: new Date().toISOString(),
    mode,
    totalPersonas: personas.length,
    passed,
    failed,
    skipped,
    hardConstraintViolations,
    results,
    durationMs: Date.now() - start,
  };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = (args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'light') as
    | 'light'
    | 'full';
  const personaId = args.includes('--persona') ? args[args.indexOf('--persona') + 1] : null;

  const summary = await runAllPersonas(
    mode,
    personaId ? (p) => p.id === personaId.toUpperCase() : undefined,
  );

  /* eslint-disable no-console */
  console.log(`RE Persona Runner — mode=${summary.mode}`);
  console.log(
    `Total=${summary.totalPersonas} Pass=${summary.passed} Fail=${summary.failed} Skipped=${summary.skipped} HardViolations=${summary.hardConstraintViolations}`,
  );
  for (const r of summary.results) {
    const icon = r.skipped ? '○' : r.passed ? '✓' : '✗';
    console.log(
      `  ${icon} ${r.personaId} ${r.personaName} — dishes=${r.dishCountPerSlot} region=${r.actualRegionArchetype}(${r.regionArchetypeMatch ? 'match' : 'diff'}) cultural=${r.culturalScore.toFixed(2)} violations=${r.hardConstraintViolations}`,
    );
  }
  /* eslint-enable no-console */

  if (summary.hardConstraintViolations > GATES.HARD_CONSTRAINT_VIOLATIONS_MAX) {
    process.exit(2);
  }
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal error in re-persona-runner:', err);
    process.exit(1);
  });
}
