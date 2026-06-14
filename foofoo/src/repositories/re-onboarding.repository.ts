import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import type {
  REState, REMainCohort, RESubcohort,
  REHouseholdProfile, REHouseholdMember,
  CookDependency, HealthOverlayCode, HealthScope,
  FoodPref, MemberSegment,
} from '../types';

// Sub-cohort IDs that trigger the household-member capture screen (RE-step-4).
const MEMBER_REQUIRING_SUBCOHORTS = new Set([
  'SC2D', 'SC2E', 'SC2F',           // pregnant, infant 0-6m, baby 6-18m
  'SC3A', 'SC3B', 'SC3C', 'SC3D',   // toddler, school kid, teen, picky child
  'SC4A', 'SC4B', 'SC4C', 'SC4D', 'SC4E', 'SC4F', // all MC4 health/elder
]);

export function requiresMemberStep(subCohortId: string): boolean {
  return MEMBER_REQUIRING_SUBCOHORTS.has(subCohortId);
}

/**
 * @summary Fetch all 36 RE states ordered alphabetically for the home state picker.
 * @returns Ordered state rows; empty array on error.
 */
export async function fetchREStates(): Promise<REState[]> {
  try {
    const { data, error } = await supabaseRE
      .from('re_states')
      .select('state_id, state_ut')
      .order('state_ut', { ascending: true });
    if (error) throw error;
    return (data ?? []) as REState[];
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'fetchREStates failed', { error: err?.message });
    return [];
  }
}

/**
 * @summary Fetch all 5 main cohort cards for RE-step-2.
 */
export async function fetchREMainCohorts(): Promise<REMainCohort[]> {
  try {
    const { data, error } = await supabaseRE
      .from('re_main_cohorts')
      .select('main_cohort_id, main_cohort_label, user_understands_as, subcohort_screen_copy')
      .order('main_cohort_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as REMainCohort[];
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'fetchREMainCohorts failed', { error: err?.message });
    return [];
  }
}

/**
 * @summary Fetch sub-cohort chips for the selected main cohort (RE-step-3).
 * @param mainCohortId - e.g. 'MC1'
 */
export async function fetchRESubcohorts(mainCohortId: string): Promise<RESubcohort[]> {
  try {
    const { data, error } = await supabaseRE
      .from('re_subcohorts')
      .select('sub_cohort_id, main_cohort_id, show_as_chip_text, maps_to_persona_id')
      .eq('main_cohort_id', mainCohortId)
      .order('sub_cohort_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as RESubcohort[];
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'fetchRESubcohorts failed', { error: err?.message, mainCohortId });
    return [];
  }
}

/**
 * @summary Fetch (or init) the RE household profile for a user.
 * @returns Profile row or null if not yet created.
 */
export async function fetchREHouseholdProfile(profileId: string): Promise<REHouseholdProfile | null> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_household_profiles')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data as REHouseholdProfile | null;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'fetchREHouseholdProfile failed', { error: err?.message, profileId });
    return null;
  }
}

/**
 * @summary Save location step: writes home_state + current_city to profiles (production).
 */
export async function saveRELocation(
  userId: string,
  homeState: string,
  currentCity: string,
): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('profiles')
      .update({ home_state: homeState, current_city: currentCity })
      .eq('id', userId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveRELocation failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Upsert main_cohort_id into re_user_household_profiles.
 */
export async function saveREMainCohort(profileId: string, mainCohortId: string): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_user_household_profiles')
      .upsert(
        { profile_id: profileId, main_cohort_id: mainCohortId },
        { onConflict: 'profile_id' }
      );
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveREMainCohort failed', { error: err?.message, profileId });
    throw err;
  }
}

/**
 * @summary Upsert sub_cohort_id + derived persona_id into re_user_household_profiles.
 */
export async function saveRESubcohort(
  profileId: string,
  subCohortId: string,
  personaId: string,
): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_user_household_profiles')
      .upsert(
        { profile_id: profileId, sub_cohort_id: subCohortId, persona_id: personaId },
        { onConflict: 'profile_id' }
      );
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveRESubcohort failed', { error: err?.message, profileId });
    throw err;
  }
}

