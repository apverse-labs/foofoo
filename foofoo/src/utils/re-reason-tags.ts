/**
 * re-reason-tags.ts — pure "why this?" copy mapping (UI-BUILD-04/05).
 *
 * Maps DOC-19 §8 scoring signals to short, trust-building copy. PURE (no RN) → testable.
 * Food-DNA is intentionally omitted (no per-dish DNA in v3 — see DECISIONS_AND_TODO P1).
 */
export type ReasonSignal =
  | 'home_state' | 'current_city' | 'weekday' | 'weekend' | 'cook'
  | 'member' | 'class_affinity' | 'weather' | 'history' | 'none';

const COPY: Record<ReasonSignal, string> = {
  home_state: 'A taste of home',
  current_city: 'Easy for a city weekday',
  weekday: 'Quick for a busy day',
  weekend: 'Weekend family special',
  cook: 'Simple to make today',
  member: 'Includes something for your family',
  class_affinity: 'One of your regulars',
  weather: 'Comforting for today’s weather',
  history: 'Because you keep coming back to it',
  none: 'Chef pick for today',
};

/** Friendly label for a single signal. Falls back to a safe "chef pick". */
export function reasonCopy(signal: ReasonSignal): string {
  return COPY[signal] ?? COPY.none;
}

/**
 * @summary Build the reason chip text: one headline + optional supporting.
 * @description Composes e.g. "A taste of home · One of your regulars". Caps at 2 to stay short.
 */
export function buildReasonText(top: ReasonSignal, supporting: ReasonSignal[] = []): string {
  const parts = [reasonCopy(top), ...supporting.slice(0, 1).map(reasonCopy)];
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ');
}

/** Honest confidence label (never a raw number to users). */
export function confidenceLabel(confidence: number): 'high' | 'medium' | 'learning' {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'learning';
}

export function confidenceCopy(confidence: number): string {
  switch (confidenceLabel(confidence)) {
    case 'high': return 'We’ve got a great read on your home';
    case 'medium': return 'Getting to know your taste';
    default: return 'Smart guesses — your swipes will sharpen this';
  }
}
