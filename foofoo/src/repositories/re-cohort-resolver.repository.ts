import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import {
  STATE_TIER_CITIES,
  CROSS_STATE_METRO_MAP,
  DESTINATION_GROUP_TO_TIER,
  HEALTH_OVERLAY_PERSONA_MAP,
  COOK_OVERLAY_PERSONA_MAP,
  MIGRATION_OVERLAY_PERSONA_ID,
} from '../config/re-city-constants';

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeCity(city: string): string {
  return city.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * @summary Resolve a free-text city + state_id to a destination_group_code.
 *
 * @description Algorithm (in priority order):
 *   1. Check home-state T1 city list → HOME_STATE_TIER1
 *   2. Check home-state T2 city list → HOME_STATE_TIER2
 *   3. Check cross-state pan-India metro map → MUMBAI_PUNE / DELHI_NCR / etc.
 *   4. Default → PAN_INDIA_PG_HOSTEL
 *
 * @param stateId    - Canonical state ID e.g. 'S14' (from re_states)
 * @param currentCity - Free-text city entered by user
 * @returns destination_group_code string
 */
export function resolveCityDestinationGroup(stateId: string, currentCity: string): string {
  const city = normalizeCity(currentCity);
  const stateTiers = STATE_TIER_CITIES[stateId];

  if (stateTiers) {
    if (stateTiers.t1.some((c) => city.includes(c) || c.includes(city))) {
      return 'HOME_STATE_TIER1';
    }
    if (stateTiers.t2.some((c) => city.includes(c) || c.includes(city))) {
      return 'HOME_STATE_TIER2';
    }
  }

  const crossState = CROSS_STATE_METRO_MAP[city];
  if (crossState) return crossState;

  // Partial prefix match for cross-state metros (e.g. "Bengaluru (south)" → "bengaluru")
  for (const [key, group] of Object.entries(CROSS_STATE_METRO_MAP)) {
    if (city.startsWith(key) || key.startsWith(city)) return group;
  }

  return 'PAN_INDIA_PG_HOSTEL';
}

/**
 * @summary Map a destination_group_code to a city tier code.
 * @returns 'T1' or 'T2'
 */
export function resolveCityTierCode(destinationGroupCode: string): 'T1' | 'T2' {
  return DESTINATION_GROUP_TO_TIER[destinationGroupCode] ?? 'T2';
}

/**
 * @summary Build overlay persona ID list from city, health, and cook context.
 *
 * @param destinationGroupCode - Resolved destination group
 * @param healthOverlayCode    - From re_user_household_profiles, or null
 * @param cookDependency       - From re_user_household_profiles, or null
 * @returns Deduplicated array of overlay persona IDs (may be empty)
 */
export function buildOverlayPersonaIds(
  destinationGroupCode: string,
  healthOverlayCode: string | null,
  cookDependency: string | null,
): string[] {
  const ids: string[] = [];

  // Migration overlay: user is outside their home state
  if (destinationGroupCode !== 'HOME_STATE_TIER1' && destinationGroupCode !== 'HOME_STATE_TIER2') {
    ids.push(MIGRATION_OVERLAY_PERSONA_ID);
  }

  if (healthOverlayCode) {
    const hp = HEALTH_OVERLAY_PERSONA_MAP[healthOverlayCode];
    if (hp) ids.push(hp);
  }

  if (cookDependency) {
    const cp = COOK_OVERLAY_PERSONA_MAP[cookDependency];
    if (cp) ids.push(cp);
  }

  return [...new Set(ids)]; // deduplicate
}

// ── DB-backed operations ──────────────────────────────────────────────────────

/**
 * @summary Look up state_id from a state name string.
 * @param homeStateName - e.g. 'Maharashtra' (from profiles.home_state)
 * @returns state_id like 'S14', or null if not found
 */
async function fetchStateId(homeStateName: string): Promise<string | null> {
  const { data, error } = await supabaseRE
    .from('re_states')
    .select('state_id')
    .ilike('state_ut', homeStateName.trim())
    .maybeSingle();
  if (error) {
    Logger.error('RE_COHORT', 'fetchStateId failed', { error: error.message, homeStateName });
    return null;
  }
  return (data as { state_id: string } | null)?.state_id ?? null;
}

/**
 * @summary Verify that a cohort_id exists in re_cohorts.
 * @returns true if found, false otherwise
 */
async function verifyCohortExists(cohortId: string): Promise<boolean> {
  const { data, error } = await supabaseRE
    .from('re_cohorts')
    .select('cohort_id')
    .eq('cohort_id', cohortId)
    .maybeSingle();
  if (error) {
    Logger.error('RE_COHORT', 'verifyCohortExists query failed', { error: error.message, cohortId });
    return false;
  }
  return data !== null;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * @summary Run full cohort assignment for a user after RE onboarding completes.
 *
 * @description Reads the user's household profile + production profile, resolves
 *   state_id, destination_group_code, city_tier_code, builds cohort_id, verifies
 *   it in re_cohorts, computes overlay_persona_ids, then writes back to
 *   re_user_household_profiles.
 *
 * @param userId - Supabase auth UID
 * @throws when profile reads or the final upsert fail
 */
export async function runCohortAssignment(userId: string): Promise<void> {
  // 1. Load production profile (home_state, current_city)
  const { data: prodProfile, error: prodErr } = await supabaseRE
    .from('profiles')
    .select('home_state, current_city')
    .eq('id', userId)
    .maybeSingle();
  if (prodErr) throw prodErr;
  if (!prodProfile?.home_state || !prodProfile?.current_city) {
    throw new Error('RE_COHORT: home_state or current_city missing on profile');
  }

  // 2. Load RE household profile (persona_id, health_overlay_code, cook_dependency)
  const { data: reProfile, error: reErr } = await supabaseRE
    .from('re_user_household_profiles')
    .select('persona_id, health_overlay_code, cook_dependency')
    .eq('profile_id', userId)
    .maybeSingle();
  if (reErr) throw reErr;
  if (!reProfile?.persona_id) {
    throw new Error('RE_COHORT: persona_id missing on re_user_household_profiles');
  }

  // 3. Resolve state_id from state name
  const stateId = await fetchStateId(prodProfile.home_state);
  if (!stateId) throw new Error(`RE_COHORT: could not resolve state_id for "${prodProfile.home_state}"`);

  // 4. City resolution
  const destinationGroupCode = resolveCityDestinationGroup(stateId, prodProfile.current_city);
  const cityTierCode = resolveCityTierCode(destinationGroupCode);

  // 5. Build and verify cohort_id
  const cohortId = `${stateId}_${cityTierCode}_${reProfile.persona_id}`;
  const cohortExists = await verifyCohortExists(cohortId);
  if (!cohortExists) {
    Logger.warn('RE_COHORT', `cohort_id not found, proceeding without: ${cohortId}`);
  }

  // 6. Build overlay persona IDs
  const overlayPersonaIds = buildOverlayPersonaIds(
    destinationGroupCode,
    reProfile.health_overlay_code ?? null,
    reProfile.cook_dependency ?? null,
  );

  // 7. Persist assignment to re_user_household_profiles
  const { error: updateErr } = await supabaseRE
    .from('re_user_household_profiles')
    .upsert(
      {
        profile_id: userId,
        cohort_id: cohortExists ? cohortId : null,
        city_destination_group: destinationGroupCode,
        overlay_persona_ids: overlayPersonaIds,
      },
      { onConflict: 'profile_id' },
    );
  if (updateErr) throw updateErr;

  Logger.info('RE_COHORT', 'Cohort assignment complete', {
    userId,
    stateId,
    cohortId,
    destinationGroupCode,
    cityTierCode,
    overlayPersonaIds,
  });
}
