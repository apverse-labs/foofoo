/** re-weekly.test.ts — pure weekly helpers (UI-BUILD-06/07): friendly labels, swap tiers, insights. */
import {
  friendlyClassLabel, buildSwapTiers, isDishValidForTier, weeklyInsights,
} from '../../foofoo/src/utils/re-weekly';

describe('friendlyClassLabel', () => {
  it('strips slot prefix + title-cases; prefers stored display', () => {
    expect(friendlyClassLabel('LD_SIMPLE_GREEN_VEG_SABZI')).toBe('Simple Green Veg Sabzi');
    expect(friendlyClassLabel('BF_STUFFED_FLATBREAD', 'Stuffed paratha-style breakfast')).toBe('Stuffed paratha-style breakfast');
  });
});

describe('buildSwapTiers (class-first order)', () => {
  it('orders same → different(s) → broader and carries class codes', () => {
    const t = buildSwapTiers('LD_SIMPLE_GREEN_VEG_SABZI', 'LD_DAL_ROTI_SABZI', 'LD_RICE_PULAO_VEG');
    expect(t.map((x) => x.id)).toEqual(['same', 'different', 'different', 'broader']);
    expect(t[0].classCode).toBe('LD_SIMPLE_GREEN_VEG_SABZI');
    expect(t[t.length - 1].classCode).toBeNull();
  });
  it('dedupes and tolerates missing secondary/tertiary', () => {
    const t = buildSwapTiers('LD_X', 'LD_X', null);
    expect(t.map((x) => x.id)).toEqual(['same', 'broader']);
  });
});

describe('isDishValidForTier (no cross-class mismatch)', () => {
  const tiers = buildSwapTiers('LD_A', 'LD_B');
  it('same/different require exact class match', () => {
    expect(isDishValidForTier('LD_A', tiers[0])).toBe(true);
    expect(isDishValidForTier('LD_B', tiers[0])).toBe(false); // wrong class in same-style tier
    expect(isDishValidForTier('LD_B', tiers[1])).toBe(true);
  });
  it('broader accepts any diet-valid class', () => {
    const broader = tiers[tiers.length - 1];
    expect(isDishValidForTier('LD_ANYTHING', broader)).toBe(true);
  });
});

describe('weeklyInsights (DOC-14)', () => {
  it('counts light dinners and flags non-veg cadence', () => {
    const days = [
      { weekday_weekend: 'Weekday', dinner_class: 'DN_KHICHDI_SOUP' },
      { weekday_weekend: 'Weekday', dinner_class: 'DN_LIGHT_DAL_RICE' },
      { weekday_weekend: 'Weekend', lunch_class: 'LD_VEG_BIRYANI_SPECIAL', nonveg_scheduled_slot: 'Lunch:nonveg_state_prior' },
    ];
    const ins = weeklyInsights(days);
    expect(ins.some((s) => /light dinners/i.test(s))).toBe(true);
    expect(ins.some((s) => /weekend special/i.test(s))).toBe(true);
    expect(ins.length).toBeLessThanOrEqual(3);
  });
});
