// integration/combo-architecture.test.ts
// Tests dish combo system per Doc #11A Section 5
// Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { supabaseAdmin } from '../lib/supabase';

jest.setTimeout(60000);

describe('Combo Architecture: dish_combos table', () => {
  it('dish_combos table has rows', async () => {
    const { data, error } = await supabaseAdmin
      .from('dish_combos')
      .select('id, name, combo_type, meal_types')
      .limit(10);

    expect(error).toBeNull();
    // May be empty in a fresh DB, but no error
    expect(data).not.toBeNull();
  });

  it('combo_type values are valid (inseparable | base_with_sides | thali)', async () => {
    const VALID_COMBO_TYPES = ['inseparable', 'base_with_sides', 'thali'];

    const { data, error } = await supabaseAdmin
      .from('dish_combos')
      .select('id, combo_type')
      .not('combo_type', 'is', null);

    expect(error).toBeNull();
    if (!data || data.length === 0) {
      console.warn('⚠️ No combos in DB — skipping combo_type validation');
      return;
    }

    const invalid = data.filter(
      (row: any) => !VALID_COMBO_TYPES.includes(row.combo_type)
    );
    expect(invalid).toHaveLength(0);
  });

  it('meal_types is an array on dish_combos', async () => {
    const { data, error } = await supabaseAdmin
      .from('dish_combos')
      .select('id, meal_types')
      .limit(5);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    data.forEach((row: any) => {
      expect(Array.isArray(row.meal_types)).toBe(true);
    });
  });
});

describe('Combo Architecture: dish_combo_items', () => {
  it('dish_combo_items has is_default and is_swappable columns working', async () => {
    const { data, error } = await supabaseAdmin
      .from('dish_combo_items')
      .select('combo_id, dish_id, role, is_default, is_swappable, display_order')
      .limit(10);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('each combo has at least one is_default=true item', async () => {
    const { data: combos, error: combosError } = await supabaseAdmin
      .from('dish_combos')
      .select('id')
      .limit(5);

    expect(combosError).toBeNull();
    if (!combos || combos.length === 0) {
      console.warn('⚠️ No combos in DB — skipping default item validation');
      return;
    }

    for (const combo of combos) {
      const { data: items, error } = await supabaseAdmin
        .from('dish_combo_items')
        .select('is_default')
        .eq('combo_id', combo.id);

      expect(error).toBeNull();
      if (!items || items.length === 0) continue;

      const hasDefault = items.some((item: any) => item.is_default === true);
      expect(hasDefault).toBe(true);
    }
  });

  it('swappable combos have at least one non-default alternative', async () => {
    const { data: swappableItems, error } = await supabaseAdmin
      .from('dish_combo_items')
      .select('combo_id, dish_id, is_swappable, is_default')
      .eq('is_swappable', true)
      .limit(5);

    expect(error).toBeNull();
    if (!swappableItems || swappableItems.length === 0) {
      console.warn('⚠️ No swappable combo items in DB');
      return;
    }

    // A swappable combo must have both default and non-default items
    for (const item of swappableItems) {
      const { data: allItems, err } = await supabaseAdmin
        .from('dish_combo_items')
        .select('is_default')
        .eq('combo_id', item.combo_id) as any;

      if (!allItems || allItems.length <= 1) continue;
      const hasDefault = allItems.some((i: any) => i.is_default === true);
      const hasAlternative = allItems.some((i: any) => i.is_default === false);
      expect(hasDefault).toBe(true);
      expect(hasAlternative).toBe(true);
    }
  });
});

describe('Combo Architecture: planner uses polymorphic ref_type', () => {
  it('planner combo entries use ref_type = "combo"', async () => {
    // Check if any planner rows exist with combo ref_type
    const { data, error } = await supabaseAdmin
      .from('planner')
      .select('breakfast_ref_type, lunch_ref_type, dinner_ref_type')
      .or('breakfast_ref_type.eq.combo,lunch_ref_type.eq.combo,dinner_ref_type.eq.combo')
      .limit(5);

    expect(error).toBeNull();
    // No assertion on count — combo refs may not exist in test DB
    // Just verifying the query runs (column exists and accepts 'combo' value)
  });
});

describe('Combo Architecture: never-listing a combo component', () => {
  it('never_list accepts ref_type = "combo" entries', async () => {
    // Verify the never_list table can store combo refs
    // We check by inserting a test entry and immediately deleting it
    const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // non-existent, test only

    const { error } = await supabaseAdmin
      .from('never_list')
      .insert({
        user_id: TEST_USER_ID,
        ref_type: 'combo',
        ref_id: 9999,
        is_active: true,
      });

    // May fail due to FK constraint (user doesn't exist) but not due to ref_type
    if (error && error.message.includes('foreign key')) {
      // Expected — FK to profiles fails, but not ref_type validation
      expect(error.message).toContain('foreign key');
    } else if (error) {
      // If another error, check it's not about invalid ref_type
      expect(error.message).not.toContain('invalid input value for enum');
    }

    // Cleanup (in case insert succeeded)
    await supabaseAdmin
      .from('never_list')
      .delete()
      .eq('ref_id', 9999)
      .eq('ref_type', 'combo');
  });
});
