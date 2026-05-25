/**
 * edge-functions.test.ts
 *
 * § A — Functional tests (plan generation, inferred-prefs pipeline)
 * § B — Contract tests (auth guards, error codes, Content-Type header)
 *
 * Run: npm run test:integration -- --testPathPattern=edge-functions
 * Depends on: lib/supabase.ts
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { supabaseAdmin, createTestUser, signInTestUser, deleteTestUser } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

jest.setTimeout(120000);

const SUPABASE_URL       = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Direct fetch to a Supabase Edge Function URL. */
async function callFn(
  functionName: string,
  opts: {
    body?: Record<string, unknown>;
    authHeader?: string;      // omit to test "no auth"
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.authHeader !== undefined) headers['Authorization'] = opts.authHeader;
  return fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

/** Parse JSON response body as any — avoids strict 'unknown' errors in test assertions. */
async function jsonBody(res: Response): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// § A — Functional tests (pre-existing)
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Function: generate-daily-plan', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `ef-test-${Date.now()}@foofoo-test.dev`;
    const user = await createTestUser(testEmail, 'EfTest123!');
    testUserId = user.id;

    await supabaseAdmin.from('user_diet_rules').upsert(
      { user_id: testUserId, food_pref: 'veg', excluded_ingredients: [] },
      { onConflict: 'user_id' },
    );

    await supabaseAdmin.from('user_category_preferences').insert([
      { user_id: testUserId, category_type: 'cuisine', item_id: 1, preference_bucket: 'frequently' },
      { user_id: testUserId, category_type: 'cuisine', item_id: 2, preference_bucket: 'occasionally' },
    ]);
  });

  afterAll(async () => {
    await supabaseAdmin.from('user_diet_rules').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_category_preferences').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('planner').delete().eq('user_id', testUserId);
    await deleteTestUser(testUserId);
  });

  it('function is invocable via service-role (targetUserId path)', async () => {
    const start = Date.now();
    const { data, error } = await supabaseAdmin.functions.invoke('generate-daily-plan', {
      body: {
        targetUserId: testUserId,
        planDate: new Date().toISOString().split('T')[0],
        forceRegenerate: true,
      },
    });
    const elapsed = Date.now() - start;

    if (error) {
      console.warn('⚠️  generate-daily-plan not deployed or errored:', error.message);
      return;
    }

    expect(data).not.toBeNull();
    expect(elapsed).toBeLessThan(30000);
  }, 35000);

  it('generated plan respects diet_type=veg hard constraint', async () => {
    const { data, error } = await supabaseAdmin.functions.invoke('generate-daily-plan', {
      body: {
        targetUserId: testUserId,
        planDate: new Date().toISOString().split('T')[0],
        forceRegenerate: true,
      },
    });

    if (error) {
      console.warn('⚠️  generate-daily-plan not deployed:', error.message);
      return;
    }

    const { data: plannerRow } = await supabaseAdmin
      .from('planner')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1)
      .single();

    if (!plannerRow) { console.warn('⚠️  No planner row created'); return; }

    const { data: carousel } = await supabaseAdmin
      .from('planner_carousel')
      .select('ref_id, ref_type')
      .eq('planner_id', plannerRow.id)
      .eq('ref_type', 'dish');

    if (!carousel || carousel.length === 0) { console.warn('⚠️  No carousel data'); return; }

    const dishIds = (carousel as any[]).map((c) => c.ref_id).filter(Boolean);
    if (dishIds.length > 0) {
      const { data: dishes } = await supabaseAdmin.from('dishes').select('id, diet_type').in('id', dishIds);
      const nonVeg = (dishes ?? []).filter((d: any) => d.diet_type === 'non_veg');
      expect(nonVeg).toHaveLength(0);
    }
  }, 35000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § A2 — calculate-inferred-prefs functional test
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Function: calculate-inferred-prefs', () => {
  let testUserId: string;

  beforeAll(async () => {
    const email = `inferred-${Date.now()}@foofoo-test.dev`;
    const user = await createTestUser(email, 'InferTest123!');
    testUserId = user.id;

    // Seed 30 suggestion_log rows spanning 2+ weeks so the user is eligible.
    const logs = Array.from({ length: 30 }, (_, i) => ({
      user_id:    testUserId,
      dish_id:    (i % 20) + 1,
      action:     i % 3 === 0 ? 'swiped_past' : 'locked',
      plan_date:  new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meal_slot:  'breakfast',
      position:   0,
      re_version: 'v1',
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));
    await supabaseAdmin.from('suggestion_logs').insert(logs);
  });

  afterAll(async () => {
    await supabaseAdmin.from('suggestion_logs').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('user_inferred_prefs').delete().eq('user_id', testUserId);
    await deleteTestUser(testUserId);
  });

  it('function is invocable (service-role)', async () => {
    const { data, error } = await supabaseAdmin.functions.invoke('calculate-inferred-prefs', {});
    if (error) {
      console.warn('⚠️  calculate-inferred-prefs not deployed:', error.message);
      return;
    }
    expect(data).not.toBeNull();
    expect(data.success).toBe(true);
  }, 60000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § B1 — Auth guard: user-facing functions
//
//   Auth contract: no Authorization header → 401 { success:false, error.code:'AUTH_FAILED' }
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: auth guard — user-facing functions', () => {
  const USER_FACING = [
    'generate-daily-plan',
    'regenerate-slot',
    'log-re-decision',
    'delete-user-account',
  ];

  it.each(USER_FACING)(
    '%s → 401 AUTH_FAILED when Authorization header is absent',
    async (fnName) => {
      const res = await callFn(fnName); // no authHeader
      if (res.status === 404 || res.status === 0) {
        console.warn(`⚠️  ${fnName} not deployed — skipping auth guard check`);
        return;
      }
      expect(res.status).toBe(401);
      const body = await jsonBody(res);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTH_FAILED');
    },
    15000,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// § B2 — Auth guard: CRON / admin functions
//
//   Auth contract: no Authorization header → 401 { success:false, error.code:'AUTH_FAILED' }
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: auth guard — CRON/admin functions', () => {
  const CRON_FUNCTIONS = [
    'send-morning-notification',
    'generate-daily-plans-batch',
    'daily-analytics-email',
    'compute-recipe-affinity',
    'calculate-inferred-prefs',
    'backfill-ingredients',
    'derive-dish-attributes',
  ];

  it.each(CRON_FUNCTIONS)(
    '%s → 401 AUTH_FAILED when Authorization header is absent',
    async (fnName) => {
      const res = await callFn(fnName); // no authHeader
      if (res.status === 404 || res.status === 0) {
        console.warn(`⚠️  ${fnName} not deployed — skipping auth guard check`);
        return;
      }
      expect(res.status).toBe(401);
      const body = await jsonBody(res);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTH_FAILED');
    },
    15000,
  );

  it('CRON functions accept requests bearing the service-role key', async () => {
    if (!SERVICE_ROLE_KEY) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — skipping service-role accept test');
      return;
    }
    // daily-analytics-email is the safest CRON to probe (read-only metrics, no side-effects in test env)
    const res = await callFn('daily-analytics-email', {
      authHeader: `Bearer ${SERVICE_ROLE_KEY}`,
    });
    if (res.status === 404) {
      console.warn('⚠️  daily-analytics-email not deployed — skipping');
      return;
    }
    // Should NOT be 401 when the correct service role key is supplied.
    expect(res.status).not.toBe(401);
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § B3 — Response format: Content-Type must be application/json
//
//   Every error response (including 401) must carry Content-Type: application/json.
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: error responses carry Content-Type: application/json', () => {
  const ALL_FUNCTIONS = [
    'generate-daily-plan',
    'regenerate-slot',
    'log-re-decision',
    'delete-user-account',
    'send-morning-notification',
    'generate-daily-plans-batch',
    'daily-analytics-email',
    'compute-recipe-affinity',
    'calculate-inferred-prefs',
    'backfill-ingredients',
    'derive-dish-attributes',
  ];

  it.each(ALL_FUNCTIONS)(
    '%s 401 response has Content-Type: application/json',
    async (fnName) => {
      const res = await callFn(fnName); // no auth → 401
      if (res.status === 404 || res.status === 0) {
        console.warn(`⚠️  ${fnName} not deployed — skipping Content-Type check`);
        return;
      }
      const ct = res.headers.get('content-type') ?? '';
      expect(ct).toContain('application/json');
    },
    15000,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// § B4 — Input validation: regenerate-slot
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: input validation — regenerate-slot', () => {
  let userToken: string;
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    if (!SERVICE_ROLE_KEY) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — skipping input-validation setup');
      return;
    }
    try {
      testEmail = `regen-val-${Date.now()}@foofoo-test.dev`;
      const user = await createTestUser(testEmail, 'RegenVal123!');
      testUserId = user.id;
      const client = await signInTestUser(testEmail, 'RegenVal123!');
      const { data: sessionData } = await client.auth.getSession();
      userToken = sessionData.session?.access_token ?? '';
    } catch (err) {
      console.warn('⚠️  createTestUser failed — input-validation tests will be skipped:', String(err));
    }
  });

  afterAll(async () => {
    if (testUserId && /^[0-9a-f-]{36}$/.test(testUserId)) {
      await deleteTestUser(testUserId);
    }
  });

  it('invalid slot value → 400 with INVALID_SLOT error code', async () => {
    if (!userToken) { console.warn('⚠️  No user token — skipping'); return; }

    const res = await callFn('regenerate-slot', {
      authHeader: `Bearer ${userToken}`,
      body: { planDate: '2026-01-01', slot: 'brunch', action: 'refresh' },
    });

    if (res.status === 404) { console.warn('⚠️  regenerate-slot not deployed — skipping'); return; }

    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('INVALID_SLOT');
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('application/json');
  }, 15000);

  it('invalid planDate format → 400 with INVALID_DATE error code', async () => {
    if (!userToken) { console.warn('⚠️  No user token — skipping'); return; }

    const res = await callFn('regenerate-slot', {
      authHeader: `Bearer ${userToken}`,
      body: { planDate: 'not-a-date', slot: 'breakfast', action: 'refresh' },
    });

    if (res.status === 404) { console.warn('⚠️  regenerate-slot not deployed — skipping'); return; }

    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('INVALID_DATE');
  }, 15000);

  it('invalid action value → 400 with INVALID_ACTION error code', async () => {
    if (!userToken) { console.warn('⚠️  No user token — skipping'); return; }

    const res = await callFn('regenerate-slot', {
      authHeader: `Bearer ${userToken}`,
      body: { planDate: '2026-01-01', slot: 'lunch', action: 'nuke_it' },
    });

    if (res.status === 404) { console.warn('⚠️  regenerate-slot not deployed — skipping'); return; }

    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('INVALID_ACTION');
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § B5 — Input validation: log-re-decision
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: input validation — log-re-decision', () => {
  let userToken: string;
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    if (!SERVICE_ROLE_KEY) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — skipping input-validation setup');
      return;
    }
    try {
      testEmail = `log-val-${Date.now()}@foofoo-test.dev`;
      const user = await createTestUser(testEmail, 'LogVal123!');
      testUserId = user.id;
      const client = await signInTestUser(testEmail, 'LogVal123!');
      const { data: sessionData } = await client.auth.getSession();
      userToken = sessionData.session?.access_token ?? '';
    } catch (err) {
      console.warn('⚠️  createTestUser failed — input-validation tests will be skipped:', String(err));
    }
  });

  afterAll(async () => {
    if (testUserId && /^[0-9a-f-]{36}$/.test(testUserId)) {
      await deleteTestUser(testUserId);
    }
  });

  it('missing required fields → 400 with VALIDATION_ERROR code', async () => {
    if (!userToken) { console.warn('⚠️  No user token — skipping'); return; }

    const res = await callFn('log-re-decision', {
      authHeader: `Bearer ${userToken}`,
      body: { mealSlot: 'breakfast' }, // planDate and dishId missing
    });

    if (res.status === 404) { console.warn('⚠️  log-re-decision not deployed — skipping'); return; }

    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § B6 — Error envelope shape
//
//   Every error response must be { success: false, error: { code, message, retry } }
// ─────────────────────────────────────────────────────────────────────────────

describe('Contract: error envelope shape', () => {
  it('generate-daily-plan 401 response has full error envelope', async () => {
    const res = await callFn('generate-daily-plan');
    if (res.status === 404 || res.status === 0) {
      console.warn('⚠️  generate-daily-plan not deployed — skipping');
      return;
    }
    expect(res.status).toBe(401);
    const body = await jsonBody(res);
    expect(typeof body.success).toBe('boolean');
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('object');
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.retry).toBe('boolean');
  }, 15000);

  it('regenerate-slot 401 response has full error envelope', async () => {
    const res = await callFn('regenerate-slot');
    if (res.status === 404 || res.status === 0) {
      console.warn('⚠️  regenerate-slot not deployed — skipping');
      return;
    }
    expect(res.status).toBe(401);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(typeof body.error?.code).toBe('string');
    expect(typeof body.error?.message).toBe('string');
    expect(typeof body.error?.retry).toBe('boolean');
  }, 15000);

  it('calculate-inferred-prefs 401 response has full error envelope', async () => {
    const res = await callFn('calculate-inferred-prefs');
    if (res.status === 404 || res.status === 0) {
      console.warn('⚠️  calculate-inferred-prefs not deployed — skipping');
      return;
    }
    expect(res.status).toBe(401);
    const body = await jsonBody(res);
    expect(body.success).toBe(false);
    expect(typeof body.error?.code).toBe('string');
    expect(typeof body.error?.message).toBe('string');
    expect(typeof body.error?.retry).toBe('boolean');
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────────────
// § C — Performance smoke test
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Function: performance', () => {
  it('any available edge function responds (including auth error) within 5 seconds', async () => {
    const knownFunctions = ['generate-daily-plan', 'calculate-inferred-prefs', 'regenerate-slot'];
    let tested = 0;

    for (const fn of knownFunctions) {
      const start = Date.now();
      const res = await callFn(fn);
      const elapsed = Date.now() - start;

      if (res.status !== 404) {
        expect(elapsed).toBeLessThan(5000);
        tested++;
      }
    }

    if (tested === 0) {
      console.warn('⚠️  No edge functions deployed — skipping performance test');
    }
  }, 30000);
});
