/**
 * targets.ts
 *
 * QA target selection. The RE test suite can run against either the RE staging
 * Supabase project (default) or the MVP production project. QA_TARGET selects
 * which; everything else (gates, runner, reports) reads ACTIVE_TARGET from here.
 *
 * Run: imported by personas/re-persona-runner.ts, integration/re-*.test.ts
 */

export type QATarget = 're-staging' | 'mvp-prod';

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

/** MVP production Supabase env (the original app project). */
export const MVP_PROD = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  projectRef: 'ufgfznpqixplcbhmsqqw',
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

/** Resolve the full config object for the active (or explicitly requested) target. */
export function getTarget(target: QATarget = ACTIVE_TARGET): TargetConfig {
  const src = target === 'mvp-prod' ? MVP_PROD : RE_STAGING;
  return {
    name: target,
    url: src.url,
    anonKey: src.anonKey,
    serviceKey: src.serviceKey,
    projectRef: src.projectRef,
    region: src.region,
  };
}
