/**
 * re-onboarding-flow.ts — pure dynamic-branching + confidence logic for RE onboarding (UI-BUILD-02).
 *
 * PURE (no react-native) → unit-testable. Encodes ONBOARDING_UX_SPEC: which screens show for a given
 * cohort/sub-cohort/answers, and the DOC-03 §6 / cold-start confidence accumulation. No DB/API here.
 */

/** Class-level swipe reaction → class_affinity_vector value in [-1, 1] (pure; used by REClassSwipeCard). */
export type SwipeReaction = 'more' | 'like' | 'sometimes' | 'not' | 'never';
export const REACTION_AFFINITY: Record<SwipeReaction, number> = {
  more: 1.0, like: 0.6, sometimes: 0.2, not: -0.4, never: -1.0,
};

export type OnboardingScreen =
  | 'welcome' | 'cohort' | 'members' | 'home_state' | 'current_city'
  | 'diet' | 'cook' | 'health' | 'weekday' | 'weekend' | 'swipe' | 'confirm' | 'loading' | 'reveal';

/** Sub-cohorts that trigger the member-capture screen (mirrors re-onboarding.repository MEMBER_REQUIRING_SUBCOHORTS). */
const MEMBER_SUBCOHORTS = new Set([
  'SC2D', 'SC2E', 'SC2F', 'SC3A', 'SC3B', 'SC3C', 'SC3D', 'SC4A', 'SC4B', 'SC4C', 'SC4D', 'SC4E', 'SC4F',
]);

export interface OnboardingAnswers {
  mainCohortId?: string;
  subCohortId?: string;
  hasMembers?: boolean;        // user indicated dependents
  healthChosen?: boolean;      // user opened/answered health
  // skip tracking
  skipped?: Partial<Record<OnboardingScreen, boolean>>;
}

/**
 * @summary Compute the ordered screen list for the current answers (dynamic branching).
 * @description members/health screens appear only when relevant; everything else is core.
 */
export function buildScreenFlow(a: OnboardingAnswers): OnboardingScreen[] {
  const flow: OnboardingScreen[] = ['welcome', 'cohort'];
  const sc = a.subCohortId ?? '';
  if (a.hasMembers || MEMBER_SUBCOHORTS.has(sc)) flow.push('members');
  flow.push('home_state', 'current_city', 'diet', 'cook');
  if (a.healthChosen || MEMBER_SUBCOHORTS.has(sc)) flow.push('health');
  flow.push('weekday', 'weekend', 'swipe', 'confirm', 'loading', 'reveal');
  return flow;
}

/** Per-screen confidence contribution when answered (DOC-03 §6 weights). */
export const CONFIDENCE_WEIGHTS: Partial<Record<OnboardingScreen, number>> = {
  cohort: 0.70, members: 0.06, home_state: 0.05, current_city: 0.05,
  diet: 0.10, cook: 0.04, health: 0.08, weekday: 0.04, weekend: 0.03, swipe: 0.05,
};

/**
 * @summary Accumulate confidence from answered (non-skipped) screens, clamped 0..1.
 * @description Skipped screens contribute nothing (cold-start, DOC-20) — never blocks.
 */
export function computeOnboardingConfidence(a: OnboardingAnswers): number {
  const flow = buildScreenFlow(a).filter((s) => CONFIDENCE_WEIGHTS[s] !== undefined);
  let conf = 0;
  for (const s of flow) {
    if (a.skipped?.[s]) continue;
    conf += CONFIDENCE_WEIGHTS[s] ?? 0;
  }
  return Math.min(1, Math.max(0, parseFloat(conf.toFixed(3))));
}

/** High confidence (≥0.85) lets optional screens (weekend, swipe) auto-collapse to a confirm. */
export function shouldAutoCollapseOptional(a: OnboardingAnswers): boolean {
  // confidence from the CORE screens only (exclude the optional ones we'd collapse)
  const coreSkipped = { ...a, skipped: { ...a.skipped, weekend: true, swipe: true } };
  return computeOnboardingConfidence(coreSkipped) >= 0.85;
}
