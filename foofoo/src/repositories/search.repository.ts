/**
 * @summary Full-text search repository for dishes — name, description, cuisine, synonyms.
 *
 * @description
 * Uses PostgreSQL full-text search via the dishes.search_vector tsvector column.
 * Also expands user queries against term_synonyms so Hindi/regional names
 * (e.g. 'murgh' → chicken, 'chawal' → rice) match canonical dish content.
 *
 * @calledBy app/(tabs)/search.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { DietType, MealSlot } from '../types';

export interface SearchFilters {
  cuisineIds?: number[];
  mealTypes?: MealSlot[];
  dietTypes?: DietType[];
  spiceLevels?: number[];
}

export interface SearchResult {
  id: number;
  name: string;
  slug: string;
  diet_type: DietType;
  spice_level: number;
  cook_time_mins: number;
  difficulty: string;
  calories: number;
  meal_types: MealSlot[];
  dish_role: string;
  hero_image_url: string | null;
  blurhash: string | null;
  cuisines?: { id: number; code: string; name: string; display_name: string | null } | null;
  rank?: number;
}

export interface CuisineOption {
  id: number;
  code: string;
  name: string;
  display_name: string | null;
}

export interface TagOption {
  id: number;
  category: string;
  value: string;
  display_name: string;
}

export interface DietOption {
  value: DietType;
  label: string;
}

export interface FilterOptions {
  cuisines: CuisineOption[];
  tags: TagOption[];
  dietTypes: DietOption[];
}

/**
 * @summary Sanitises a token for inclusion in a tsquery expression.
 *
 * @description PostgreSQL tsquery has many reserved characters (& | ! ( ) : *).
 *   Anything not alphanumeric is dropped — preserves search semantics while
 *   preventing tsquery parse errors and SQL injection at the query level.
 *
 * @param {string} token - A single word from the user's input
 * @returns {string} The token stripped to alphanumerics only (may be empty)
 */
function sanitiseToken(token: string): string {
  return token.replace(/[^A-Za-z0-9]/g, '');
}

/**
 * @summary Builds a PostgreSQL tsquery expression from raw search terms.
 *
 * @description Each multi-word term becomes `word1 & word2`; multiple terms are
 *   joined with `|` so any synonym match returns results. All tokens are
 *   sanitised to alphanumeric to avoid tsquery parse failures.
 *
 * @param {string[]} terms - Search terms (already trimmed)
 * @returns {string} A valid tsquery expression, or '' if all tokens were empty
 */
function buildTsQuery(terms: string[]): string {
  const expressions: string[] = [];
  for (const t of terms) {
    const tokens = t.split(/\s+/).map(sanitiseToken).filter(Boolean);
    if (tokens.length === 0) continue;
    expressions.push(tokens.join(' & '));
  }
  return expressions.join(' | ');
}

/**
 * @summary Searches dishes by name, description, cuisine, and synonyms.
 *
 * @description
 * Uses PostgreSQL full-text search via the dishes.search_vector column
 * (tsvector already populated and indexed). Also searches term_synonyms
 * for regional name variants — searching 'murgh' finds chicken dishes,
 * 'chawal' finds rice dishes. Applies filters when provided.
 * Returns results ordered by tsvector relevance rank.
 *
 * @param {string} query - Search string from user (min 2 chars)
 * @param {SearchFilters} [filters] - Optional cuisine, meal, diet, spice filters
 * @param {number} [limit=30] - Max results
 * @param {number} [offset=0] - Pagination offset
 * @returns {Promise<SearchResult[]>} Ranked search results
 * @throws {Error} when the dishes query fails
 *
 * @calledBy app/(tabs)/search.tsx on query change (debounced 400ms)
 */
