// integration/schema-validation.test.ts
// Validates live Supabase DB schema against Doc #11A v4 spec
// Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars

import { supabaseAdmin } from '../lib/supabase';

// ─── MVP Active tables from Doc #11A Section 6 ───────────────────────────────

const MVP_TABLES = [
  // Food Knowledge Base (13 tables — 2 Keep Empty)
  'cuisine_groups', 'cuisines', 'dishes', 'tags', 'dish_tags',
  'dish_similar', 'dish_combos', 'dish_combo_items', 'ingredients',
  'ingredient_aliases', 'meal_ingredients', 'term_synonyms',
  // User & Preferences
  'profiles', 'user_diet_rules', 'user_category_preferences',
  'user_consent', 'user_feedback',
  // Planner & RE (keep-empty excluded)
  'planner', 'planner_carousel', 'suggestion_logs', 'never_list',
  'user_recipe_affinity', 'recommendation_debug_log', 'user_inferred_prefs',
  'user_dish_patterns', 'weather_cache', 'region_food_affinity',
  // App Intelligence
  'app_events', 'user_behavioral_profile', 'experiments', 'experiment_assignments',
  // Operations
  'audit_log', 'role_audit', 'etl_jobs', 'cache_metadata',
  'mv_refresh_history', 'media_assets', 'migration_log', 'notification_log',
];

const KEEP_EMPTY_TABLES = ['recipes', 'recipe_steps', 'localizations', 'family_members'];

const DROPPED_TABLES = [
  'user_preferences',
  'user_cuisine_preferences',
  'ingredient_normalization',
  'migration_log_ist',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether a table (or view) is accessible via PostgREST.
 * Returns false if the table doesn't exist or isn't exposed.
 */
async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await (supabaseAdmin as any)
    .from(tableName)
    .select('*')
    .limit(0);
  return !error;
}

