/**
 * re-persona-definitions.ts
 *
 * 50 synthetic RE personas (RP001..RP050) used by the RE persona journey runner.
 * Each persona maps a home state (S01..S36), current city, food preference and
 * household composition to the regional/dietary expectations the RE must honour.
 *
 * Region archetypes used here are the QA-level buckets from the task spec
 * (SOUTH_RICE / NORTH_WHEAT / EAST_RICE / WEST_MIXED). They are intentionally
 * coarser than the engine's own STATE_REGION_ARCHETYPE map (re-region-constants);
 * the runner reconciles the two when scoring cultural match.
 *
 * Run: imported by personas/re-persona-runner.ts + integration/re-persona-journey.test.ts
 * DO NOT confuse with personas/persona-definitions.ts (the 50 MVP app personas).
 */

export type REFoodPref = 'veg' | 'non_veg' | 'egg' | 'jain' | 'vegan';

export type REMemberRole =
  | 'adult'
  | 'child'
  | 'infant'
  | 'toddler'
  | 'teen'
  | 'elderly';

export type REDietaryFlag =
  | 'diabetic'
  | 'hypertension'
  | 'pregnant'
  | 'postpartum'
  | 'recovery'
  | 'allergy'
  | 'fasting'
  | 'gym'
  | 'weight_loss'
  | 'lactating'
  | 'jain'
  | 'vegan';

export type REFeedbackScript =
  | 'eager'
  | 'picky'
  | 'random'
  | 'never_heavy'
  | 'lock_heavy';

export type RERegionArchetype =
  | 'SOUTH_RICE'
  | 'NORTH_WHEAT'
  | 'EAST_RICE'
  | 'WEST_MIXED';

export interface REPersonaMember {
  role: REMemberRole;
  dietaryFlag?: REDietaryFlag;
  ageGroup?: string;
}

export interface REPersonaExpectations {
  regionArchetype: RERegionArchetype;
  forbiddenDietTypes: string[];
  requiredAddonSegments: string[];
  minDishesPerSlot: number;
  maxRepeatDishesIn7Days: number;
  culturalNote: string;
}

export interface REPersona {
  id: string;
  name: string;
  homeStateId: string;
  currentCity: string;
  foodPref: REFoodPref;
  householdSize: number;
  members: REPersonaMember[];
  expects: REPersonaExpectations;
  feedbackScript: REFeedbackScript;
  tags: string[];
}

/** S01..S36 → human-readable state name (matches the task brief mapping). */
export const STATE_NAMES: Record<string, string> = {
  S01: 'Andhra Pradesh', S02: 'Assam', S03: 'Bihar', S04: 'Chhattisgarh',
  S05: 'Goa', S06: 'Gujarat', S07: 'Haryana', S08: 'Himachal Pradesh',
  S09: 'Jharkhand', S10: 'J&K/Ladakh', S11: 'Karnataka', S12: 'Kerala',
  S13: 'Madhya Pradesh', S14: 'Maharashtra', S15: 'Manipur', S16: 'Meghalaya',
  S17: 'Mizoram', S18: 'Nagaland', S19: 'Odisha', S20: 'Punjab',
  S21: 'Rajasthan', S22: 'Sikkim', S23: 'Tamil Nadu', S24: 'Telangana',
  S25: 'Tripura', S26: 'Uttar Pradesh', S27: 'Uttarakhand', S28: 'West Bengal',
  S29: 'Delhi', S30: 'Chandigarh', S31: 'Puducherry',
  S32: 'Andaman and Nicobar Islands', S33: 'Dadra and Nagar Haveli',
  S34: 'Daman and Diu', S35: 'Lakshadweep', S36: 'Other/Outside India',
};