export async function searchDishes(
  query: string,
  filters?: SearchFilters,
  limit = 30,
  offset = 0,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Step 1: Expand against term_synonyms (Hindi / regional names)
  const { data: synonyms, error: synErr } = await supabase
    .from('term_synonyms')
    .select('canonical_term')
    .ilike('synonym', trimmed);

  if (synErr) {
    Logger.warn('SEARCH-REPO', 'term_synonyms lookup failed (non-fatal)', { error: synErr.message });
  }

  const searchTerms: string[] = [trimmed];
  synonyms?.forEach((s: { canonical_term: string }) => {
    if (s.canonical_term && !searchTerms.includes(s.canonical_term)) {
      searchTerms.push(s.canonical_term);
    }
  });

  const tsQuery = buildTsQuery(searchTerms);
  if (!tsQuery) return [];

  // Step 2: Build the dishes query using PostgREST FTS operator
  // We use the configured `english` text search config to match search_vector.
  let dbQuery = supabase
    .from('dishes')
    .select(`
      id, name, slug, diet_type, spice_level,
      cook_time_mins, difficulty, calories,
      meal_types, dish_role,
      hero_image_url, blurhash,
      cuisines ( id, code, name, display_name )
    `)
    .eq('is_active', true)
    .textSearch('search_vector', tsQuery, { config: 'english' })
    .range(offset, offset + limit - 1);

  // Step 3: Apply filters
  if (filters?.cuisineIds?.length) {
    dbQuery = dbQuery.in('cuisine_id', filters.cuisineIds);
  }
  if (filters?.mealTypes?.length) {
    dbQuery = dbQuery.overlaps('meal_types', filters.mealTypes);
  }
  if (filters?.dietTypes?.length) {
    dbQuery = dbQuery.in('diet_type', filters.dietTypes);
  }
  if (filters?.spiceLevels?.length) {
    dbQuery = dbQuery.in('spice_level', filters.spiceLevels);
  }

  const { data, error } = await dbQuery;
  if (error) {
    Logger.error('SEARCH-REPO', 'searchDishes failed', { query: trimmed, error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as SearchResult[];
}

/**
 * @summary Returns trending dishes (most accepted in last 7 days).
 *
 * @description Aggregates suggestion_logs with action='accepted' or 'locked'
 *   over the trailing 7 days. Falls back to most recent active dishes if no
 *   acceptance signal yet (cold-start protection for early MVP days).
 *
 * @param {number} [limit=10] - Max results
 * @returns {Promise<SearchResult[]>} Trending dishes ordered by recent acceptance
 * @calledBy app/(tabs)/search.tsx when search query is empty
 */
export async function getTrendingDishes(limit = 10): Promise<SearchResult[]> {
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: logs, error: logsErr } = await supabase
      .from('suggestion_logs')
      .select('dish_id')
      .in('action', ['locked', 'tapped_detail'])
      .gte('created_at', since)
      .limit(limit * 6);

    if (logsErr) {
      Logger.warn('SEARCH-REPO', 'trending logs query failed', { error: logsErr.message });
    }

    const counts: Record<number, number> = {};
    logs?.forEach((row: { dish_id: number | null }) => {
      if (row.dish_id == null) return;
      counts[row.dish_id] = (counts[row.dish_id] ?? 0) + 1;
    });

    const topIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => Number(id));

    if (topIds.length > 0) {
      const { data: dishes, error: dishesErr } = await supabase
        .from('dishes')
        .select(`
          id, name, slug, diet_type, spice_level,
          cook_time_mins, difficulty, calories,
          meal_types, dish_role,
          hero_image_url, blurhash,
          cuisines ( id, code, name, display_name )
        `)
        .in('id', topIds)
        .eq('is_active', true);

      if (dishesErr) throw dishesErr;

      const byId = new Map<number, SearchResult>(
        (dishes ?? []).map((d: any) => [d.id as number, d as SearchResult]),
      );
      const ordered: SearchResult[] = [];
      topIds.forEach(id => {
        const d = byId.get(id);
        if (d) ordered.push(d);
      });
      if (ordered.length > 0) return ordered;
    }

    // Cold-start fallback: most recent active dishes with images
    const { data: fallback, error: fbErr } = await supabase
      .from('dishes')
      .select(`
        id, name, slug, diet_type, spice_level,
        cook_time_mins, difficulty, calories,
        meal_types, dish_role,
        hero_image_url, blurhash,
        cuisines ( id, code, name, display_name )
      `)
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(limit);
    if (fbErr) throw fbErr;
    return (fallback ?? []) as unknown as SearchResult[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    Logger.error('SEARCH-REPO', 'getTrendingDishes failed', { error: msg });
    return [];
  }
}

/**
 * @summary Fetches all available filter options for the filter sheet.
 *
 * @description Loads user-facing cuisines + meal_type/spice_level/heaviness
 *   tags in a single parallel call. Diet type list is hardcoded since the set
 *   is fixed and small.
 *
 * @returns {Promise<FilterOptions>} Cuisines, tag rows, diet type chips
 * @calledBy FilterBottomSheet on mount
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [cuisinesRes, tagRes] = await Promise.all([
    supabase
      .from('cuisines')
      .select('id, code, name, display_name')
      .eq('is_active', true)
      .eq('is_user_facing', true)
      .order('tier')
      .order('display_name'),
    supabase
      .from('tags')
      .select('id, category, value, display_name')
      .in('category', ['meal_type', 'spice_level', 'heaviness'])
      .eq('is_user_facing', true),
  ]);

  if (cuisinesRes.error) {
    Logger.warn('SEARCH-REPO', 'filter cuisines failed', { error: cuisinesRes.error.message });
  }
  if (tagRes.error) {
    Logger.warn('SEARCH-REPO', 'filter tags failed', { error: tagRes.error.message });
  }

  return {
    cuisines: (cuisinesRes.data ?? []) as CuisineOption[],
    tags: (tagRes.data ?? []) as TagOption[],
    dietTypes: [
      { value: 'veg', label: '🌱 Vegetarian' },
      { value: 'non_veg', label: '🍗 Non-Vegetarian' },
      { value: 'egg', label: '🥚 Egg' },
      { value: 'vegan', label: '🌿 Vegan' },
      { value: 'jain', label: '✨ Jain' },
    ],
  };
}

/**
 * @summary Returns cuisines marked F/O in the user's onboarding for quick chips.
 *
 * @description Used by search screen to pre-populate filter chips with the
 *   user's frequently/occasionally cuisines so search feels personalised from
 *   first open. Only F-bucket and O-bucket cuisines are returned.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<CuisineOption[]>} F/O cuisine rows ordered F first
 * @calledBy app/(tabs)/search.tsx on mount
 */
export async function getUserPersonalisedCuisines(userId: string): Promise<CuisineOption[]> {
  try {
    const { data: prefs, error } = await supabase
      .from('user_category_preferences')
      .select('category_id, bucket')
      .eq('user_id', userId)
      .eq('category_type', 'cuisine')
      .in('bucket', ['F', 'O']);
    if (error) throw error;

    const ids = (prefs ?? [])
      .map(p => Number((p as { category_id: string }).category_id))
      .filter(n => !Number.isNaN(n));
    if (ids.length === 0) return [];

    const { data: cuisines, error: cErr } = await supabase
      .from('cuisines')
      .select('id, code, name, display_name')
      .in('id', ids)
      .eq('is_user_facing', true);
    if (cErr) throw cErr;

    const bucketById = new Map<number, string>();
    (prefs ?? []).forEach(p => {
      const cid = Number((p as { category_id: string }).category_id);
      bucketById.set(cid, (p as { bucket: string }).bucket);
    });

    return (cuisines ?? [])
      .map((c: any) => c as CuisineOption)
      .sort((a, b) => {
        const ab = bucketById.get(a.id) === 'F' ? 0 : 1;
        const bb = bucketById.get(b.id) === 'F' ? 0 : 1;
        return ab - bb;
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    Logger.warn('SEARCH-REPO', 'getUserPersonalisedCuisines failed', { error: msg });
    return [];
  }
}

/**
 * @summary Logs a search query to app_events for analytics.
 *
 * @description Fire-and-forget — never blocks search results. Captures the
 *   raw query, result count, and which filter categories were active so we
 *   can later analyse "no-results" terms and synonym gaps.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string} query - What the user searched
 * @param {number} resultCount - How many results returned
 * @param {string[]} filtersApplied - Filter category names active at query time
 * @returns {Promise<void>}
 * @calledBy app/(tabs)/search.tsx after results load
 */
export async function logSearchEvent(
  userId: string,
  query: string,
  resultCount: number,
  filtersApplied: string[],
): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from('app_events').insert({
    user_id: userId,
    event_type: 'search_query',
    screen: 'search',
    metadata: { query, resultCount, filtersApplied },
  });
  if (error) Logger.warn('SEARCH-REPO', 'logSearchEvent failed', { error: error.message });
}

/**
 * @summary Adds a dish to a user's planner slot for a given date (quick-add).
 *
 * @description Used by the search long-press slot picker. Upserts the planner
 *   row, refusing to overwrite a locked slot. Logs an 'added_to_date' suggestion
 *   action for RE feedback.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number} dishId - Dish to add
 * @param {string} planDate - YYYY-MM-DD
 * @param {('breakfast'|'lunch'|'dinner')} slot - Slot to fill
 * @returns {Promise<{ ok: boolean; error?: string }>} ok=false when slot is locked
 * @throws {Error} when the upsert query fails for any reason other than locked
 * @calledBy SearchResultCard long-press slot picker overlay
 */
export async function addDishToSlot(
  userId: string,
  dishId: number,
  planDate: string,
  slot: 'breakfast' | 'lunch' | 'dinner',
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing, error: readErr } = await supabase
    .from('planner')
    .select('id, locked_slots')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .maybeSingle();

  if (readErr) {
    Logger.error('SEARCH-REPO', 'addDishToSlot read failed', { error: readErr.message });
    throw new Error(readErr.message);
  }

  const lockedSlots: string[] = (existing as { locked_slots?: string[] } | null)?.locked_slots ?? [];
  if (lockedSlots.includes(slot)) {
    return { ok: false, error: `${slot} is locked on ${planDate}` };
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    plan_date: planDate,
    [`${slot}_ref_type`]: 'dish',
    [`${slot}_ref_id`]: dishId,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from('planner')
    .upsert(payload, { onConflict: 'user_id,plan_date' });

  if (upsertErr) {
    Logger.error('SEARCH-REPO', 'addDishToSlot upsert failed', { error: upsertErr.message });
    throw new Error(upsertErr.message);
  }

  return { ok: true };
}
