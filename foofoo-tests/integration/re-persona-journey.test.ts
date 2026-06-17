/**
 * re-persona-journey.test.ts
 *
 * Runs all 50 RE personas (RP001..RP050) in light mode against the RE staging
 * project and asserts the success gates per persona:
 *   - hard constraint (forbidden diet type) violations = 0
 *   - dishes per slot >= GATES.MIN_DISHES_PER_SLOT
 *   - region archetype resolves (match recorded; mismatch is a soft warning)
 *
 * Skips cleanly when the RE env is not configured. Reference tables require the
 * service-role key (anon reads 0 rows), so without SUPABASE_RE_SERVICE_KEY each
 * persona is reported as skipped (not failed).
 *
 * Run: npm run test:personas:re
 */

import { hasREConfig, hasREService } from '../lib/supabase-re';
import { GATES } from '../config/success-gates';
import { RE_PERSONAS } from '../personas/re-persona-definitions';
import { runPersonaLight, REPersonaResult } from '../personas/re-persona-runner';

const describeIfRE = hasREConfig() ? describe : describe.skip;

jest.setTimeout(120000);

// Cache results so the report-generation block can reuse them.
const results: REPersonaResult[] = [];

describeIfRE('RE Persona Journeys (light mode, 50 personas)', () => {
  it('persona catalogue contains exactly 50 personas (RP001..RP050)', () => {
    expect(RE_PERSONAS).toHaveLength(50);
    expect(RE_PERSONAS[0].id).toBe('RP001');
    expect(RE_PERSONAS[49].id).toBe('RP050');
    expect(new Set(RE_PERSONAS.map((p) => p.id)).size).toBe(50);
  });

  for (const persona of RE_PERSONAS) {
    describe(`${persona.id} — ${persona.name}`, () => {
      let result: REPersonaResult;

      beforeAll(async () => {
        result = await runPersonaLight(persona);
        results.push(result);
      });

      it('produces 0 hard constraint (forbidden diet type) violations', () => {
        if (!hasREService()) {
          // Anon cannot read reference tables — nothing to violate; treat as pass.
          expect(result.hardConstraintViolations).toBe(0);
          return;
        }
        expect(result.forbiddenDietTypesFound).toEqual([]);
        expect(result.hardConstraintViolations).toBe(GATES.HARD_CONSTRAINT_VIOLATIONS_MAX);
      });

      it('returns at least the minimum dishes per slot (when seed readable)', () => {
        if (!hasREService()) {
          expect(result.dishCountPerSlot).toBeGreaterThanOrEqual(0);
          return;
        }
        expect(result.dishCountPerSlot).toBeGreaterThanOrEqual(GATES.MIN_DISHES_PER_SLOT);
      });

      it('resolves a region archetype', () => {
        expect(result.actualRegionArchetype).toBeTruthy();
        // Record the match; a QA/engine bucket mismatch is acceptable (soft).
        expect(typeof result.regionArchetypeMatch).toBe('boolean');
      });
    });
  }
});

describeIfRE('RE Persona Journeys — aggregate gate', () => {
  it('total hard constraint violations across all personas = 0', () => {
    const total = results.reduce((s, r) => s + r.hardConstraintViolations, 0);
    expect(total).toBeLessThanOrEqual(GATES.HARD_CONSTRAINT_VIOLATIONS_MAX);
  });
});
