/**
 * targets.ts
 *
 * Single source of truth for which Supabase project the test suite talks to.
 * Per SYSTEM_STATE.md, `ufgfznpqixplcbhmsqqw` (legacy "MVP" ref) is
 * DEP-PRODUCTION — live user data — and `kwypxyqxojauhiehuirz` (foofoo-staging)
 * is DEP-STAGING, which carries the full CKPT-001 schema *plus* the RE tables
 * (BUILD-01..10). Staging is therefore a safe superset for every suite,
 * legacy and RE alike, and is the only sanctioned default test target.
 *
 * lib/supabase.ts and lib/supabase-re.ts both resolve through getTarget() so
 * there is exactly one place that decides which project a test can reach.
 *
 * Run: imported by lib/supabase.ts, lib/supabase-re.ts, personas/re-persona-runner.ts,
 *      integration/re-*.test.ts
 */

export type QATarget = 're-staging' | 'mvp-prod';

/** DEP-PRODUCTION project ref — never a sanctioned test target. */
export const PRODUCTION_PROJECT_REF = 'ufgfznpqixplcbhmsqqw';

/** RE staging Supabase env (anon-key only by default; service key optional). */
export const RE_STAGING = {
  url:
    process.env.SUPABASE_STAGING_URL ||
    process.env.SUPABASE_RE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_RE_URL ||
    '',
  anonKey:
    process.env.SUPABASE_STAGING_ANON_KEY ||
    process.env.SUPABASE_RE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_RE_ANON_KEY ||
    '',
  serviceKey:
    process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_RE_SERVICE_KEY ||
    process.env.SUPABASE_RE_SERVICE_ROLE_KEY ||
    '',
  projectRef: 'kwypxyqxojauhiehuirz',
  region: 'ap-south-1',
} as const;

/**
 * MVP production Supabase env. Documented for completeness only — getTarget()
 * refuses to hand this back unless ALLOW_PRODUCTION_TARGET=true is set
 * explicitly, since it is DEP-PRODUCTION.
 */
export const MVP_PROD = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  projectRef: PRODUCTION_PROJECT_REF,
  region: 'ap-south-1',
} as const;

function resolveTarget(): QATarget {
  const raw = (process.env.QA_TARGET || 're-staging').toLowerCase();
  return raw === 'mvp-prod' ? 'mvp-prod' : 're-staging';
}

/** The currently selected QA target (defaults to 're-staging'). */
export const ACTIVE_TARGET: QATarget = resolveTarget();

export interface TargetConfig {
  name: QATarget;
  url: string;
  anonKey: string;
  serviceKey: string;
  projectRef: string;
  region: string;
}

function refFromUrl(url: string): string {
  return url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? '';
}

/**
 * Hard safety gate: throws if the resolved config points at DEP-PRODUCTION,
 * unless explicitly overridden. Called by every code path that hands out a
 * Supabase client to a test.
 */
export function assertSafeForTesting(cfg: { projectRef: string; url: string }): void {
  const isProd =
    cfg.projectRef === PRODUCTION_PROJECT_REF || refFromUrl(cfg.url) === PRODUCTION_PROJECT_REF;
  if (isProd && process.env.ALLOW_PRODUCTION_TARGET !== 'true') {
    throw new Error(
      `[targets] Refusing to run tests against the PRODUCTION Supabase project ` +
        `(${PRODUCTION_PROJECT_REF}). foofoo-staging (${RE_STAGING.projectRef}) carries the ` +
        `full schema and is the only sanctioned test target. Set ` +
        `ALLOW_PRODUCTION_TARGET=true if you really intend this (not recommended).`,
    );
  }
}

/** Resolve the full config object for the active (or explicitly requested) target. */
export function getTarget(target: QATarget = ACTIVE_TARGET): TargetConfig {
  const src = target === 'mvp-prod' ? MVP_PROD : RE_STAGING;
  const cfg: TargetConfig = {
    name: target,
    url: src.url,
    anonKey: src.anonKey,
    serviceKey: src.serviceKey,
    projectRef: src.projectRef,
    region: src.region,
  };
  assertSafeForTesting(cfg);
  return cfg;
}
