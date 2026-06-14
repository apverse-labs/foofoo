/**
 * re-ui-helpers.ts — pure UI helpers for RE foundation components (UI-BUILD-01).
 *
 * PURE (no react-native import) → unit-testable. Maps states/errors to warm,
 * non-technical copy and builds accessibility labels. No DB / API / RE logic.
 */

// ── Empty states (HOME §G / WEEKLY §J) ──────────────────────────────────────────
export type EmptyKind = 'no-plan' | 'no-candidate' | 'no-addon' | 'skipped';

export interface StateContent { title: string; body: string; ctaLabel?: string; }

export function emptyStateContent(kind: EmptyKind): StateContent {
  switch (kind) {
    case 'no-plan':
      return { title: "Let's build your week", body: 'Answer a few quick questions and we’ll plan your meals.', ctaLabel: 'Get started' };
    case 'no-candidate':
      return { title: 'Great options coming soon', body: 'We’re still filling out dishes for this meal — hang tight.' };
    case 'no-addon':
      return { title: 'No add-on needed today', body: 'Everyone’s set with the family meal.' };
    case 'skipped':
      return { title: 'We’ve made smart guesses', body: 'A few swipes will sharpen this fast.', ctaLabel: 'Help us learn' };
    default:
      return { title: 'Nothing here yet', body: '' };
  }
}

// ── Error states (DOC-23 validation codes) ──────────────────────────────────────
export type REErrorCode =
  | 'MISSING_DIET_MODE'
  | 'NO_DISH_CANDIDATES'
  | 'HARD_CONSTRAINT_BLOCK'
  | 'INVALID_TAXONOMY_VERSION'
  | 'GENERATION_FAILED'
  | 'OFFLINE'
  | 'UNKNOWN';

export interface ErrorContent extends StateContent { retryable: boolean; }

export function errorContent(code: REErrorCode): ErrorContent {
  switch (code) {
    case 'MISSING_DIET_MODE':
      return { title: 'One quick thing', body: 'Confirm your diet so we only suggest food you eat.', ctaLabel: 'Set diet', retryable: false };
    case 'NO_DISH_CANDIDATES':
      return { title: 'Options coming soon', body: 'This meal style is being filled out — we kept a safe choice for now.', retryable: false };
    case 'HARD_CONSTRAINT_BLOCK':
      return { title: 'Kept it safe', body: 'We’ve picked a simple meal that fits your rules.', retryable: false };
    case 'INVALID_TAXONOMY_VERSION':
      return { title: 'Refreshing your menu', body: 'Updating to the latest meals — one moment.', ctaLabel: 'Reload', retryable: true };
    case 'GENERATION_FAILED':
      return { title: 'Couldn’t load this', body: 'A quick retry usually does it.', ctaLabel: 'Retry', retryable: true };
    case 'OFFLINE':
      return { title: 'You’re offline', body: 'Showing your saved plan — changes will sync when you’re back.', retryable: true };
    default:
      return { title: 'Something went off', body: 'Please try again.', ctaLabel: 'Retry', retryable: true };
  }
}

// ── Accessibility label builder ─────────────────────────────────────────────────
/**
 * Build a screen-reader label that includes state, so meaning never relies on color alone.
 * e.g. buildA11yLabel('Lock lunch', { state: 'locked' }) → "Lock lunch, locked"
 */
export function buildA11yLabel(base: string, opts?: { state?: string; hint?: string }): string {
  const parts = [base.trim()];
  if (opts?.state) parts.push(opts.state.trim());
  if (opts?.hint) parts.push(opts.hint.trim());
  return parts.filter(Boolean).join(', ');
}

/** Return 0 when reduced-motion is on, else the requested duration (motion never carries meaning). */
export function reducedMotionDuration(reduceMotion: boolean, ms: number): number {
  return reduceMotion ? 0 : Math.max(0, ms);
}
