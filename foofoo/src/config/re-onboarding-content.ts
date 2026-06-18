/**
 * RE Onboarding UI Content
 *
 * SOURCE: Extracted from re_main_cohorts.subcohort_screen_copy,
 *         re_routing_rules.user_prompt_summary / why_it_matters,
 *         re_subcohorts.show_as_chip_text / ask_next
 *
 * These values were previously stored as DB columns on domain entity tables.
 * They have been moved here because:
 *   - UI copy has a different change lifecycle than domain data
 *   - Copy changes should not require DB migrations
 *   - Domain tables should store domain facts, not display strings
 *
 * The DB columns are NOT YET renamed/removed — see
 * Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/06_REPAIR_LOGS/UI_COPY_EXTRACTION_LOG.md
 * for why the SCHEMA-RE-020 rename is paused pending founder review
 * (live code references found in 4 files).
 *
 * Last synced from DB: 2026-06-19
 */

export const RE_MAIN_COHORT_SCREEN_COPY: Record<string, string> = {
  MC1: 'Show 5-6 sub-options: student/hostel, young professional, working woman alone, flatmates, migrant adult, desk/fitness adult',
  MC2: 'Show DINK, newly married, mixed-state, planning pregnancy, pregnant household, infant/baby household',
  MC3: 'Show toddler, school kid, teen, picky eater, family budget, homemaker elaborate',
  MC4: 'Show joint family, elderly couple, recovery light, elder+child, diabetic/BP member',
  MC5: 'Show health, gym/protein, vegetarian protein, Jain, fasting, skilled cook, cook-needs-instruction, maid-dependent, regular nonveg',
};

export const RE_ROUTING_RULE_COPY: Record<string, {
  promptSummary: string;
  whyItMatters: string;
}> = {
  R01: {
    promptSummary: 'Select one of 5: Just me, Couple, Family with children, Joint/elders, Special goal/kitchen mode',
    whyItMatters: 'Narrows to 5-16 sub options without showing 41 personas.',
  },
  R02: {
    promptSummary: 'Show only sub-cohorts under selected main cohort; e.g., Family with children -> toddler/school kid/teen/picky child/budget/homemaker.',
    whyItMatters: 'Maps to base persona_id.',
  },
  R03: {
    promptSummary: 'Ask "Do they need a separate soft/mild/extra component?" default yes.',
    whyItMatters: 'Creates add-on component plan, not main meal class.',
  },
  R04: {
    promptSummary: 'Ask "Is this for everyone or only one member?"',
    whyItMatters: 'If one member, use swap/add-on; if whole household, health classes can enter main rotation.',
  },
  R05: {
    promptSummary: 'Self-cook, skilled cook, cook needs instructions, maid/helper, tiffin/PG, delivery-heavy.',
    whyItMatters: 'Adjusts complexity, prep batching, instruction detail.',
  },
  R06: {
    promptSummary: 'Veg, egg, nonveg, Jain, vegan, allergies; for nonveg ask weekly frequency + proteins eaten.',
    whyItMatters: 'Sets hard constraints and weekly protein schedule.',
  },
  R07: {
    promptSummary: 'Where are you from and where do you live now?',
    whyItMatters: 'Blends home-state signature with current city lifestyle overlay.',
  },
  R08: {
    promptSummary: 'Swipe meal classes, not dishes: Simple sabzi, dal-rice, paratha, egg breakfast, fish curry rice, etc.',
    whyItMatters: 'Captures revealed class preference quickly.',
  },
};

export const RE_SUBCOHORT_CHIP_TEXT: Record<string, {
  chipLabel: string;
  askNext: string | null;
}> = {
  SC1A: { chipLabel: 'Solo student/hostel budget', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC1B: { chipLabel: 'Solo young professional', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC1C: { chipLabel: 'Working woman living alone', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC1D: { chipLabel: 'Flatmates shared kitchen', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC1E: { chipLabel: 'Migrant in metro preserving home-state food', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC1F: { chipLabel: 'Desk-job sedentary', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2A: { chipLabel: 'DINK couple no children', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2B: { chipLabel: 'Newly married mixed-state couple', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2C: { chipLabel: 'Couple planning pregnancy', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2D: { chipLabel: 'Pregnant woman', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2E: { chipLabel: 'Couple with infant 0-6 months', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2F: { chipLabel: 'Couple with baby 6-18 months', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC2G: { chipLabel: 'Inter-state couple / mixed cuisine', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3A: { chipLabel: 'Nuclear with toddler', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3B: { chipLabel: 'Nuclear with school kids', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3C: { chipLabel: 'Family with teenagers', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3D: { chipLabel: 'Child picky eater', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3E: { chipLabel: 'Budget/value-conscious', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC3F: { chipLabel: 'Home-maker elaborate cooking', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4A: { chipLabel: 'Joint/multi-generation', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4B: { chipLabel: 'Elderly couple', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4C: { chipLabel: 'Recovery/senior digestive light', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4D: { chipLabel: 'Diabetic / low-GI', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4E: { chipLabel: 'Hypertension / heart conscious', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC4F: { chipLabel: 'Composite: child + diabetic/elderly member', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5A: { chipLabel: 'Weight loss / calorie conscious', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5B: { chipLabel: 'Gym/high-protein nonveg or egg-friendly', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5C: { chipLabel: 'Vegetarian protein seeker', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5D: { chipLabel: 'Strict Jain', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5E: { chipLabel: 'Fasting/ritual observant', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5F: { chipLabel: 'Cook-assisted: skilled cook', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5G: { chipLabel: 'Cook-assisted: needs constant instruction', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5H: { chipLabel: 'Working woman managing cook + office', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5I: { chipLabel: 'Maid-dependent minimal cooking / batch cook', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5J: { chipLabel: 'Premium experimental foodie', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5K: { chipLabel: 'Regular non-veg', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5L: { chipLabel: 'Eggitarian / low-meat', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5M: { chipLabel: 'Seafood/coastal non-veg', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5N: { chipLabel: 'Mutton/Sunday special non-veg', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5O: { chipLabel: 'Vegetarian home, occasional outside non-veg', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
  SC5P: { chipLabel: 'Field-work heavy breakfast', askNext: 'Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable.' },
};