/**
 * @summary Insert or replace household members for this profile.
 * @description Deletes existing rows for the profile, then inserts the new set.
 */
export async function saveREHouseholdMembers(
  profileId: string,
  members: Array<{ member_segment: MemberSegment; age_band: string | null }>,
): Promise<void> {
  try {
    const { error: delErr } = await supabaseRE
      .from('household_members')
      .delete()
      .eq('profile_id', profileId);
    if (delErr) throw delErr;

    if (members.length === 0) return;

    const rows = members.map((m) => ({
      profile_id: profileId,
      member_segment: m.member_segment,
      age_band: m.age_band,
    }));
    const { error } = await supabaseRE.from('household_members').insert(rows);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveREHouseholdMembers failed', { error: err?.message, profileId });
    throw err;
  }
}

/**
 * @summary Save diet preferences: food_pref + allergens to production tables,
 *   and nonveg_meals_per_week + preferred_protein_types to RE household profile.
 */
export async function saveREDietPrefs(
  userId: string,
  foodPref: FoodPref,
  allergenIds: number[],
  nonvegMealsPerWeek: number | null,
  preferredProteinTypes: string[],
): Promise<void> {
  try {
    const reDietResults = await Promise.all([
      supabaseRE.from('user_diet_rules').upsert(
        { user_id: userId, food_pref: foodPref, excluded_ingredients: allergenIds },
        { onConflict: 'user_id' }
      ),
      supabaseRE.from('profiles').update({ food_pref: foodPref }).eq('id', userId),
    ]);
    for (const r of reDietResults) {
      if (r.error) throw r.error;
    }

    const { error: reErr } = await supabaseRE
      .from('re_user_household_profiles')
      .upsert(
        {
          profile_id: userId,
          nonveg_meals_per_week: nonvegMealsPerWeek,
          preferred_protein_types: preferredProteinTypes,
        },
        { onConflict: 'profile_id' }
      );
    if (reErr) throw reErr;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveREDietPrefs failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Save cook dependency to re_user_household_profiles.
 */
export async function saveRECookDependency(
  profileId: string,
  cookDependency: CookDependency,
): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_user_household_profiles')
      .upsert(
        { profile_id: profileId, cook_dependency: cookDependency },
        { onConflict: 'profile_id' }
      );
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveRECookDependency failed', { error: err?.message, profileId });
    throw err;
  }
}

/**
 * @summary Save health overlay code + scope to re_user_household_profiles.
 */
export async function saveREHealthOverlay(
  profileId: string,
  healthOverlayCode: HealthOverlayCode | null,
  healthScope: HealthScope | null,
): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_user_household_profiles')
      .upsert(
        {
          profile_id: profileId,
          health_overlay_code: healthOverlayCode,
          health_scope: healthScope,
        },
        { onConflict: 'profile_id' }
      );
    if (error) throw error;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'saveREHealthOverlay failed', { error: err?.message, profileId });
    throw err;
  }
}

/**
 * @summary Mark RE onboarding complete: set re_engine_version on production profiles
 *   and insert audit row in re_user_engine_assignments.
 */
export async function completeREOnboarding(userId: string): Promise<void> {
  try {
    const { error: profileErr } = await supabaseRE
      .from('profiles')
      .update({ re_engine_version: 'classfirst_v1' })
      .eq('id', userId);
    if (profileErr) throw profileErr;

    const { error: auditErr } = await supabaseRE
      .from('re_user_engine_assignments')
      .insert({
        profile_id: userId,
        engine_version: 'classfirst_v1',
        assigned_by: 'onboarding',
        assigned_at: new Date().toISOString(),
      });
    if (auditErr) throw auditErr;
  } catch (err: any) {
    Logger.error('RE_ONBOARDING', 'completeREOnboarding failed', { error: err?.message, userId });
    throw err;
  }
}
