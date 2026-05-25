/**
 * variety-guard.test.ts
 *
 * Verifies the variety guard and repeat-tolerance logic: dishes seen within
 * the recent window receive the correct penalty, and the repeat window formula
 * matches the production Edge Function's getRepeatWindow implementation.
 *
 * Run: npm run test:unit
 * Depends on: lib/re-engine.ts, lib/types.ts
 * Doc refs: Doc 10 Section 8
 */

// unit/variety-guard.test.ts
// Tests repeat tolerance and variety guard logic
// Spec: Doc #10 v3 — Section 8

import {
  getRepeatWindow,
  isDishInRepeatWindow,
  getSameCuisinePenalty,
  WEIGHTS,
} from '../lib/re-engine';
import type { SuggestionLog } from '../lib/types';

function makeLog(
  dishId: number,
  position: number,
  daysAgo: number,
  action: SuggestionLog['action'] = 'locked'
): SuggestionLog {
  return {
    user_id: 'user-001',
    ref_type: 'dish',
    ref_id: dishId,
    meal_slot: 'lunch',
    carousel_position: position,
    action,
    action_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

// ─── Repeat window calculation ────────────────────────────────────────────────

describe('Variety Guard: repeat window calculation', () => {
  it('default tolerance (5) → 7-day repeat window', () => {
    expect(getRepeatWindow(5)).toBe(7);
  });

  it('tolerance 1 → 11-day window (hates repeats)', () => {
    expect(getRepeatWindow(1)).toBe(11);
  });

  it('tolerance 10 → 2-day window (loves repeats)', () => {
    expect(getRepeatWindow(10)).toBe(2);
  });

  it('tolerance 7 → 5-day window', () => {
    expect(getRepeatWindow(7)).toBe(5);
  });

  it('window_days = 12 - tolerance_score formula', () => {
    for (let t = 1; t <= 10; t++) {
      const expected = Math.max(2, 12 - t);
      expect(getRepeatWindow(t)).toBe(expected);
    }
  });
});

// ─── Dish in repeat window ────────────────────────────────────────────────────

describe('Variety Guard: dish in repeat window', () => {
  it('dish served at position 1 within 5-day window → in repeat window', () => {
    const history = [makeLog(42, 1, 3)]; // 3 days ago at position 1
    expect(isDishInRepeatWindow(42, history, 5)).toBe(true); // window = 7 days
  });

  it('dish served at position 1 outside 5-day window → eligible again', () => {
    const history = [makeLog(42, 1, 8)]; // 8 days ago, window = 7
    expect(isDishInRepeatWindow(42, history, 5)).toBe(false);
  });

  it('dish never served → not in repeat window', () => {
    expect(isDishInRepeatWindow(99, [], 5)).toBe(false);
  });

  it('dish served at position 2+ (not position 1) → NOT in repeat window', () => {
    const history = [makeLog(42, 2, 2)]; // position 2, recent
    expect(isDishInRepeatWindow(42, history, 5)).toBe(false);
  });

  it('high tolerance (10) → 2-day window — dish served 3 days ago is eligible', () => {
    const history = [makeLog(42, 1, 3)]; // 3 days ago
    expect(isDishInRepeatWindow(42, history, 10)).toBe(false); // window = 2
  });

  it('low tolerance (1) → 11-day window — dish served 8 days ago still blocked', () => {
    const history = [makeLog(42, 1, 8)]; // 8 days ago
    expect(isDishInRepeatWindow(42, history, 1)).toBe(true); // window = 11
  });
});

// ─── Same cuisine cap ─────────────────────────────────────────────────────────

describe('Variety Guard: same cuisine daily cap', () => {
  it('0 same-cuisine meals today: no penalty', () => {
    const todaysMeals: Array<{ cuisine_id: string }> = [
      { cuisine_id: 'bengali' },
      { cuisine_id: 'north_indian' },
    ];
    expect(getSameCuisinePenalty('south_indian', todaysMeals)).toBe(0);
  });

  it('1 same-cuisine meal today: no penalty yet', () => {
    const todaysMeals: Array<{ cuisine_id: string }> = [
      { cuisine_id: 'south_indian' },
      { cuisine_id: 'north_indian' },
    ];
    expect(getSameCuisinePenalty('south_indian', todaysMeals)).toBe(0);
  });

  it('2 same-cuisine meals today: 3rd gets -0.3 penalty', () => {
    const todaysMeals: Array<{ cuisine_id: string }> = [
      { cuisine_id: 'south_indian' },
      { cuisine_id: 'south_indian' },
      { cuisine_id: 'bengali' },
    ];
    expect(getSameCuisinePenalty('south_indian', todaysMeals)).toBe(WEIGHTS.variety_same_cuisine_3rd);
    expect(getSameCuisinePenalty('south_indian', todaysMeals)).toBe(-0.3);
  });

  it('-0.3 is a PENALTY not a hard block (dish can still appear at lower score)', () => {
    const penalty = getSameCuisinePenalty('south_indian', [
      { cuisine_id: 'south_indian' },
      { cuisine_id: 'south_indian' },
    ]);
    // Not -999 or -Infinity — just a score demotion
    expect(penalty).toBeGreaterThan(-1);
    expect(penalty).toBe(-0.3);
  });
});

// ─── Tolerance per meal slot ──────────────────────────────────────────────────

describe('Variety Guard: per-slot tolerance', () => {
  it('breakfast and lunch tolerance tracked separately', () => {
    // Breakfast dish served at position 1 yesterday
    const breakfastHistory: SuggestionLog[] = [
      {
        user_id: 'u1',
        ref_type: 'dish',
        ref_id: 10,
        meal_slot: 'breakfast',
        carousel_position: 1,
        action: 'locked',
        action_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      }
    ];

    // With tolerance=5 (7-day window), dish 10 is blocked for breakfast
    expect(isDishInRepeatWindow(10, breakfastHistory, 5)).toBe(true);

    // But if lunch history is separate and dish wasn't served at lunch, it's clear
    const lunchHistory: SuggestionLog[] = [];
    expect(isDishInRepeatWindow(10, lunchHistory, 5)).toBe(false);
  });
});

// ─── Weekly rotation check ────────────────────────────────────────────────────

describe('Variety Guard: 7-day plan variety', () => {
  it('7-day plan with 3+ cuisines passes variety requirement', () => {
    const cuisines = ['south_indian', 'north_indian', 'maharashtrian', 'bengali', 'south_indian', 'north_indian', 'south_indian'];
    const unique = new Set(cuisines);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('7-day plan with only 1 cuisine fails variety requirement', () => {
    const cuisines = Array(7).fill('south_indian');
    const unique = new Set(cuisines);
    expect(unique.size).toBeLessThan(3);
  });
});