/** QA-level region archetype by state (coarse 4-bucket grouping per task spec). */
export const QA_REGION_BY_STATE: Record<string, RERegionArchetype> = {
  // SOUTH_RICE
  S11: 'SOUTH_RICE', S12: 'SOUTH_RICE', S23: 'SOUTH_RICE', S01: 'SOUTH_RICE',
  S24: 'SOUTH_RICE', S05: 'SOUTH_RICE', S31: 'SOUTH_RICE', S35: 'SOUTH_RICE',
  S32: 'SOUTH_RICE',
  // NORTH_WHEAT
  S20: 'NORTH_WHEAT', S07: 'NORTH_WHEAT', S26: 'NORTH_WHEAT', S21: 'NORTH_WHEAT',
  S29: 'NORTH_WHEAT', S30: 'NORTH_WHEAT', S08: 'NORTH_WHEAT', S27: 'NORTH_WHEAT',
  S10: 'NORTH_WHEAT',
  // EAST_RICE
  S28: 'EAST_RICE', S19: 'EAST_RICE', S03: 'EAST_RICE', S09: 'EAST_RICE',
  S02: 'EAST_RICE', S15: 'EAST_RICE', S16: 'EAST_RICE', S17: 'EAST_RICE',
  S18: 'EAST_RICE', S22: 'EAST_RICE', S25: 'EAST_RICE',
  // WEST_MIXED
  S14: 'WEST_MIXED', S06: 'WEST_MIXED', S13: 'WEST_MIXED', S04: 'WEST_MIXED',
  S33: 'WEST_MIXED', S34: 'WEST_MIXED',
};

// Forbidden diet_type sets keyed by food preference (RE seed diet_type values:
// 'veg', 'nonveg', 'egg', 'mixed').
const FORBID: Record<REFoodPref, string[]> = {
  veg: ['nonveg', 'egg', 'mixed'],
  jain: ['nonveg', 'egg', 'mixed'],
  vegan: ['nonveg', 'egg', 'mixed'],
  egg: ['nonveg'],
  non_veg: [],
};

function expectations(
  region: RERegionArchetype,
  pref: REFoodPref,
  addonSegments: string[],
  culturalNote: string,
  minDishes = 1,
  maxRepeat = 3,
): REPersonaExpectations {
  return {
    regionArchetype: region,
    forbiddenDietTypes: FORBID[pref],
    requiredAddonSegments: addonSegments,
    minDishesPerSlot: minDishes,
    maxRepeatDishesIn7Days: maxRepeat,
    culturalNote,
  };
}

