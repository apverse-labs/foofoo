// DOC-27 / BUILD-09: Admin CMS & Data Operations.
// Pure helpers are exported for unit testing.
// DB operations require service-role access (not exposed to app users via RLS).

import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaxonomyRiskLevel = 'low' | 'medium' | 'high';
export type TaxonomyQAStatus = 'pending' | 'pass' | 'fail';

export interface TaxonomyQAReport {
  classesWithNoDishes: string[];
  dishesOnAddonOnlyClasses: string[];
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
    // Fetch all meal classes
    const { data: classData, error: classErr } = await supabaseRE
      .from('re_meal_classes')
      .select('meal_class_code, allowed_as_weekly_primary_v3');
    if (classErr) throw classErr;

    const allClassCodes = (classData ?? []).map((r: { meal_class_code: string }) => r.meal_class_code);
    const addonOnlyCodes = new Set(
      (classData ?? [])
        .filter((r: { allowed_as_weekly_primary_v3: boolean }) => !r.allowed_as_weekly_primary_v3)
        .map((r: { meal_class_code: string }) => r.meal_class_code),
    );

    // Count dishes per class
    const { data: dishData, error: dishErr } = await supabaseRE
      .from('re_class_dish_options')
      .select('meal_class_code');
    if (dishErr) throw dishErr;

    const dishCountByClass: Record<string, number> = {};
    for (const row of (dishData ?? []) as { meal_class_code: string }[]) {
      dishCountByClass[row.meal_class_code] = (dishCountByClass[row.meal_class_code] ?? 0) + 1;
    }

    // Fetch class codes currently used as primary in weekly plans
    const { data: planData, error: planErr } = await supabaseRE
      .from('re_weekly_class_plans')
      .select('breakfast_class, lunch_class, snack_class, dinner_class');
    if (planErr) throw planErr;

    const primaryInPlans = new Set<string>();
    for (const row of (planData ?? []) as Record<string, string | null>[]) {
      for (const col of ['breakfast_class', 'lunch_class', 'snack_class', 'dinner_class']) {
        if (row[col]) primaryInPlans.add(row[col] as string);
      }
    }

    const classesWithNoDishes = detectClassesWithNoDishes(allClassCodes, dishCountByClass);
    const dishesOnAddonOnlyClasses = detectAddonOnlyAsPrimary([...primaryInPlans], addonOnlyCodes);

    const passedAllChecks = classesWithNoDishes.length === 0 && dishesOnAddonOnlyClasses.length === 0;

    return {
      classesWithNoDishes,
      dishesOnAddonOnlyClasses,
      totalClasses: allClassCodes.length,
      totalDishes: (dishData ?? []).length,
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
