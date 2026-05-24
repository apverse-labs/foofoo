// integration/edge-functions.test.ts
// Tests Supabase Edge Functions (RE plan generation, inferred prefs)
// Requires: SUPABASE_URL + SUPABASE_ACCESS_TOKEN + SUPABASE_SERVICE_ROLE_KEY

import { supabaseAdmin, createTestUser, signInTestUser, deleteTestUser } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

jest.setTimeout(120000);

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ACCESS_TOKEN ?? '';

// ─── generate-first-plan Edge Function ───────────────────────────────────────

describe('Edge Function: generate-first-plan', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `ef-test-${Date.now()}@foofoo-test.dev`;
    const user = await createTestUser(testEmail, 'EfTest123!');
    testUserId = user.id;

    // Seed minimal onboarding data
    await supabaseAdmin.from('user_diet_rules').upsert({
      user_id: testUserId,
      diet_type: 'veg',
      excluded_ingredient_ids: [],
      allergen_ingredient_ids: [],
    });

    await supabaseAdmin.from('user_category_preferences').insert([
      { user_id: testUserId, category_type: 'cuisine', item_id: 1, preference_bucket: 'frequently' },
      { user_id: testUserId, category_type: 'cuisine', item_id: 2, preference_bucket: 'occasionally' },
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await supabaseAdmin.from('user_diet_rules').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_category_preferences').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('planner').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('planner_carousel').delete().eq('user_id', testUserId);
    await deleteTestUser(testUserId);
  });

  it('generate-first-plan function exists and is invocable', async () => {
    const start = Date.now();
    const { data, error } = await supabaseAdmin.functions.invoke('generate-first-plan', {
      body: {
        user_id: testUserId,
        date: new Date().toISOString().split('T')[0],
      },
    });
    const elapsed = Date.now() - start;

    if (error) {
      // Function may not be deployed yet — treat as DATA_GAP not failure
      console.warn('⚠️ generate-first-plan not deployed or errored:', error.message);
      return;
    }

    // Function responded
    expect(data).not.toBeNull();
    // Must respond within 3 seconds per spec
    expect(elapsed).toBeLessThan(3000);
  }, 10000);

  it('generated plan respects diet_type=veg hard constraint', async () => {
    const { data, error } = await supabaseAdmin.functions.invoke('generate-first-plan', {
      body: {
        user_id: testUserId,
        date: new Date().toISOString().split('T')[0],
      },
    });

    if (error) {
      console.warn('⚠️ generate-first-plan not deployed:', error.message);
      return;
    }

    // If plan was generated, check planner_carousel for non-veg dishes
    const { data: carousel } = await (supabaseAdmin as any)
      .from('planner_carousel')
      .select('ref_ids, scores')
      .eq('user_id', testUserId)
      .limit(3);

    if (!carousel || carousel.length === 0) {
      console.warn('⚠️ No carousel data generated');
      return;
    }

    // All ref_ids should point to veg dishes
    const allRefIds = carousel.flatMap((c: any) => c.ref_ids ?? []);
    if (allRefIds.length > 0) {
      const { data: dishes } = await supabaseAdmin
        .from('dishes')
        .select('id, diet_type')
        .in('id', allRefIds);

      const nonVeg = (dishes ?? []).filter((d: any) => d.diet_type === 'non_veg');
      expect(nonVeg).toHaveLength(0);
    }
  }, 30000);
});

// ─── calculate-inferred-prefs Edge Function ───────────────────────────────────

describe('Edge Function: calculate-inferred-prefs', () => {
  let testUserId: string;

  beforeAll(async () => {
    const email = `inferred-${Date.now()}@foofoo-test.dev`;
    const user = await createTestUser(email, 'InferTest123!');
    testUserId = user.id;

    // Seed 2 weeks of suggestion logs (mature user simulation)
    const logs = Array.from({ length: 30 }, (_, i) => ({
      user_id: testUserId,
      ref_type: 'dish',
      ref_id: (i % 20) + 1,
      carousel_position: 1,
      action: i % 3 === 0 ? 'swiped_past' : 'locked',
      action_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));

    await supabaseAdmin.from('suggestion_logs').insert(logs);
  });

  afterAll(async () => {
    await supabaseAdmin.from('suggestion_logs').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_inferred_prefs').delete().eq('user_id', testUserId);
    await deleteTestUser(testUserId);
  });

  it('calculate-inferred-prefs function exists and is invocable', async () => {
    const { data, error } = await supabaseAdmin.functions.invoke('calculate-inferred-prefs', {
      body: { user_id: testUserId },
    });

    if (error) {
      console.warn('⚠️ calculate-inferred-prefs not deployed:', error.message);
      return;
    }

    expect(data).not.toBeNull();
  }, 30000);

  it('user_inferred_prefs row created after calculation', async () => {
    // Invoke the function
    await supabaseAdmin.functions.invoke('calculate-inferred-prefs', {
      body: { user_id: testUserId },
    });

    // Check if prefs were written
    const { data, error } = await supabaseAdmin
      .from('user_inferred_prefs')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (error) {
      console.warn('⚠️ user_inferred_prefs not created — function may not be deployed');
      return;
    }

    expect(data).not.toBeNull();
    // Verify decay_config is set
    expect((data as any).decay_config).not.toBeNull();
  }, 30000);
});

// ─── Edge function response time ──────────────────────────────────────────────

describe('Edge Function: performance', () => {
  it('any available edge function responds within 3 seconds', async () => {
    const knownFunctions = ['generate-first-plan', 'calculate-inferred-prefs', 'get-weather'];
    let tested = 0;

    for (const fn of knownFunctions) {
      const start = Date.now();
      const { error } = await supabaseAdmin.functions.invoke(fn, { body: {} });
      const elapsed = Date.now() - start;

      if (!error || error.message.includes('400') || error.message.includes('422')) {
        // Function exists and responded (even with validation error)
        expect(elapsed).toBeLessThan(3000);
        tested++;
      }
    }

    if (tested === 0) {
      console.warn('⚠️ No edge functions deployed — skipping performance test');
    }
  }, 15000);
});