export const RE_PERSONAS: REPersona[] = [
  {
    id: 'RP001', name: 'South veg family', homeStateId: 'S12', currentCity: 'Bengaluru',
    foodPref: 'veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }, { role: 'child' }],
    expects: expectations('SOUTH_RICE', 'veg', ['kids'], 'Kerala veg family, rice-forward'),
    feedbackScript: 'eager', tags: ['south', 'veg', 'family', 'migrant'],
  },
  {
    id: 'RP002', name: 'South coastal non-veg', homeStateId: 'S01', currentCity: 'Hyderabad',
    foodPref: 'non_veg', householdSize: 5,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }, { role: 'elderly' }, { role: 'elderly' }],
    expects: expectations('SOUTH_RICE', 'non_veg', ['elderly'], 'AP coastal non-veg with elders'),
    feedbackScript: 'random', tags: ['south', 'non_veg', 'elderly'],
  },
  {
    id: 'RP003', name: 'North wheat couple', homeStateId: 'S20', currentCity: 'Amritsar',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', [], 'Punjabi couple, wheat-forward'),
    feedbackScript: 'eager', tags: ['north', 'non_veg', 'couple'],
  },
  {
    id: 'RP004', name: 'North veg with newborn', homeStateId: 'S21', currentCity: 'Jaipur',
    foodPref: 'veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'lactating' }, { role: 'infant' }],
    expects: expectations('NORTH_WHEAT', 'veg', ['lactating', 'infant'], 'Rajasthani veg, lactating mother'),
    feedbackScript: 'picky', tags: ['north', 'veg', 'infant', 'lactating'],
  },
  {
    id: 'RP005', name: 'Gujarati joint family', homeStateId: 'S06', currentCity: 'Ahmedabad',
    foodPref: 'veg', householdSize: 6,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }, { role: 'elderly' }, { role: 'elderly', dietaryFlag: 'diabetic' }],
    expects: expectations('WEST_MIXED', 'veg', ['elderly', 'diabetic'], 'Gujarati joint family, diabetic elder'),
    feedbackScript: 'random', tags: ['west', 'veg', 'joint', 'diabetic'],
  },
  {
    id: 'RP006', name: 'Bengal non-veg', homeStateId: 'S28', currentCity: 'Kolkata',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('EAST_RICE', 'non_veg', ['teen'], 'Bengali fish-rice household'),
    feedbackScript: 'eager', tags: ['east', 'non_veg', 'teen'],
  },
  {
    id: 'RP007', name: 'Jain strict', homeStateId: 'S06', currentCity: 'Mumbai',
    foodPref: 'jain', householdSize: 3,
    members: [{ role: 'adult', dietaryFlag: 'jain' }, { role: 'adult', dietaryFlag: 'jain' }, { role: 'toddler' }],
    expects: expectations('WEST_MIXED', 'jain', ['toddler'], 'Strict Jain, no root veg'),
    feedbackScript: 'picky', tags: ['west', 'jain', 'toddler', 'strict'],
  },
  {
    id: 'RP008', name: 'MP migrant in Mumbai', homeStateId: 'S13', currentCity: 'Mumbai',
    foodPref: 'veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }],
    expects: expectations('WEST_MIXED', 'veg', ['kids'], 'MP veg migrant, city overlay'),
    feedbackScript: 'random', tags: ['west', 'veg', 'migrant'],
  },
  {
    id: 'RP009', name: 'South IT professional', homeStateId: 'S23', currentCity: 'Bengaluru',
    foodPref: 'veg', householdSize: 1,
    members: [{ role: 'adult', dietaryFlag: 'gym' }],
    expects: expectations('SOUTH_RICE', 'veg', ['gym'], 'Tamil single, gym macros'),
    feedbackScript: 'eager', tags: ['south', 'veg', 'single', 'gym'],
  },
  {
    id: 'RP010', name: 'North non-veg migrant', homeStateId: 'S26', currentCity: 'Delhi',
    foodPref: 'non_veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['kids'], 'UP non-veg, picky child'),
    feedbackScript: 'picky', tags: ['north', 'non_veg', 'child'],
  },
  {
    id: 'RP011', name: 'Diabetic household', homeStateId: 'S11', currentCity: 'Mysuru',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'diabetic' }],
    expects: expectations('SOUTH_RICE', 'veg', ['diabetic'], 'Karnataka veg, low-GI focus'),
    feedbackScript: 'random', tags: ['south', 'veg', 'diabetic'],
  },
  {
    id: 'RP012', name: 'Pregnancy household', homeStateId: 'S14', currentCity: 'Pune',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'pregnant' }],
    expects: expectations('WEST_MIXED', 'non_veg', ['pregnant'], 'Maharashtrian, pregnancy nutrition'),
    feedbackScript: 'picky', tags: ['west', 'non_veg', 'pregnant'],
  },
  {
    id: 'RP013', name: 'Postpartum', homeStateId: 'S12', currentCity: 'Kochi',
    foodPref: 'veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'postpartum' }, { role: 'infant' }],
    expects: expectations('SOUTH_RICE', 'veg', ['postpartum', 'infant'], 'Kerala postpartum recovery diet'),
    feedbackScript: 'picky', tags: ['south', 'veg', 'postpartum', 'infant'],
  },
  {
    id: 'RP014', name: 'Elderly-primary', homeStateId: 'S21', currentCity: 'Udaipur',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'elderly' }, { role: 'elderly' }],
    expects: expectations('NORTH_WHEAT', 'veg', ['elderly'], 'Rajasthani elder couple, soft foods'),
    feedbackScript: 'random', tags: ['north', 'veg', 'elderly'],
  },
  {
    id: 'RP015', name: 'Hypertension', homeStateId: 'S20', currentCity: 'Ludhiana',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult', dietaryFlag: 'hypertension' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['hypertension'], 'Punjabi, low-sodium for HTN'),
    feedbackScript: 'picky', tags: ['north', 'non_veg', 'hypertension'],
  },
  {
    id: 'RP016', name: 'Fasting', homeStateId: 'S06', currentCity: 'Surat',
    foodPref: 'veg', householdSize: 4,
    members: [{ role: 'adult', dietaryFlag: 'fasting' }, { role: 'adult' }, { role: 'teen' }, { role: 'elderly' }],
    expects: expectations('WEST_MIXED', 'veg', ['fasting'], 'Gujarati vrat / farali days'),
    feedbackScript: 'random', tags: ['west', 'veg', 'fasting'],
  },
  {
    id: 'RP017', name: 'Recovery', homeStateId: 'S23', currentCity: 'Coimbatore',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'recovery' }],
    expects: expectations('SOUTH_RICE', 'veg', ['recovery'], 'Tamil veg, post-illness light food'),
    feedbackScript: 'picky', tags: ['south', 'veg', 'recovery'],
  },
  {
    id: 'RP018', name: 'Allergy', homeStateId: 'S14', currentCity: 'Nagpur',
    foodPref: 'non_veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child', dietaryFlag: 'allergy' }],
    expects: expectations('WEST_MIXED', 'non_veg', ['allergy', 'kids'], 'Maharashtrian, child nut allergy'),
    feedbackScript: 'random', tags: ['west', 'non_veg', 'allergy', 'child'],
  },
  {
    id: 'RP019', name: 'Weight-loss', homeStateId: 'S29', currentCity: 'Delhi',
    foodPref: 'non_veg', householdSize: 1,
    members: [{ role: 'adult', dietaryFlag: 'weight_loss' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['weight_loss'], 'Delhi single, calorie deficit'),
    feedbackScript: 'eager', tags: ['north', 'non_veg', 'single', 'weight_loss'],
  },
  {
    id: 'RP020', name: 'Northeast India', homeStateId: 'S02', currentCity: 'Guwahati',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('EAST_RICE', 'non_veg', ['kids'], 'Assamese rice + fish/meat'),
    feedbackScript: 'random', tags: ['east', 'northeast', 'non_veg'],
  },
  {
    id: 'RP021', name: 'Odia coastal', homeStateId: 'S19', currentCity: 'Bhubaneswar',
    foodPref: 'non_veg', householdSize: 5,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }, { role: 'elderly' }, { role: 'elderly' }],
    expects: expectations('EAST_RICE', 'non_veg', ['elderly'], 'Odia coastal, rice + seafood'),
    feedbackScript: 'random', tags: ['east', 'non_veg', 'elderly'],
  },
  {
    id: 'RP022', name: 'Himachali', homeStateId: 'S08', currentCity: 'Shimla',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['kids'], 'Himachali hills, hearty wheat'),
    feedbackScript: 'eager', tags: ['north', 'himalayan', 'non_veg'],
  },
  {
    id: 'RP023', name: 'UP migrant in Bengaluru', homeStateId: 'S26', currentCity: 'Bengaluru',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('NORTH_WHEAT', 'veg', [], 'UP veg couple, southern city overlay'),
    feedbackScript: 'random', tags: ['north', 'veg', 'migrant'],
  },
  {
    id: 'RP024', name: 'Tamil family in Mumbai', homeStateId: 'S23', currentCity: 'Mumbai',
    foodPref: 'veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'child' }, { role: 'child' }],
    expects: expectations('SOUTH_RICE', 'veg', ['kids'], 'Tamil veg, migrant in Mumbai'),
    feedbackScript: 'eager', tags: ['south', 'veg', 'migrant', 'family'],
  },
  {
    id: 'RP025', name: 'Kerala family in Delhi', homeStateId: 'S12', currentCity: 'Delhi',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Malayali non-veg, northern city'),
    feedbackScript: 'random', tags: ['south', 'non_veg', 'migrant'],
  },
  {
    id: 'RP026', name: 'Pure vegan', homeStateId: 'S14', currentCity: 'Pune',
    foodPref: 'vegan', householdSize: 2,
    members: [{ role: 'adult', dietaryFlag: 'vegan' }, { role: 'adult', dietaryFlag: 'vegan' }],
    expects: expectations('WEST_MIXED', 'vegan', ['vegan'], 'Pune vegan couple, no dairy'),
    feedbackScript: 'eager', tags: ['west', 'vegan', 'couple'],
  },
  {
    id: 'RP027', name: 'Egg-only ovo-veg', homeStateId: 'S28', currentCity: 'Kolkata',
    foodPref: 'egg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('EAST_RICE', 'egg', ['kids'], 'Bengali ovo-veg, eggs ok'),
    feedbackScript: 'random', tags: ['east', 'egg', 'family'],
  },
  {
    id: 'RP028', name: 'DINK', homeStateId: 'S11', currentCity: 'Bengaluru',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Bengaluru dual-income couple'),
    feedbackScript: 'eager', tags: ['south', 'non_veg', 'couple', 'dink'],
  },
  {
    id: 'RP029', name: 'Large joint family', homeStateId: 'S21', currentCity: 'Jodhpur',
    foodPref: 'veg', householdSize: 8,
    members: [
      { role: 'adult' }, { role: 'adult' }, { role: 'adult', dietaryFlag: 'pregnant' },
      { role: 'adult' }, { role: 'teen' }, { role: 'toddler' },
      { role: 'elderly' }, { role: 'elderly' },
    ],
    expects: expectations('NORTH_WHEAT', 'veg', ['pregnant', 'elderly', 'toddler'], 'Rajasthani 8-member joint family', 1, 4),
    feedbackScript: 'picky', tags: ['north', 'veg', 'joint', 'large'],
  },
  {
    id: 'RP030', name: 'Teen-heavy', homeStateId: 'S20', currentCity: 'Jalandhar',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'teen' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['teen'], 'Punjabi family, two hungry teens'),
    feedbackScript: 'eager', tags: ['north', 'non_veg', 'teen'],
  },
  {
    id: 'RP031', name: 'Baby-primary', homeStateId: 'S26', currentCity: 'Lucknow',
    foodPref: 'veg', householdSize: 3,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'infant' }],
    expects: expectations('NORTH_WHEAT', 'veg', ['infant'], 'UP veg, infant weaning foods'),
    feedbackScript: 'picky', tags: ['north', 'veg', 'infant'],
  },
  {
    id: 'RP032', name: 'South veg diabetic', homeStateId: 'S23', currentCity: 'Madurai',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult', dietaryFlag: 'diabetic' }],
    expects: expectations('SOUTH_RICE', 'veg', ['diabetic'], 'Tamil veg, diabetic-friendly rice swaps'),
    feedbackScript: 'picky', tags: ['south', 'veg', 'diabetic'],
  },
  {
    id: 'RP033', name: 'Bihar rural', homeStateId: 'S03', currentCity: 'Patna',
    foodPref: 'non_veg', householdSize: 6,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }, { role: 'child' }, { role: 'elderly' }],
    expects: expectations('EAST_RICE', 'non_veg', ['kids', 'elderly'], 'Bihari rural, litti + rice'),
    feedbackScript: 'random', tags: ['east', 'non_veg', 'rural', 'large'],
  },
  {
    id: 'RP034', name: 'Jharkhand', homeStateId: 'S09', currentCity: 'Ranchi',
    foodPref: 'non_veg', householdSize: 5,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }, { role: 'elderly' }],
    expects: expectations('EAST_RICE', 'non_veg', ['elderly'], 'Jharkhand rice + meat'),
    feedbackScript: 'random', tags: ['east', 'non_veg', 'elderly'],
  },
  {
    id: 'RP035', name: 'Goa coastal', homeStateId: 'S05', currentCity: 'Panaji',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Goan coastal, fish curry rice'),
    feedbackScript: 'eager', tags: ['south', 'coastal', 'non_veg', 'couple'],
  },
  {
    id: 'RP036', name: 'Konkan Marathi', homeStateId: 'S14', currentCity: 'Ratnagiri',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('WEST_MIXED', 'non_veg', ['kids'], 'Konkani Marathi coastal'),
    feedbackScript: 'random', tags: ['west', 'coastal', 'non_veg'],
  },
  {
    id: 'RP037', name: 'Kashmiri', homeStateId: 'S10', currentCity: 'Srinagar',
    foodPref: 'non_veg', householdSize: 5,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }, { role: 'elderly' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', ['elderly'], 'Kashmiri Wazwan-leaning, meat-heavy'),
    feedbackScript: 'picky', tags: ['north', 'himalayan', 'non_veg', 'elderly'],
  },
  {
    id: 'RP038', name: 'Punjabi veg', homeStateId: 'S20', currentCity: 'Patiala',
    foodPref: 'veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('NORTH_WHEAT', 'veg', [], 'Punjabi veg couple, dairy-rich'),
    feedbackScript: 'eager', tags: ['north', 'veg', 'couple'],
  },
  {
    id: 'RP039', name: 'Andhra spicy', homeStateId: 'S01', currentCity: 'Vijayawada',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('SOUTH_RICE', 'non_veg', ['teen'], 'Andhra spicy, high chilli'),
    feedbackScript: 'eager', tags: ['south', 'non_veg', 'spicy', 'teen'],
  },
  {
    id: 'RP040', name: 'Chennai IT', homeStateId: 'S23', currentCity: 'Chennai',
    foodPref: 'veg', householdSize: 1,
    members: [{ role: 'adult', dietaryFlag: 'gym' }],
    expects: expectations('SOUTH_RICE', 'veg', ['gym'], 'Chennai single, gym + tiffin'),
    feedbackScript: 'eager', tags: ['south', 'veg', 'single', 'gym'],
  },
  {
    id: 'RP041', name: 'Bengaluru startup', homeStateId: 'S11', currentCity: 'Bengaluru',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Bengaluru startup couple, quick meals'),
    feedbackScript: 'eager', tags: ['south', 'non_veg', 'couple'],
  },
  {
    id: 'RP042', name: 'Hyderabad biryani', homeStateId: 'S24', currentCity: 'Hyderabad',
    foodPref: 'non_veg', householdSize: 4,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }],
    expects: expectations('SOUTH_RICE', 'non_veg', ['kids'], 'Hyderabadi, biryani culture'),
    feedbackScript: 'eager', tags: ['south', 'non_veg', 'biryani'],
  },
  {
    id: 'RP043', name: 'Jain + diabetic', homeStateId: 'S06', currentCity: 'Rajkot',
    foodPref: 'jain', householdSize: 2,
    members: [{ role: 'adult', dietaryFlag: 'jain' }, { role: 'adult', dietaryFlag: 'diabetic' }],
    expects: expectations('WEST_MIXED', 'jain', ['diabetic'], 'Jain + diabetic dual constraint'),
    feedbackScript: 'picky', tags: ['west', 'jain', 'diabetic'],
  },
  {
    id: 'RP044', name: 'Never-list stress test', homeStateId: 'S14', currentCity: 'Mumbai',
    foodPref: 'veg', householdSize: 1,
    members: [{ role: 'adult' }],
    expects: expectations('WEST_MIXED', 'veg', [], 'Heavy NEVER usage — exclusion stress test'),
    feedbackScript: 'never_heavy', tags: ['west', 'veg', 'single', 'stress'],
  },
  {
    id: 'RP045', name: 'Zero feedback cold-start', homeStateId: 'S26', currentCity: 'Kanpur',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', [], 'No feedback — pure cold-start ranking'),
    feedbackScript: 'random', tags: ['north', 'non_veg', 'cold_start'],
  },
  {
    id: 'RP046', name: 'Max signals power user', homeStateId: 'S11', currentCity: 'Bengaluru',
    foodPref: 'non_veg', householdSize: 1,
    members: [{ role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Heavy LOCK usage — affinity saturation'),
    feedbackScript: 'lock_heavy', tags: ['south', 'non_veg', 'single', 'power_user'],
  },
  {
    id: 'RP047', name: 'Inconsistent signals', homeStateId: 'S20', currentCity: 'Delhi',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('NORTH_WHEAT', 'non_veg', [], 'Punjabi migrant, contradictory feedback'),
    feedbackScript: 'random', tags: ['north', 'non_veg', 'migrant', 'noisy'],
  },
  {
    id: 'RP048', name: 'Multilingual cook', homeStateId: 'S23', currentCity: 'Mumbai',
    foodPref: 'veg', householdSize: 5,
    members: [{ role: 'adult' }, { role: 'adult' }, { role: 'teen' }, { role: 'child' }, { role: 'elderly' }],
    expects: expectations('SOUTH_RICE', 'veg', ['elderly', 'kids'], 'Tamil joint family with hired cook'),
    feedbackScript: 'picky', tags: ['south', 'veg', 'joint', 'cook'],
  },
  {
    id: 'RP049', name: 'South non-veg migrant', homeStateId: 'S12', currentCity: 'Delhi',
    foodPref: 'non_veg', householdSize: 2,
    members: [{ role: 'adult' }, { role: 'adult' }],
    expects: expectations('SOUTH_RICE', 'non_veg', [], 'Kerala non-veg couple in Delhi'),
    feedbackScript: 'random', tags: ['south', 'non_veg', 'migrant'],
  },
  {
    id: 'RP050', name: 'All segments', homeStateId: 'S21', currentCity: 'Mumbai',
    foodPref: 'veg', householdSize: 7,
    members: [
      { role: 'adult' }, { role: 'adult', dietaryFlag: 'diabetic' },
      { role: 'teen' }, { role: 'child' }, { role: 'toddler' },
      { role: 'infant' }, { role: 'elderly' },
    ],
    expects: expectations('NORTH_WHEAT', 'veg', ['diabetic', 'infant', 'toddler', 'elderly', 'kids'], 'All member segments present', 1, 4),
    feedbackScript: 'picky', tags: ['north', 'veg', 'all_segments', 'large'],
  },
];

/** Sanity: there must be exactly 50 personas. */
export const RE_PERSONA_COUNT = RE_PERSONAS.length;
