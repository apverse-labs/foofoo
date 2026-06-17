// DOC-27 / BUILD-09: Admin CMS & Data Operations.
// Pure helpers are exported for unit testing.
// DB operations require service-role access (not exposed to app users via RLS).

import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaxonomyRiskLevel = 'low' | 'medium' | 'high';
export type TaxonomyQAStatus = 'pending' | 'pass' | 'fail';

export interface TaxonomyQAReport {
  classesWithNoDishes: string[];           // Check 1
  dishesOnAddonOnlyClasses: string[];      // Check 2
  dietTagMismatches: string[];             // Check 3: dish.diet_type vs class allowed diet
  dishesWithoutAllergenTag: string[];      // Check 4: dishes with allergen_ids = {} (untagged)
  cohortsWithMissingPersona: string[];     // Check 5: re_cohorts rows referencing unknown persona_id
  weeklyPlanSlotGaps: string[];            // Check 6: cohort+day combos with null primary class slots
  totalClasses: number;
  totalDishes: number;
  passedAllChecks: boolean;
  checkedAt: string;
}

export interface TaxonomyReleaseInput {
  taxonomyVersion: string;
  versionFrom: string | null;
  versionTo: string;
  changedEntities: string[];
  riskLevel: TaxonomyRiskLevel;
  approvedBy: string;
  releaseNotes: string;
  rollbackPlan: string;
}