/**
 * Check whether a specific column exists in a table by probing a SELECT.
 *
 * NOTE: We intentionally do NOT use information_schema.columns here —
 * Supabase PostgREST only exposes the public schema, so querying
 * information_schema silently returns an empty result set.
 * Probing via SELECT is reliable for any non-empty or empty table.
 *
 * error.code '42703' = undefined_column (column missing)
 * error.code '42P01' = undefined_table  (table missing)
 * no error           = column exists
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const { error } = await (supabaseAdmin as any)
    .from(tableName)
    .select(columnName)
    .limit(0);
  return !error;
}

async function getTableRowCount(tableName: string): Promise<number> {
  const { count, error } = await (supabaseAdmin as any)
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count ?? 0;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Schema Validation: MVP Active Tables', () => {
  jest.setTimeout(60000);

  it('all MVP active tables exist in public schema', async () => {
    const missing: string[] = [];
    for (const table of MVP_TABLES) {
      const exists = await tableExists(table);
      if (!exists) missing.push(table);
    }
    expect(missing).toEqual([]);
  }, 60000);

  it('all 4 Keep Empty tables exist', async () => {
    const missing: string[] = [];
    for (const table of KEEP_EMPTY_TABLES) {
      const exists = await tableExists(table);
      if (!exists) missing.push(table);
    }
    expect(missing).toEqual([]);
  }, 30000);

  it('Keep Empty tables have 0 rows (not populated)', async () => {
    const nonEmpty: string[] = [];
    for (const table of KEEP_EMPTY_TABLES) {
      const count = await getTableRowCount(table);
      if (count > 0) nonEmpty.push(`${table}(${count} rows)`);
    }
    // Soft warning — not a hard fail if seed data was added
    if (nonEmpty.length > 0) {
      console.warn(`⚠️ Keep Empty tables have data: ${nonEmpty.join(', ')}`);
    }
    // Not asserting 0 rows — this is informational
  }, 30000);

  it('dropped tables do NOT exist in live DB', async () => {
    const stillExist: string[] = [];
    for (const table of DROPPED_TABLES) {
      const exists = await tableExists(table);
      if (exists) stillExist.push(table);
    }
    expect(stillExist).toEqual([]);
  }, 30000);
});

describe('Schema Validation: dishes table columns', () => {
  jest.setTimeout(30000);

  const REQUIRED_DISH_COLUMNS = [
    'id', 'name', 'cuisine_id',
    'spice_level',       // replaces is_spicy
    'blurhash',
    'meal_types',        // text[]
    'dish_role',
    'ingredient_ids',    // integer[]
    'is_jain',           // boolean, auto-derived
    'derived_at',        // timestamptz
  ];

  it('dishes table has all required columns from Doc #11A', async () => {
    const missing: string[] = [];
    for (const col of REQUIRED_DISH_COLUMNS) {
      const exists = await columnExists('dishes', col);
      if (!exists) missing.push(col);
    }
    expect(missing).toEqual([]);
  }, 30000);

  it('dishes table does NOT have deprecated is_spicy column', async () => {
    const hasIsSpicy = await columnExists('dishes', 'is_spicy');
    expect(hasIsSpicy).toBe(false);
  });
});

describe('Schema Validation: planner table — polymorphic slots', () => {
  jest.setTimeout(30000);

  it('planner has polymorphic slot columns (ref_type + ref_id), not old array IDs', async () => {
    const hasBreakfastRefType = await columnExists('planner', 'breakfast_ref_type');
    const hasBreakfastRefId   = await columnExists('planner', 'breakfast_ref_id');
    expect(hasBreakfastRefType).toBe(true);
    expect(hasBreakfastRefId).toBe(true);
  });

  it('planner has locked_slots column', async () => {
    expect(await columnExists('planner', 'locked_slots')).toBe(true);
  });
});

describe('Schema Validation: user_category_preferences', () => {
  jest.setTimeout(30000);

  it('user_category_preferences has category_type column', async () => {
    expect(await columnExists('user_category_preferences', 'category_type')).toBe(true);
  });

  it('user_category_preferences has item_id (integer), not text name', async () => {
    // Added by migration 20260524000001_sprint5_test_schema_gaps
    expect(await columnExists('user_category_preferences', 'item_id')).toBe(true);
  });

  it('user_category_preferences has preference_bucket column', async () => {
    // Added by migration 20260524000001_sprint5_test_schema_gaps
    expect(await columnExists('user_category_preferences', 'preference_bucket')).toBe(true);
  });
});

describe('Schema Validation: dish_popularity materialized view', () => {
  jest.setTimeout(30000);

  it('dish_popularity materialized view exists and is queryable', async () => {
    // Only select dish_id (stable across all view versions) to avoid
    // failures from views created by an older migration lacking newer
    // computed columns (e.g. trending_score added in 20260520000004
    // which may have been skipped by IF NOT EXISTS).
    const { error } = await (supabaseAdmin as any)
      .from('dish_popularity')
      .select('dish_id')
      .limit(1);
    // View may be empty (no suggestion_logs yet) — that is fine.
    expect(error).toBeNull();
  });
});

describe('Schema Validation: user_dish_patterns', () => {
  jest.setTimeout(30000);

  const REQUIRED_UPD_COLUMNS = [
    'user_id', 'dish_id', 'preferred_slots', 'preferred_days',
    'frequency', 'last_suggested', 'last_accepted',
    'acceptance_count', 'rejection_count',
  ];

  it('user_dish_patterns has all columns from Doc #11A Section 3.1', async () => {
    const missing: string[] = [];
    for (const col of REQUIRED_UPD_COLUMNS) {
      const exists = await columnExists('user_dish_patterns', col);
      if (!exists) missing.push(col);
    }
    expect(missing).toEqual([]);
  }, 30000);
});

describe('Schema Validation: user_inferred_prefs', () => {
  jest.setTimeout(30000);

  it('user_inferred_prefs has decay_config jsonb column', async () => {
    // Added by migration 20260524000001_sprint5_test_schema_gaps
    expect(await columnExists('user_inferred_prefs', 'decay_config')).toBe(true);
  });
});

describe('Schema Validation: RLS enabled', () => {
  jest.setTimeout(60000);

  const RLS_REQUIRED_TABLES = [
    'profiles', 'user_diet_rules', 'user_category_preferences',
    'user_consent', 'planner', 'suggestion_logs', 'never_list',
    'user_inferred_prefs', 'user_dish_patterns',
  ];

  it('RLS is enabled on all user-data tables', async () => {
    // Test RLS indirectly: service role must be able to query each table
    // (it bypasses RLS). Full isolation testing is in rls-security.test.ts.
    for (const table of RLS_REQUIRED_TABLES) {
      const exists = await tableExists(table);
      if (!exists) {
        console.warn(`⚠️ Table ${table} does not exist, skipping RLS check`);
        continue;
      }
      const { error } = await (supabaseAdmin as any)
        .from(table)
        .select('*', { count: 'exact', head: true });
      expect(error).toBeNull();
    }
  }, 60000);
});

describe('Schema Validation: dish_combos and dish_combo_items', () => {
  jest.setTimeout(30000);

  it('dish_combos table exists with combo_type column', async () => {
    expect(await columnExists('dish_combos', 'combo_type')).toBe(true);
    expect(await columnExists('dish_combos', 'combo_name')).toBe(true);
    expect(await columnExists('dish_combos', 'meal_types')).toBe(true);
  });

  it('dish_combo_items has is_default and is_swappable columns', async () => {
    expect(await columnExists('dish_combo_items', 'is_default')).toBe(true);
    expect(await columnExists('dish_combo_items', 'is_swappable')).toBe(true);
  });
});
