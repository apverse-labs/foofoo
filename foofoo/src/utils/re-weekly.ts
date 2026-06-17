/**
 * re-weekly.ts — pure helpers for the weekly plan (UI-BUILD-06/07).
 *
 * PURE (no RN/supabase) → unit-testable. Friendly class labels, class-first swap-tier ordering,
 * and DOC-14 variety insights. The swap ordering enforces: within-class → secondary/tertiary class →
 * broader, and NEVER mixes a dish into the wrong class.
 */

/** Strip slot prefix + title-case a raw meal_class_code into a friendly label (pure mirror of deriveMealClassDisplayName). */
export function friendlyClassLabel(code: string | null, display?: string | null): string {
  if (display) return display;
  if (!code) return '';
  return code.replace(/^(BF|LD|LN|SN|DN)_/i, '')
    .split('_').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export type SwapTierId = 'same' | 'different' | 'broader';
export interface SwapTier { id: SwapTierId; label: string; classCode: string | null; }

/**
 * @summary Build the class-first swap tiers for a slot.
 * @description Tier order: same-style (slot class) → different-style (secondary, then tertiary class)
 *   → broader (no specific class; caller fills from cohort pool). Each tier carries the class its
 *   dishes MUST come from; the UI cannot construct a cross-class pair.
 */
export function buildSwapTiers(slotClass: string, secondaryClass?: string | null, tertiaryClass?: string | null): SwapTier[] {
  const tiers: SwapTier[] = [{ id: 'same', label: 'Same style', classCode: slotClass }];
  const seen = new Set([slotClass]);
  for (const cls of [secondaryClass, tertiaryClass]) {
    if (cls && !seen.has(cls)) { tiers.push({ id: 'different', label: 'Try a different style', classCode: cls }); seen.add(cls); }
  }
  tiers.push({ id: 'broader', label: 'More options', classCode: null });
  return tiers;
}

/**
 * @summary Guard: a dish may only appear in a tier whose classCode it belongs to.
 * @returns true if the (dishClass, tier) pairing is valid (no cross-class mismatch).
 */
export function isDishValidForTier(dishClassCode: string, tier: SwapTier): boolean {
  if (tier.id === 'broader') return true;            // broader fills from diet-valid cohort classes
  return tier.classCode === dishClassCode;           // same/different must match exactly
}

export interface WeekDayLite {
  weekday_weekend: string;                 // 'Weekday' | 'Weekend'
  breakfast_class?: string | null; lunch_class?: string | null;
  snack_class?: string | null; dinner_class?: string | null;
  nonveg_scheduled_slot?: string | null;
}

/** DOC-14 lightweight weekly insights (derived, plain-language, max ~3). */
export function weeklyInsights(days: WeekDayLite[]): string[] {
  const out: string[] = [];
  const isLight = (c?: string | null) => !!c && /(KHICHDI|LIGHT|CURD|SOUP|DALIA)/i.test(c);
  const lightDinners = days.filter((d) => isLight(d.dinner_class)).length;
  if (lightDinners >= 2) out.push(`${lightDinners} light dinners this week`);
  const hasWeekendSpecial = days.some((d) => d.weekday_weekend === 'Weekend'
    && /(SPECIAL|FESTIVE|BIRYANI|INDULGEN|SUNDAY)/i.test(`${d.lunch_class ?? ''}${d.dinner_class ?? ''}`));
  if (hasWeekendSpecial) out.push('Weekend special planned');
  const nonvegDays = days.filter((d) => d.nonveg_scheduled_slot && d.nonveg_scheduled_slot !== 'none').length;
  if (nonvegDays > 0) out.push(`Non-veg planned ${nonvegDays}× this week, as your family likes`);
  return out.slice(0, 3);
}