export interface TaxonomyRelease {
  id: string;
  taxonomyVersion: string;
  versionFrom: string | null;
  versionTo: string;
  changedEntities: string[];
  riskLevel: TaxonomyRiskLevel;
  qaStatus: TaxonomyQAStatus;
  qaReport: TaxonomyQAReport | null;
  approvedBy: string | null;
  releaseNotes: string | null;
  rollbackPlan: string | null;
  releasedAt: string | null;
  createdAt: string;
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @summary Detect meal classes that have zero dish candidates.
 *
 * @description A class with no dishes silently returns an empty slot — this is
 *   a data quality alert. Pure function over in-memory maps.
 *
 * @param {string[]} allClassCodes     - All class codes in the taxonomy.
 * @param {Record<string, number>} dishCountByClass - Dish count keyed by class code.
 * @returns {string[]} Class codes with zero dishes.
 */
export function detectClassesWithNoDishes(
  allClassCodes: string[],
  dishCountByClass: Record<string, number>,
): string[] {
  return allClassCodes.filter((code) => (dishCountByClass[code] ?? 0) === 0);
}

/**
 * @summary Detect add-on-only classes that are incorrectly used as primary classes.
 *
 * @description Add-on-only classes must never appear in primary weekly plan slots.
 *   Pure function over in-memory sets.
 *
 * @param {string[]} primaryClassCodes   - Class codes used in weekly plans as primary.
 * @param {Set<string>} addonOnlyCodes   - Set of class codes marked add-on-only.
 * @returns {string[]} Primary class codes that are actually add-on-only.
 */
export function detectAddonOnlyAsPrimary(
  primaryClassCodes: string[],
  addonOnlyCodes: Set<string>,
): string[] {
  return primaryClassCodes.filter((code) => addonOnlyCodes.has(code));
}

/**
 * @summary Check whether a dish's diet_type is consistent with the class's allowed diets.
 *
 * @description Returns false (mismatch flagged) if the class is veg-only but the
 *   dish is non-veg or egg. Pure function.
 *
 * @param {string} dishDietType    - e.g. 'nonveg', 'egg', 'veg'.
 * @param {string} classAllowedDiet - e.g. 'veg', 'any'.
 * @returns {boolean} true if compatible, false if a mismatch.
 */
export function isDietTagConsistent(dishDietType: string, classAllowedDiet: string): boolean {
  if (classAllowedDiet === 'any') return true;
  if (classAllowedDiet === 'veg') {
    return dishDietType.toLowerCase() === 'veg';
  }
  return true;
}

/**
 * @summary Detect dishes whose diet_type is incompatible with the class's allowed diet.
 * @returns Array of "dish_option_id (class: X, dish: Y)" strings for mismatches.
 */
export function detectDietTagMismatches(
  dishes: Array<{ dish_option_id: string; diet_type: string; meal_class_code: string }>,
  classAllowedDietMap: Record<string, string>,
): string[] {
  return dishes
    .filter((d) => !isDietTagConsistent(d.diet_type, classAllowedDietMap[d.meal_class_code] ?? 'any'))
    .map((d) => `${d.dish_option_id} (class: ${d.meal_class_code}, dish diet: ${d.diet_type})`);
}

/**
 * @summary Detect dish options that have an empty allergen_ids array.
 * @description After SCHEMA-RE-013, every dish should eventually be tagged. An empty
 *   array means the dish has not been reviewed yet — flags for data ops team.
 */
export function detectUntaggedAllergenDishes(
  dishes: Array<{ dish_option_id: string; allergen_ids: number[] | null }>,
): string[] {
  return dishes
    .filter((d) => !d.allergen_ids || d.allergen_ids.length === 0)
    .map((d) => d.dish_option_id);
}

/**
 * @summary Detect cohort rows referencing a persona_id that does not exist.
 */
export function detectCohortsWithMissingPersona(
  cohortPersonaIds: Array<{ cohort_id: string; persona_id: string | null }>,
  validPersonaIds: Set<string>,
): string[] {
  return cohortPersonaIds
    .filter((c) => c.persona_id && !validPersonaIds.has(c.persona_id))
    .map((c) => `${c.cohort_id} → persona ${c.persona_id}`);
}

/**
 * @summary Detect cohort+day combinations where all four primary class slots are null.
 * @description A fully-null day means no meals will ever be generated for that day.
 */
export function detectWeeklyPlanSlotGaps(
  plans: Array<Record<string, string | null>>,
): string[] {
  return plans
    .filter((p) =>
      !p.breakfast_primary_class &&
      !p.lunch_primary_class &&
      !p.snack_primary_class &&
      !p.dinner_primary_class,
    )
    .map((p) => `cohort ${p.cohort_id ?? '?'} day ${p.day_of_week ?? '?'}`);
}

// ── DB operations ─────────────────────────────────────────────────────────────

/**
 * @summary Run taxonomy data quality checks against the live DB.
 *
 * @description DOC-27 §7: checks for classes with zero dish options and
 *   add-on-only classes appearing as primary classes in weekly plans.
 *   Returns a structured QA report.
 *
 * @returns {Promise<TaxonomyQAReport>}
 */
export async function runTaxonomyQAChecks(): Promise<TaxonomyQAReport> {
  const checkedAt = new Date().toISOString();

  try {
    // Load all reference data in parallel
    const [classRes, dishRes, planRes, cohortRes, personaRes] = await Promise.all([
      supabaseRE.from('re_meal_classes').select('meal_class_code, allowed_as_weekly_primary, diet_type'),
      supabaseRE.from('re_class_dish_options').select('dish_option_id, meal_class_code, diet_type, allergen_ids'),
      supabaseRE.from('re_weekly_class_plans').select('cohort_id, day_of_week, breakfast_primary_class, lunch_primary_class, snack_primary_class, dinner_primary_class'),
      supabaseRE.from('re_cohorts').select('cohort_id, persona_id'),
      supabaseRE.from('re_personas').select('persona_id'),
    ]);
    if (classRes.error) throw classRes.error;
    if (dishRes.error) throw dishRes.error;
    if (planRes.error) throw planRes.error;

    // ── Check 1: classes with zero dish options ───────────────────────────────
    const classRows = (classRes.data ?? []) as Array<{ meal_class_code: string; allowed_as_weekly_primary: boolean; diet_type: string }>;
    const allClassCodes = classRows.map((r) => r.meal_class_code);
    const addonOnlyCodes = new Set(classRows.filter((r) => !r.allowed_as_weekly_primary).map((r) => r.meal_class_code));
    const classAllowedDietMap: Record<string, string> = Object.fromEntries(classRows.map((r) => [r.meal_class_code, r.diet_type ?? 'any']));

    const dishRows = (dishRes.data ?? []) as Array<{ dish_option_id: string; meal_class_code: string; diet_type: string; allergen_ids: number[] | null }>;
    const dishCountByClass: Record<string, number> = {};
    for (const row of dishRows) {
      dishCountByClass[row.meal_class_code] = (dishCountByClass[row.meal_class_code] ?? 0) + 1;
    }
    const classesWithNoDishes = detectClassesWithNoDishes(allClassCodes, dishCountByClass);

    // ── Check 2: addon-only classes used as primary ───────────────────────────
    const planRows = (planRes.data ?? []) as Array<Record<string, string | null>>;
    const primaryInPlans = new Set<string>();
    for (const row of planRows) {
      for (const col of ['breakfast_primary_class', 'lunch_primary_class', 'snack_primary_class', 'dinner_primary_class']) {
        if (row[col]) primaryInPlans.add(row[col] as string);
      }
    }
    const dishesOnAddonOnlyClasses = detectAddonOnlyAsPrimary([...primaryInPlans], addonOnlyCodes);

    // ── Check 3: diet tag mismatches ──────────────────────────────────────────
    const dietTagMismatches = detectDietTagMismatches(dishRows, classAllowedDietMap);

    // ── Check 4: dishes without allergen tagging (empty allergen_ids) ─────────
    const dishesWithoutAllergenTag = detectUntaggedAllergenDishes(dishRows);

    // ── Check 5: cohorts referencing non-existent persona ─────────────────────
    const validPersonaIds = new Set(
      ((personaRes.data ?? []) as Array<{ persona_id: string }>).map((r) => r.persona_id),
    );
    const cohortRows = (cohortRes.data ?? []) as Array<{ cohort_id: string; persona_id: string | null }>;
    const cohortsWithMissingPersona = detectCohortsWithMissingPersona(cohortRows, validPersonaIds);

    // ── Check 6: weekly plan days with all-null primary slots ─────────────────
    const weeklyPlanSlotGaps = detectWeeklyPlanSlotGaps(planRows);

    const passedAllChecks =
      classesWithNoDishes.length === 0 &&
      dishesOnAddonOnlyClasses.length === 0 &&
      dietTagMismatches.length === 0 &&
      cohortsWithMissingPersona.length === 0 &&
      weeklyPlanSlotGaps.length === 0;
    // Note: dishesWithoutAllergenTag is a data-ops warning, not a hard fail

    return {
      classesWithNoDishes,
      dishesOnAddonOnlyClasses,
      dietTagMismatches,
      dishesWithoutAllergenTag,
      cohortsWithMissingPersona,
      weeklyPlanSlotGaps,
      totalClasses: allClassCodes.length,
      totalDishes: dishRows.length,
      passedAllChecks,
      checkedAt,
    };
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'runTaxonomyQAChecks failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * @summary Fetch the most recently released taxonomy version.
 *
 * @returns {Promise<string | null>} taxonomy_version string, or null if no releases yet.
 */
export async function fetchActiveTaxonomyVersion(): Promise<string | null> {
  try {
    const { data, error } = await supabaseRE
      .from('re_taxonomy_releases')
      .select('taxonomy_version')
      .eq('qa_status', 'pass')
      .not('released_at', 'is', null)
      .order('released_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as { taxonomy_version: string } | null)?.taxonomy_version ?? null;
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'fetchActiveTaxonomyVersion failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * @summary List all taxonomy releases, newest first.
 *
 * @returns {Promise<TaxonomyRelease[]>}
 */
export async function fetchTaxonomyReleases(): Promise<TaxonomyRelease[]> {
  try {
    const { data, error } = await supabaseRE
      .from('re_taxonomy_releases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      taxonomyVersion: r.taxonomy_version as string,
      versionFrom: r.version_from as string | null,
      versionTo: r.version_to as string,
      changedEntities: (r.changed_entities as string[]) ?? [],
      riskLevel: r.risk_level as TaxonomyRiskLevel,
      qaStatus: r.qa_status as TaxonomyQAStatus,
      qaReport: (r.qa_report as TaxonomyQAReport | null) ?? null,
      approvedBy: r.approved_by as string | null,
      releaseNotes: r.release_notes as string | null,
      rollbackPlan: r.rollback_plan as string | null,
      releasedAt: r.released_at as string | null,
      createdAt: r.created_at as string,
    }));
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'fetchTaxonomyReleases failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ── Persona assignment (Seq 16, SCHEMA-RE-019) ────────────────────────────────

export interface PersonaAssignmentInput {
  profileId: string;
  personaId: string;
  confidence: number;
  assignedBy: 'onboarding' | 'system' | 'admin';
  overlayPersonaIds?: string[];
}

/**
 * @summary Upsert the active persona assignment for a user (Seq 16).
 * @description Supersedes the previous active assignment and inserts a new active row.
 */
export async function upsertPersonaAssignment(input: PersonaAssignmentInput): Promise<void> {
  const now = new Date().toISOString();
  try {
    // Mark all current active assignments for this profile as superseded
    await supabaseRE
      .from('re_user_persona_assignments')
      .update({ is_active: false, superseded_at: now })
      .eq('profile_id', input.profileId)
      .eq('is_active', true);

    const { error } = await supabaseRE
      .from('re_user_persona_assignments')
      .insert({
        profile_id: input.profileId,
        persona_id: input.personaId,
        confidence: input.confidence,
        assigned_by: input.assignedBy,
        overlay_persona_ids: input.overlayPersonaIds ?? [],
        is_active: true,
        assigned_at: now,
      });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'upsertPersonaAssignment failed', {
      error: err instanceof Error ? err.message : String(err), input,
    });
    throw err;
  }
}

/**
 * @summary Fetch the active persona assignment for a user (Seq 16).
 */
export async function fetchActivePersonaAssignment(profileId: string): Promise<{
  personaId: string;
  confidence: number;
  overlayPersonaIds: string[];
  assignedAt: string;
} | null> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_persona_assignments')
      .select('persona_id, confidence, overlay_persona_ids, assigned_at')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = data as { persona_id: string; confidence: number; overlay_persona_ids: string[]; assigned_at: string };
    return {
      personaId: r.persona_id,
      confidence: r.confidence,
      overlayPersonaIds: r.overlay_persona_ids ?? [],
      assignedAt: r.assigned_at,
    };
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'fetchActivePersonaAssignment failed', {
      error: err instanceof Error ? err.message : String(err), profileId,
    });
    return null;
  }
}

/**
 * @summary Create a new taxonomy release record (pending QA).
 *
 * @description DOC-27 §6 Tagging Workflow step 6.
 *   After QA passes, caller should update qa_status to 'pass' and set released_at.
 *
 * @param {TaxonomyReleaseInput} input
 * @returns {Promise<string>} The created release ID.
 */
export async function createTaxonomyRelease(input: TaxonomyReleaseInput): Promise<string> {
  try {
    const { data, error } = await supabaseRE
      .from('re_taxonomy_releases')
      .insert({
        taxonomy_version: input.taxonomyVersion,
        version_from: input.versionFrom,
        version_to: input.versionTo,
        changed_entities: input.changedEntities,
        risk_level: input.riskLevel,
        qa_status: 'pending',
        approved_by: input.approvedBy,
        release_notes: input.releaseNotes,
        rollback_plan: input.rollbackPlan,
      })
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  } catch (err: unknown) {
    Logger.error('RE_ADMIN', 'createTaxonomyRelease failed', {
      error: err instanceof Error ? err.message : String(err), input,
    });
    throw err;
  }
}
