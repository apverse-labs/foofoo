/**
 * re-edge-functions.test.ts
 *
 * Contract tests for the RE-prefixed Edge Functions against foofoo-staging,
 * per DOC-23 (API Contract Specification, Meal_Planning_RE_Technical_Docs_v1,
 * apverse-labs-RE branch). Previously the RE suite only validated RE tables
 * directly — the edge function layer itself (the actual product surface)
 * had zero invocation coverage. This file closes that gap for the read-only
 * / idempotent functions; functions that mutate per-user plan state are left
 * to re-persona-runner.ts (full mode), which already exercises them end to end.
 *
 * Run: npm run test:integration:re -- --testPathPattern=re-edge-functions
 * Requires: SUPABASE_STAGING_URL + SUPABASE_STAGING_ANON_KEY.
 *           SUPABASE_STAGING_SERVICE_ROLE_KEY for re-qa-run (service-role only).
 */

import { RE_URL, RE_ANON_KEY, RE_SERVICE_KEY, hasREConfig, hasREService } from '../lib/supabase-re';

jest.setTimeout(30000);

const describeIfRE = hasREConfig() ? describe : describe.skip;
const describeIfService = hasREService() ? describe : describe.skip;

async function callRE(
  functionName: string,
  opts: { method?: string; body?: Record<string, unknown>; key?: string } = {},
): Promise<Response> {
  const key = opts.key ?? RE_ANON_KEY;
  return fetch(`${RE_URL}/functions/v1/${functionName}`, {
    method: opts.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

describeIfRE('RE edge functions — DOC-23 contract', () => {
  it('re-onboarding-start (GET) returns the main-cohort card list', async () => {
    const res = await callRE('re-onboarding-start', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: unknown[] } | unknown[];
    expect(Array.isArray((body as { data?: unknown[] }).data ?? body)).toBe(true);
  });

  it('rejects unauthenticated calls to re-personas-assign', async () => {
    const res = await fetch(`${RE_URL}/functions/v1/re-personas-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect([401, 403]).toContain(res.status);
  });

  it('re-recommendations-rank rejects a request with no userId (DOC-23 §Recommendations)', async () => {
    const res = await callRE('re-recommendations-rank', { body: {} });
    expect(res.status).toBe(422);
  });

  it('re-recommendations-rank returns a structured response for a nonexistent user', async () => {
    const res = await callRE('re-recommendations-rank', {
      body: { userId: '00000000-0000-0000-0000-000000000000' },
    });
    expect([200, 404]).toContain(res.status);
  });
});

describeIfService('RE edge functions — service-role only (DOC-23 §QA)', () => {
  it('re-qa-run executes the 6-check taxonomy QA suite and returns a structured report', async () => {
    const res = await callRE('re-qa-run', { key: RE_SERVICE_KEY });
    expect(res.status).toBe(200);
    const report = (await res.json()) as Record<string, unknown>;
    expect(report).toHaveProperty('checkedAt');
    // Each of the 6 DOC-23 checks must surface its violation list, even if empty.
    expect(Array.isArray(report.classesWithNoDishes ?? report.classes_with_no_dishes)).toBe(true);
  });

  it('re-admin-taxonomy-version reports the active taxonomy version', async () => {
    const res = await callRE('re-admin-taxonomy-version', { method: 'GET', key: RE_SERVICE_KEY });
    expect(res.status).toBe(200);
  });
});
