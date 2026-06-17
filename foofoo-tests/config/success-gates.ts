/**
 * success-gates.ts
 *
 * Centralised PASS/FAIL thresholds for the RE QA suite. The persona runner and
 * report generator import GATES so that "what passing means" lives in exactly
 * one place. Mirrors CONTEXT.md "What passing means" + DOC-26 metric targets.
 *
 * Run: imported by personas/re-persona-runner.ts, reports/re-report-generator.ts
 */

export const GATES = {
  /** Hard constraint (diet/forbidden-diet) violations allowed across all personas. */
  HARD_CONSTRAINT_VIOLATIONS_MAX: 0,

  /** Minimum acceptance rate (positive signals / total) for a healthy engine. */
  ACCEPTANCE_RATE_MIN: 0.5,

  /** Minimum cultural / regional match score for a persona to pass. */
  CULTURAL_MATCH_MIN: 0.6,

  /** Minimum dishes returned per primary slot (cold-start safety). */
  MIN_DISHES_PER_SLOT: 1,

  /** Cross-user RLS leakage: a user must see exactly this many of another user's rows. */
  RLS_CROSS_USER_ROWS_MAX: 0,

  /** After DPDP deletion, this many rows may remain for the deleted user in RE tables. */
  DPDP_RESIDUAL_ROWS_MAX: 0,

  /** Cold-start dish score must fall within this inclusive band (RE_V1 formula). */
  COLD_START_SCORE_MIN: 0.8,
  COLD_START_SCORE_MAX: 1.4,

  /** All expected RE schema tables must be present (none missing). */
  SCHEMA_MISSING_TABLES_MAX: 0,

  /** Max repeated dishes allowed within a rolling 7-day window (variety guard). */
  MAX_REPEAT_DISHES_7_DAYS_DEFAULT: 3,
} as const;

export type GateKey = keyof typeof GATES;

/** Evaluate a persona-level result object against the gates; returns failures. */
export function evaluateGates(input: {
  hardConstraintViolations: number;
  dishCountPerSlot: number;
  culturalScore: number;
  regionArchetypeMatch: boolean;
}): string[] {
  const failures: string[] = [];
  if (input.hardConstraintViolations > GATES.HARD_CONSTRAINT_VIOLATIONS_MAX) {
    failures.push(
      `hard constraint violations ${input.hardConstraintViolations} > ${GATES.HARD_CONSTRAINT_VIOLATIONS_MAX}`,
    );
  }
  if (input.dishCountPerSlot < GATES.MIN_DISHES_PER_SLOT) {
    failures.push(
      `dishes/slot ${input.dishCountPerSlot} < ${GATES.MIN_DISHES_PER_SLOT}`,
    );
  }
  if (input.culturalScore < GATES.CULTURAL_MATCH_MIN) {
    failures.push(
      `cultural match ${input.culturalScore.toFixed(2)} < ${GATES.CULTURAL_MATCH_MIN}`,
    );
  }
  if (!input.regionArchetypeMatch) {
    failures.push('region archetype mismatch');
  }
  return failures;
}
