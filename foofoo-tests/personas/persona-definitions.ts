/**
 * persona-definitions.ts
 *
 * Defines 50 synthetic user personas used by persona-runner.ts to validate
 * Recommendation Engine output. Personas span all diet types (veg/non-veg/egg/
 * vegan/jain), Indian regions, household types, allergy combinations, never-list
 * densities, and RE maturity stages (cold_start/two_week/three_month).
 *
 * Run: (imported by personas/persona-runner.ts — not run directly)
 * Depends on: (no dependencies)
 * Doc refs: Doc 10 Section 3 (User Segments), Doc 11A Section 2 (profiles schema)
 *
 * DO NOT MODIFY individual persona values — changes invalidate historical test runs.
 */

// FooFoo Test Personas — persona-definitions.ts
// 50 personas spanning all diet types, regions, constraints, household types, RE maturity stages
// Used by persona-runner.ts to seed test users and validate RE output
// DO NOT MODIFY — generated as part of FooFoo test project setup

export type DietType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type HouseholdType = 'solo' | 'couple' | 'family_with_kids' | 'flatmates';
export type REMaturity = 'cold_start' | 'two_week' | 'three_month';
export type NeverListDensity = 'light' | 'moderate' | 'heavy';
export type BucketValue = 'frequently' | 'occasionally' | 'never';

export interface PersonaBuckets {
  cuisine: Record<string, BucketValue>;
  breakfast: Record<string, BucketValue>;
  lunch_dinner: Record<string, BucketValue>;
}

export interface PersonaAllergens {
  ingredient_names: string[];   // human-readable, runner resolves to IDs
}

export interface PersonaExclusions {
  ingredient_names: string[];   // non-allergen exclusions (e.g. mushrooms)
}

export interface FooFooPersona {
  id: string;                   // e.g. "P001"
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  home_state: string;           // Indian state code
  current_city: string;
  diet_type: DietType;
  household_type: HouseholdType;
  role: 'cook' | 'instruct';
  allergens: PersonaAllergens;
  exclusions: PersonaExclusions;
  buckets: PersonaBuckets;
  re_maturity: REMaturity;
  never_list_density: NeverListDensity;
  // Validation expectations — what the RE MUST produce for this persona
  expectations: {
    must_never_contain: string[];     // ingredient names that must NEVER appear
    top3_cuisine_match: string[];     // at least 1 of these must appear in top 3 daily
    cultural_note: string;            // human-readable check description
    special_checks: string[];         // additional validations unique to this persona
  };
}

export const PERSONAS: FooFooPersona[] = [

  // ─── BLOCK 1: VEG PERSONAS (15) ────────────────────────────────────────────

  {
    id: 'P001',
    name: 'Riya Sharma',
    age: 28, gender: 'female',
    home_state: 'MH', current_city: 'Mumbai',
    diet_type: 'veg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        maharashtrian: 'frequently', south_indian: 'frequently',
        north_indian: 'occasionally', gujarati: 'occasionally',
        indo_chinese: 'occasionally', street_food: 'frequently',
        bengali: 'never', rajasthani: 'occasionally'
      },
      breakfast: {
        poha: 'frequently', upma: 'frequently', idli: 'occasionally',
        paratha: 'occasionally', dosa: 'occasionally',
        bread_butter: 'never', cornflakes: 'never'
      },
      lunch_dinner: {
        dal_rice: 'frequently', sabzi_roti: 'frequently',
        pulao: 'occasionally', rajma_chawal: 'occasionally',
        biryani_veg: 'occasionally', chole_bhature: 'never'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['maharashtrian', 'south_indian', 'street_food'],
      cultural_note: 'Mumbai professional — Maharashtrian + South Indian dishes should dominate top suggestions',
      special_checks: [
        'Poha should appear in breakfast carousel position 1 or 2',
        'No Chole Bhature in lunch/dinner (Never bucket)',
        'Street food like Pav Bhaji valid for dinner slot'
      ]
    }
  },

  {
    id: 'P002',
    name: 'Meera Iyer',
    age: 35, gender: 'female',
    home_state: 'TN', current_city: 'Chennai',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: ['peanut'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', tamil_brahmin: 'frequently',
        north_indian: 'occasionally', maharashtrian: 'never',
        indo_chinese: 'occasionally', street_food: 'occasionally'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', pongal: 'frequently',
        upma: 'occasionally', poha: 'never', paratha: 'never'
      },
      lunch_dinner: {
        sambar_rice: 'frequently', rasam_rice: 'frequently',
        curd_rice: 'frequently', kootu: 'occasionally',
        chapati_sabzi: 'occasionally', biryani_veg: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'light',
    expectations: {
      must_never_contain: ['peanuts', 'groundnut', 'mungfali'],
      top3_cuisine_match: ['south_indian', 'tamil_brahmin'],
      cultural_note: 'Tamil Brahmin family in Chennai — rice-based meals expected, strict peanut exclusion is safety-critical',
      special_checks: [
        'CRITICAL: Zero peanut/groundnut-containing dishes across all 7 days',
        'Curd rice should appear as a valid dinner option',
        'Idli or Pongal should dominate breakfast slot',
        'Family with kids: dishes should not all be spice level 3-4'
      ]
    }
  },

  {
    id: 'P003',
    name: 'Anjali Gupta',
    age: 42, gender: 'female',
    home_state: 'UP', current_city: 'Lucknow',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['mushrooms'] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', awadhi: 'frequently',
        south_indian: 'occasionally', gujarati: 'occasionally',
        indo_chinese: 'occasionally', street_food: 'frequently'
      },
      breakfast: {
        paratha: 'frequently', poori_sabzi: 'occasionally',
        dalia: 'occasionally', idli: 'never', dosa: 'never',
        upma: 'never'
      },
      lunch_dinner: {
        dal_chawal: 'frequently', sabzi_roti: 'frequently',
        pulao: 'occasionally', paneer_dish: 'frequently',
        chole: 'occasionally', rajma: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['mushrooms', 'khumb'],
      top3_cuisine_match: ['north_indian', 'awadhi'],
      cultural_note: 'Lucknow homemaker — UP-style food, Awadhi dishes, no South Indian at breakfast',
      special_checks: [
        'Zero mushroom dishes across all suggestions',
        'Paratha should be in breakfast Frequently bucket — expect top 2',
        'Idli/Dosa/Upma in Never bucket — must not appear in breakfast',
        'Paneer dishes should appear 2-3 times across 7 lunch/dinners'
      ]
    }
  },

  {
    id: 'P004',
    name: 'Priya Nair',
    age: 30, gender: 'female',
    home_state: 'KL', current_city: 'Kochi',
    diet_type: 'veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: ['dairy'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        kerala: 'frequently', south_indian: 'frequently',
        north_indian: 'occasionally', continental: 'occasionally',
        indo_chinese: 'never', street_food: 'occasionally'
      },
      breakfast: {
        appam: 'frequently', puttu: 'frequently', idiyappam: 'frequently',
        dosa: 'occasionally', idli: 'occasionally',
        poha: 'never', paratha: 'never'
      },
      lunch_dinner: {
        kerala_sadya: 'frequently', avial: 'frequently',
        sambar_rice: 'occasionally', dal_rice: 'occasionally',
        chapati_sabzi: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['milk', 'cream', 'paneer', 'ghee', 'butter', 'curd', 'cheese', 'khoya'],
      top3_cuisine_match: ['kerala', 'south_indian'],
      cultural_note: 'Kerala couple, dairy allergy — coconut milk dishes valid, all dairy strictly excluded',
      special_checks: [
        'CRITICAL: Zero dairy ingredients across all suggestions',
        'Paneer dishes must never appear (contains dairy)',
        'Ghee-based dishes must never appear',
        'Coconut milk dishes ARE valid (not dairy)',
        'Appam or Puttu expected in breakfast top 2'
      ]
    }
  },

  {
    id: 'P005',
    name: 'Kavita Patel',
    age: 22, gender: 'female',
    home_state: 'GJ', current_city: 'Ahmedabad',
    diet_type: 'veg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        gujarati: 'frequently', north_indian: 'frequently',
        south_indian: 'occasionally', maharashtrian: 'occasionally',
        indo_chinese: 'frequently', street_food: 'frequently',
        rajasthani: 'occasionally'
      },
      breakfast: {
        thepla: 'frequently', dhokla: 'frequently', poha: 'frequently',
        fafda_jalebi: 'occasionally', paratha: 'occasionally',
        idli: 'occasionally'
      },
      lunch_dinner: {
        dal_baati_churma: 'occasionally', khichdi: 'frequently',
        undhiyu: 'occasionally', sabzi_roti: 'frequently',
        chinese_veg: 'frequently', chole_bhature: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['gujarati', 'indo_chinese', 'street_food'],
      cultural_note: 'Ahmedabad student with flatmates — Gujarati base but open to Indo-Chinese, sweet-spice balance expected',
      special_checks: [
        'Thepla or Dhokla should appear in first 3 breakfast suggestions',
        'Indo-Chinese appears in dinner slot at least once across 7 days',
        'Gujarati dishes tend toward mild/sweet — spice level 1-2 should dominate'
      ]
    }
  },

  {
    id: 'P006',
    name: 'Sunita Reddy',
    age: 50, gender: 'female',
    home_state: 'AP', current_city: 'Hyderabad',
    diet_type: 'veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: ['gluten'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        andhra: 'frequently', telangana: 'frequently',
        south_indian: 'frequently', north_indian: 'never',
        gujarati: 'never', indo_chinese: 'never'
      },
      breakfast: {
        idli: 'frequently', pesarattu: 'frequently', upma: 'frequently',
        poha: 'never', paratha: 'never', bread_butter: 'never'
      },
      lunch_dinner: {
        pappu_annam: 'frequently', rasam_rice: 'frequently',
        sambar_rice: 'frequently', pulihora: 'occasionally',
        chapati: 'never'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['wheat', 'maida', 'atta', 'sooji', 'semolina', 'barley', 'rye'],
      top3_cuisine_match: ['andhra', 'telangana', 'south_indian'],
      cultural_note: 'Hyderabad couple, gluten allergy — rice-based Andhra food, zero wheat, paratha/chapati excluded',
      special_checks: [
        'CRITICAL: Zero gluten-containing dishes across all 7 days',
        'Chapati/roti/paratha must never appear (all contain wheat)',
        'Pesarattu valid (moong dal, gluten-free)',
        'All north Indian cuisine in Never bucket — must not appear',
        'Mature user (3 months): RE should show variety across Andhra sub-cuisines'
      ]
    }
  },

  {
    id: 'P007',
    name: 'Deepa Krishnamurthy',
    age: 38, gender: 'female',
    home_state: 'KA', current_city: 'Bangalore',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['onion', 'garlic'] },
    buckets: {
      cuisine: {
        karnataka: 'frequently', south_indian: 'frequently',
        north_indian: 'occasionally', udupi: 'frequently',
        indo_chinese: 'never', street_food: 'occasionally'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', rava_idli: 'frequently',
        akki_roti: 'occasionally', poori: 'occasionally',
        poha: 'occasionally', paratha: 'never'
      },
      lunch_dinner: {
        sambar_rice: 'frequently', rasam_rice: 'frequently',
        bisi_bele_bath: 'frequently', vangi_bath: 'occasionally',
        curd_rice: 'occasionally', chapati_palya: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['onion', 'pyaz', 'kanda', 'garlic', 'lahsun'],
      top3_cuisine_match: ['karnataka', 'south_indian', 'udupi'],
      cultural_note: 'Bangalore family who avoids onion/garlic (near-Jain exclusion but not flagged as Jain diet)',
      special_checks: [
        'CRITICAL: Zero onion or garlic across all suggestions',
        'Auto-derived dietary tags must correctly flag this via exclusions, not diet_type',
        'Bisi Bele Bath valid if made without onion — verify ingredient check passes',
        'Chinese/Indo-Chinese in Never bucket — must not appear'
      ]
    }
  },

  {
    id: 'P008',
    name: 'Rekha Nambiar',
    age: 45, gender: 'female',
    home_state: 'KL', current_city: 'Thrissur',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: ['peanut', 'cashew', 'almond', 'walnut', 'pistachio'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        kerala: 'frequently', south_indian: 'frequently',
        north_indian: 'occasionally', continental: 'never',
        indo_chinese: 'never'
      },
      breakfast: {
        puttu: 'frequently', appam: 'frequently', idiyappam: 'frequently',
        dosa: 'occasionally', idli: 'occasionally'
      },
      lunch_dinner: {
        kerala_sadya: 'frequently', avial: 'frequently',
        olan: 'occasionally', thoran: 'frequently',
        sambar_rice: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['cashew', 'kaju', 'peanut', 'almond', 'badam', 'walnut', 'pistachio', 'coconut_cream_with_nuts'],
      top3_cuisine_match: ['kerala', 'south_indian'],
      cultural_note: 'Thrissur Kerala family, tree nut allergy — many Kerala dishes use cashew, strict exclusion needed',
      special_checks: [
        'CRITICAL: Zero nut-containing dishes',
        'Many Kerala curries use cashew paste — verify auto-derivation flags these',
        'Coconut itself is NOT a tree nut — coconut dishes are valid',
        'Kerala Sadya dishes valid if nut-free versions exist in DB'
      ]
    }
  },

  {
    id: 'P009',
    name: 'Nandita Sen',
    age: 33, gender: 'female',
    home_state: 'WB', current_city: 'Kolkata',
    diet_type: 'veg', household_type: 'solo', role: 'instruct',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        bengali_veg: 'frequently', north_indian: 'occasionally',
        south_indian: 'occasionally', street_food: 'frequently',
        indo_chinese: 'occasionally', continental: 'occasionally'
      },
      breakfast: {
        luchi_aloo: 'occasionally', paratha: 'occasionally',
        poha: 'frequently', upma: 'frequently',
        idli: 'occasionally'
      },
      lunch_dinner: {
        dal_bhaat: 'frequently', aloo_posto: 'frequently',
        shukto: 'occasionally', macher_jhol_veg: 'occasionally',
        cholar_dal: 'occasionally', rice_dishes: 'frequently'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['bengali_veg', 'street_food'],
      cultural_note: 'Kolkata solo professional — Bengali veg food, role=instruct means she reads recipe for domestic help',
      special_checks: [
        'Aloo Posto should appear in lunch/dinner suggestions (Bengali signature)',
        'Role=instruct flag set — no behavioral change in RE but must be stored correctly',
        'Kolkata street food (Puchka, Kathi Roll veg) valid for dinner slot'
      ]
    }
  },

  {
    id: 'P010',
    name: 'Smita Joshi',
    age: 48, gender: 'female',
    home_state: 'MH', current_city: 'Pune',
    diet_type: 'veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        maharashtrian: 'frequently', north_indian: 'frequently',
        south_indian: 'occasionally', gujarati: 'occasionally',
        indo_chinese: 'occasionally', street_food: 'occasionally'
      },
      breakfast: {
        poha: 'frequently', upma: 'frequently', sabudana_khichdi: 'occasionally',
        paratha: 'occasionally', idli: 'occasionally'
      },
      lunch_dinner: {
        dal_rice: 'frequently', sabzi_bhakri: 'frequently',
        puran_poli: 'occasionally', misal_pav: 'occasionally',
        chapati_sabzi: 'frequently'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['maharashtrian', 'north_indian'],
      cultural_note: 'Pune couple, mature user — expects well-personalized Maharashtrian-heavy suggestions by 3 months',
      special_checks: [
        'Mature user: RE v2 inferred prefs should be active',
        'Variety guard should prevent same dish appearing twice in 5-day window',
        'Misal Pav valid for both breakfast and lunch slots (meal_types check)',
        'Bhakri appears as carb base alternative to roti in Maharashtrian dishes'
      ]
    }
  },

  {
    id: 'P011',
    name: 'Harini Subramaniam',
    age: 26, gender: 'female',
    home_state: 'TN', current_city: 'Coimbatore',
    diet_type: 'veg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', tamil_brahmin: 'frequently',
        chettinad: 'occasionally', north_indian: 'occasionally',
        continental: 'occasionally', indo_chinese: 'never'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', pongal: 'occasionally',
        upma: 'occasionally', poori: 'occasionally'
      },
      lunch_dinner: {
        sambar_rice: 'frequently', rasam_rice: 'frequently',
        curd_rice: 'frequently', variety_rice: 'occasionally',
        chapati_kurma: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['south_indian', 'tamil_brahmin'],
      cultural_note: 'Coimbatore solo — classic Tamil vegetarian, Chinese in Never bucket',
      special_checks: [
        'Indo-Chinese must not appear in any slot',
        'Curd Rice valid as standalone dinner (light, solo user)',
        'Rasam Rice valid for dinner (comfort food for TN users)'
      ]
    }
  },

  {
    id: 'P012',
    name: 'Gayatri Mishra',
    age: 52, gender: 'female',
    home_state: 'MP', current_city: 'Bhopal',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', madhya_pradeshi: 'frequently',
        rajasthani: 'occasionally', gujarati: 'occasionally',
        south_indian: 'never', indo_chinese: 'never'
      },
      breakfast: {
        poha: 'frequently', jalebi_poha: 'occasionally',
        paratha: 'frequently', upma: 'never', idli: 'never'
      },
      lunch_dinner: {
        dal_bafla: 'occasionally', dal_chawal: 'frequently',
        sabzi_roti: 'frequently', kadhi_chawal: 'occasionally',
        bade_ki_kadhi: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['north_indian', 'madhya_pradeshi'],
      cultural_note: 'Bhopal family — Central India food, Poha with Jalebi is an MP signature breakfast',
      special_checks: [
        'South Indian and Chinese in Never bucket — must not appear in any slot',
        'Idli/Upma in Never breakfast — must not appear',
        'MP-specific dishes like Dal Bafla or Bhutte ka Kees expected via region_food_affinity'
      ]
    }
  },

  {
    id: 'P013',
    name: 'Lakshmi Venkataraman',
    age: 60, gender: 'female',
    home_state: 'KA', current_city: 'Mysore',
    diet_type: 'veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['onion', 'garlic', 'non_veg_products'] },
    buckets: {
      cuisine: {
        karnataka: 'frequently', udupi: 'frequently',
        south_indian: 'frequently', north_indian: 'occasionally',
        indo_chinese: 'never', continental: 'never'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', rava_idli: 'frequently',
        kesari_bath: 'occasionally', akki_roti: 'occasionally'
      },
      lunch_dinner: {
        bisi_bele_bath: 'frequently', sambar_rice: 'frequently',
        puliyogare: 'frequently', chitranna: 'occasionally',
        chapati_palya: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['onion', 'garlic'],
      top3_cuisine_match: ['karnataka', 'udupi', 'south_indian'],
      cultural_note: 'Mysore elder couple, Iyengar-style (no onion/garlic), deeply regional Karnataka food expected',
      special_checks: [
        'CRITICAL: Zero onion/garlic across all suggestions',
        'Mature user: high cuisine_drift validation — buckets should hold after 3 months',
        'Udupi cuisine dishes (no onion/garlic by tradition) should score high via region_food_affinity'
      ]
    }
  },

  {
    id: 'P014',
    name: 'Vandana Agarwal',
    age: 39, gender: 'female',
    home_state: 'RJ', current_city: 'Jaipur',
    diet_type: 'veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        rajasthani: 'frequently', north_indian: 'frequently',
        gujarati: 'occasionally', marwari: 'frequently',
        south_indian: 'never', indo_chinese: 'occasionally'
      },
      breakfast: {
        paratha: 'frequently', poori: 'occasionally',
        dal_baati: 'occasionally', poha: 'occasionally', idli: 'never'
      },
      lunch_dinner: {
        dal_baati_churma: 'frequently', gatte_ki_sabzi: 'frequently',
        ker_sangri: 'occasionally', laal_maas_veg: 'occasionally',
        missi_roti_sabzi: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['rajasthani', 'marwari', 'north_indian'],
      cultural_note: 'Jaipur family — Rajasthani/Marwari food, highly spiced, ghee-rich dishes expected',
      special_checks: [
        'Dal Baati Churma should appear as a combo in lunch/dinner',
        'South Indian in Never — must not appear',
        'Ghee-rich dishes valid (spice_level 3-4 acceptable for Rajasthani)',
        'region_food_affinity for RJ should boost Ker Sangri, Gatte ki Sabzi'
      ]
    }
  },

  {
    id: 'P015',
    name: 'Shweta Bansal',
    age: 29, gender: 'female',
    home_state: 'DL', current_city: 'Delhi',
    diet_type: 'veg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', punjabi: 'frequently',
        street_food: 'frequently', indo_chinese: 'frequently',
        south_indian: 'occasionally', continental: 'occasionally'
      },
      breakfast: {
        paratha: 'frequently', chole_bhature: 'occasionally',
        poha: 'occasionally', sandwich: 'occasionally', idli: 'never'
      },
      lunch_dinner: {
        dal_makhani: 'frequently', paneer_butter_masala: 'frequently',
        rajma_chawal: 'frequently', chole_chawal: 'occasionally',
        chinese_veg: 'frequently'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['north_indian', 'punjabi', 'street_food'],
      cultural_note: 'Delhi flatmates — butter-rich Punjab food, street food, Indo-Chinese equally common',
      special_checks: [
        'Dal Makhani or Paneer Butter Masala should appear in first 3 lunch/dinner suggestions',
        'Indo-Chinese valid for dinner slot at high frequency',
        'Idli in Never bucket — must not appear at breakfast'
      ]
    }
  },

  // ─── BLOCK 2: NON-VEG PERSONAS (12) ────────────────────────────────────────

  {
    id: 'P016',
    name: 'Arjun Singh',
    age: 24, gender: 'male',
    home_state: 'PB', current_city: 'Chandigarh',
    diet_type: 'non_veg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        punjabi: 'frequently', north_indian: 'frequently',
        street_food: 'frequently', indo_chinese: 'frequently',
        south_indian: 'occasionally', continental: 'occasionally'
      },
      breakfast: {
        paratha: 'frequently', eggs_bhurji: 'frequently',
        omelette: 'frequently', poha: 'occasionally', idli: 'never'
      },
      lunch_dinner: {
        butter_chicken: 'frequently', dal_makhani: 'frequently',
        chicken_biryani: 'frequently', mutton_rogan_josh: 'occasionally',
        fish_curry: 'occasionally', veg_dishes: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['punjabi', 'north_indian', 'street_food'],
      cultural_note: 'Chandigarh college guy — non-veg heavy, eggs at breakfast, butter chicken staple, fitness-conscious',
      special_checks: [
        'Egg dishes valid at breakfast slot',
        'Butter Chicken should appear in first 3 lunch/dinner',
        'Non-veg dishes should dominate but veg options still appear (Occasionally bucket)',
        'High calorie dishes valid for this age/profile'
      ]
    }
  },

  {
    id: 'P017',
    name: 'Vikram Nair',
    age: 20, gender: 'male',
    home_state: 'KL', current_city: 'Trivandrum',
    diet_type: 'non_veg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: ['prawn', 'crab'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        kerala: 'frequently', south_indian: 'frequently',
        seafood: 'frequently', north_indian: 'occasionally',
        indo_chinese: 'occasionally'
      },
      breakfast: {
        puttu_kadala: 'frequently', appam_egg: 'frequently',
        dosa: 'occasionally', idli: 'occasionally'
      },
      lunch_dinner: {
        kerala_fish_curry: 'frequently', karimeen_fry: 'frequently',
        chicken_stew: 'frequently', beef_fry: 'occasionally',
        sambar_rice: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['prawn', 'shrimp', 'crab', 'lobster', 'crayfish', 'scallop', 'clam', 'oyster', 'mussel'],
      top3_cuisine_match: ['kerala', 'south_indian', 'seafood'],
      cultural_note: 'Trivandrum student, shellfish allergy — fish is safe, shellfish strictly excluded',
      special_checks: [
        'CRITICAL: Zero shellfish — prawns, crabs excluded even in Kerala seafood dishes',
        'Fish curry (not shellfish) is valid — karimeen, pomfret, sardine valid',
        'Puttu Kadala Curry at breakfast (Kerala staple) expected',
        'Beef dishes valid (Kerala context) — must not be excluded by RE'
      ]
    }
  },

  {
    id: 'P018',
    name: 'Rohit Verma',
    age: 32, gender: 'male',
    home_state: 'UP', current_city: 'Agra',
    diet_type: 'non_veg', household_type: 'family_with_kids', role: 'instruct',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['beef', 'pork'] },
    buckets: {
      cuisine: {
        awadhi: 'frequently', north_indian: 'frequently',
        mughlai: 'frequently', street_food: 'occasionally',
        south_indian: 'never', indo_chinese: 'occasionally'
      },
      breakfast: {
        paratha: 'frequently', nihari: 'occasionally',
        eggs_boiled: 'occasionally', poori: 'occasionally'
      },
      lunch_dinner: {
        mutton_biryani: 'frequently', seekh_kebab: 'frequently',
        chicken_curry: 'frequently', dal_gosht: 'occasionally',
        shami_kebab: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['beef', 'boeuf', 'gai_ka_gosht', 'pork', 'suar_ka_gosht', 'bacon', 'ham'],
      top3_cuisine_match: ['awadhi', 'mughlai', 'north_indian'],
      cultural_note: 'Agra Muslim family, instruct role — Awadhi/Mughlai non-veg, beef and pork excluded by exclusion list (not diet_type)',
      special_checks: [
        'CRITICAL: Zero beef and zero pork dishes',
        'This exclusion comes from exclusions[] not diet_type — test that integer-based exclusion system works',
        'South Indian in Never bucket — must not appear',
        'Mutton, chicken, lamb are all valid',
        'Awadhi specialties (Dum Biryani, Galawati Kebab) expected via region_food_affinity'
      ]
    }
  },

  {
    id: 'P019',
    name: 'Suresh Pillai',
    age: 44, gender: 'male',
    home_state: 'KL', current_city: 'Kozhikode',
    diet_type: 'non_veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        kerala: 'frequently', malabar: 'frequently',
        south_indian: 'occasionally', north_indian: 'never',
        indo_chinese: 'never'
      },
      breakfast: {
        puttu_kadala: 'frequently', pathiri: 'frequently',
        appam_chicken: 'occasionally', dosa: 'occasionally'
      },
      lunch_dinner: {
        malabar_biryani: 'frequently', calicut_chicken: 'frequently',
        fish_moilee: 'frequently', prawn_curry: 'occasionally',
        beef_ularthu: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['kerala', 'malabar'],
      cultural_note: 'Kozhikode Malabar family — Calicut biryani and Malabar dishes are culturally distinct from standard Kerala',
      special_checks: [
        'Malabar Biryani distinct from Thalassery Biryani — both valid, should appear via region_food_affinity',
        'North Indian and Chinese in Never — must not appear',
        'Mature user: variety guard should spread across Malabar sub-cuisines, not repeat Biryani daily',
        'Pathiri at breakfast expected (Malabar-specific)'
      ]
    }
  },

  {
    id: 'P020',
    name: 'Rahul Das',
    age: 27, gender: 'male',
    home_state: 'WB', current_city: 'Kolkata',
    diet_type: 'non_veg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        bengali: 'frequently', south_indian: 'occasionally',
        north_indian: 'occasionally', indo_chinese: 'frequently',
        street_food: 'frequently', continental: 'occasionally'
      },
      breakfast: {
        luchi_kosha_mangsho: 'occasionally', bread_omelette: 'frequently',
        paratha: 'occasionally', poha: 'occasionally'
      },
      lunch_dinner: {
        macher_jhol: 'frequently', kosha_mangsho: 'frequently',
        chicken_rezala: 'occasionally', prawn_malai_curry: 'occasionally',
        chinese_non_veg: 'frequently'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['bengali', 'indo_chinese', 'street_food'],
      cultural_note: 'Kolkata young professional — Bengali fish/meat staples + Kolkata Chinese (distinct from standard Indo-Chinese)',
      special_checks: [
        'Macher Jhol (mustard fish curry) expected in top 3 lunch/dinner',
        'Kolkata Chinese (Tangra Chilli Chicken) valid and distinct from Mumbai Indo-Chinese',
        'Kosha Mangsho at weekend — verify RE weekend boost for elaborate dishes',
        'Luchi Kosha Mangsho — verify combo architecture stores this correctly'
      ]
    }
  },

  {
    id: 'P021',
    name: 'Kabir Hussain',
    age: 36, gender: 'male',
    home_state: 'UP', current_city: 'Lucknow',
    diet_type: 'non_veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['pork', 'beef'] },
    buckets: {
      cuisine: {
        awadhi: 'frequently', mughlai: 'frequently',
        north_indian: 'frequently', persian_influenced: 'occasionally',
        south_indian: 'never', indo_chinese: 'occasionally'
      },
      breakfast: {
        nihari_kulcha: 'occasionally', paratha: 'frequently',
        eggs_half_fry: 'frequently', paya: 'occasionally'
      },
      lunch_dinner: {
        dum_biryani: 'frequently', galouti_kebab: 'frequently',
        sheermal: 'occasionally', mutton_korma: 'frequently',
        seekh_kebab: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['pork', 'beef'],
      top3_cuisine_match: ['awadhi', 'mughlai'],
      cultural_note: 'Lucknow Awadhi specialist — Dum Biryani, Galouti Kebab, Sheermal — this is the region_food_affinity showcase',
      special_checks: [
        'CRITICAL: Zero pork and beef',
        'Galouti Kebab expected via region_food_affinity for UP',
        'Dum Biryani (Lucknow style, not Hyderabadi) should score high',
        'South Indian in Never — must not appear'
      ]
    }
  },

  {
    id: 'P022',
    name: 'Sanjay Tripathi',
    age: 55, gender: 'male',
    home_state: 'MH', current_city: 'Mumbai',
    diet_type: 'non_veg', household_type: 'family_with_kids', role: 'instruct',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['beef'] },
    buckets: {
      cuisine: {
        maharashtrian: 'frequently', north_indian: 'frequently',
        coastal: 'frequently', indo_chinese: 'occasionally',
        south_indian: 'occasionally', street_food: 'frequently'
      },
      breakfast: {
        poha: 'frequently', keema_pav: 'occasionally',
        eggs_bhurji: 'frequently', misal_pav: 'occasionally'
      },
      lunch_dinner: {
        fish_curry_rice: 'frequently', chicken_kolhapuri: 'frequently',
        mutton_sukha: 'occasionally', kombdi_vade: 'occasionally',
        bombay_style: 'frequently'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['beef'],
      top3_cuisine_match: ['maharashtrian', 'coastal'],
      cultural_note: 'Mumbai senior non-veg — Coastal Maharashtra (Konkan fish), Kolhapuri spice, beef excluded',
      special_checks: [
        'CRITICAL: Zero beef',
        'Fish Curry Rice expected — Bombay Duck, Pomfret, Surmai are culturally appropriate',
        'Mature 3-month user: RE should NOT keep suggesting same Chicken Kolhapuri every week (variety guard)',
        'Kombdi Vade expected via region_food_affinity for MH Konkan'
      ]
    }
  },

  {
    id: 'P023',
    name: 'Ravi Kumar',
    age: 31, gender: 'male',
    home_state: 'TN', current_city: 'Chennai',
    diet_type: 'non_veg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        chettinad: 'frequently', tamil: 'frequently',
        south_indian: 'frequently', north_indian: 'occasionally',
        indo_chinese: 'occasionally'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', pesarattu: 'occasionally',
        omelette_dosa: 'occasionally'
      },
      lunch_dinner: {
        chettinad_chicken: 'frequently', fish_kozhambu: 'frequently',
        biryani_chicken: 'frequently', mutton_pepper_fry: 'occasionally',
        prawn_masala: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['chettinad', 'tamil'],
      cultural_note: 'Chennai non-veg couple — Chettinad (highly spiced) + Tamil fish dishes, very different from Kerala non-veg',
      special_checks: [
        'Chettinad Chicken (spice_level 3-4) should appear as high-scoring suggestion',
        'Not same as Kerala non-veg — different spice profile and cooking methods',
        'Fish Kozhambu (tamarind-based) expected vs Kerala Fish Moilee (coconut-based)',
        'region_food_affinity for TN must distinguish Chettinad from generic South Indian'
      ]
    }
  },

  {
    id: 'P024',
    name: 'Anand Rao',
    age: 41, gender: 'male',
    home_state: 'AP', current_city: 'Visakhapatnam',
    diet_type: 'non_veg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        andhra: 'frequently', telugu: 'frequently',
        south_indian: 'occasionally', north_indian: 'never',
        indo_chinese: 'occasionally'
      },
      breakfast: {
        pesarattu: 'frequently', upma: 'frequently',
        idli: 'occasionally', dosa: 'occasionally'
      },
      lunch_dinner: {
        andhra_chicken_curry: 'frequently', royyala_iguru: 'frequently',
        fish_pulusu: 'frequently', mutton_koora: 'occasionally',
        gongura_mutton: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['andhra', 'telugu'],
      cultural_note: 'Vizag Andhra family — highly spiced Andhra non-veg, Gongura dishes culturally specific to AP',
      special_checks: [
        'Gongura Mutton / Gongura Prawn expected via region_food_affinity for AP',
        'North Indian in Never — must not appear',
        'Andhra food is typically spice_level 3-4 — low spice suggestions should not dominate',
        'Royyala (Prawn) Iguru — check shellfish not flagged as allergen (no allergy declared)'
      ]
    }
  },

  {
    id: 'P025',
    name: 'Deepak Sharma',
    age: 23, gender: 'male',
    home_state: 'HR', current_city: 'Gurgaon',
    diet_type: 'non_veg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', punjabi: 'frequently',
        mughlai: 'occasionally', indo_chinese: 'frequently',
        street_food: 'frequently', continental: 'occasionally'
      },
      breakfast: {
        eggs_bhurji: 'frequently', paratha: 'frequently',
        sandwich: 'occasionally', omelette: 'frequently'
      },
      lunch_dinner: {
        butter_chicken: 'frequently', biryani_chicken: 'frequently',
        chinese_non_veg: 'frequently', kebabs: 'occasionally',
        dal_makhani: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['north_indian', 'punjabi', 'indo_chinese'],
      cultural_note: 'Gurgaon tech flatmate — high calorie, Butter Chicken + Biryani + Indo-Chinese trinity is the stereotype that must validate',
      special_checks: [
        'Butter Chicken should appear in first 2 lunch/dinner suggestions',
        'Eggs at breakfast in high position (Frequently)',
        'Indo-Chinese frequency should match Frequently bucket weight'
      ]
    }
  },

  {
    id: 'P026',
    name: 'Mahesh Reddy',
    age: 47, gender: 'male',
    home_state: 'TS', current_city: 'Hyderabad',
    diet_type: 'non_veg', household_type: 'family_with_kids', role: 'instruct',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        hyderabadi: 'frequently', telangana: 'frequently',
        andhra: 'frequently', mughlai: 'occasionally',
        south_indian: 'occasionally', north_indian: 'never'
      },
      breakfast: {
        idli: 'frequently', pesarattu: 'frequently',
        upma: 'occasionally', puri: 'occasionally'
      },
      lunch_dinner: {
        hyderabadi_biryani: 'frequently', haleem: 'occasionally',
        bagara_baingan: 'occasionally', mirchi_ka_salan: 'occasionally',
        pathar_gosht: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['hyderabadi', 'telangana'],
      cultural_note: 'Hyderabad family — Hyderabadi Biryani is a sacred dish, north Indian cuisine blocked',
      special_checks: [
        'Hyderabadi Biryani should appear multiple times across 7 days (not penalized — user loves it)',
        'North Indian in Never — must not appear',
        'Mature user repeat tolerance check: Biryani can repeat at persona\'s tolerance window',
        'Haleem (seasonal/Ramzan) — check if RE handles occasion-tagged dishes correctly'
      ]
    }
  },

  {
    id: 'P027',
    name: 'Biren Gogoi',
    age: 29, gender: 'male',
    home_state: 'AS', current_city: 'Guwahati',
    diet_type: 'non_veg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        assamese: 'frequently', north_east: 'frequently',
        bengali: 'occasionally', north_indian: 'occasionally',
        indo_chinese: 'occasionally', south_indian: 'never'
      },
      breakfast: {
        rice_pithas: 'occasionally', paratha: 'frequently',
        bread_egg: 'frequently', poha: 'occasionally'
      },
      lunch_dinner: {
        masor_tenga: 'frequently', duck_curry: 'occasionally',
        pork_with_bamboo: 'frequently', khar: 'occasionally',
        pitika: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['assamese', 'north_east'],
      cultural_note: 'Guwahati — Assamese food, pork valid, fermented bamboo valid, the RE must not default to generic North Indian for Northeast users',
      special_checks: [
        'Pork dishes are valid — must not be excluded by any constraint',
        'Masor Tenga (sour fish curry) expected via region_food_affinity for AS',
        'South Indian in Never — must not appear',
        'If region_food_affinity for AS/NE is sparse, flag as DATA GAP in report, not RE failure'
      ]
    }
  },

  // ─── BLOCK 3: JAIN PERSONAS (8) ─────────────────────────────────────────────

  {
    id: 'P028',
    name: 'Minal Shah',
    age: 35, gender: 'female',
    home_state: 'GJ', current_city: 'Surat',
    diet_type: 'jain', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        gujarati: 'frequently', jain: 'frequently',
        north_indian: 'occasionally', rajasthani: 'occasionally',
        south_indian: 'never', indo_chinese: 'never'
      },
      breakfast: {
        thepla: 'frequently', dhokla: 'frequently',
        khakra: 'frequently', paratha: 'occasionally'
      },
      lunch_dinner: {
        jain_dal_baati: 'occasionally', khichdi: 'frequently',
        farsi_puri: 'occasionally', sev_tameta: 'frequently',
        jain_paneer: 'frequently'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip', 'ginger_root'],
      top3_cuisine_match: ['gujarati', 'jain'],
      cultural_note: 'Surat Jain family — is_jain=true, zero onion/garlic/root vegetables, auto-derivation is the key test',
      special_checks: [
        'CRITICAL: Zero onion, garlic, potato, carrot, radish, beet, turnip across ALL suggestions',
        'CRITICAL: is_jain derivation pipeline must flag this correctly via ingredient flags',
        'South Indian and Chinese in Never — must not appear',
        'Dhokla, Thepla, Khichdi all Jain-safe — expect these in top suggestions',
        'Paneer dishes valid but must be Jain version (no onion/garlic in gravy)'
      ]
    }
  },

  {
    id: 'P029',
    name: 'Amit Kothari',
    age: 42, gender: 'male',
    home_state: 'RJ', current_city: 'Jodhpur',
    diet_type: 'jain', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        rajasthani_jain: 'frequently', marwari: 'frequently',
        gujarati: 'occasionally', north_indian_jain: 'occasionally',
        south_indian: 'never', street_food: 'occasionally'
      },
      breakfast: {
        paratha_jain: 'frequently', poha_jain: 'frequently',
        khichdi: 'occasionally', fruits: 'occasionally'
      },
      lunch_dinner: {
        dal_bati_jain: 'frequently', gatte_ki_sabzi_jain: 'frequently',
        paneer_jain: 'frequently', ker_sangri: 'occasionally',
        kadhi_jain: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip'],
      top3_cuisine_match: ['rajasthani_jain', 'marwari'],
      cultural_note: 'Jodhpur Jain — Rajasthani Jain cooking is a distinct sub-cuisine with specific recipes (Gatte uses gram flour, no roots)',
      special_checks: [
        'CRITICAL: Zero root vegetables — Jain hard constraint',
        'Gatte ki Sabzi valid (made with gram flour, no roots)',
        'Dal Baati Jain version (without use of underground vegetables) valid',
        'South Indian in Never — must not appear',
        'Ker Sangri (berries and beans, no roots) culturally appropriate for RJ Jain'
      ]
    }
  },

  {
    id: 'P030',
    name: 'Hema Mehta',
    age: 58, gender: 'female',
    home_state: 'GJ', current_city: 'Ahmedabad',
    diet_type: 'jain', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        gujarati_jain: 'frequently', jain: 'frequently',
        rajasthani_jain: 'occasionally', north_indian_jain: 'occasionally',
        all_others: 'never'
      },
      breakfast: {
        thepla: 'frequently', khakra: 'frequently',
        dhokla: 'frequently', fafda: 'occasionally'
      },
      lunch_dinner: {
        undhiyu_jain: 'occasionally', khichdi: 'frequently',
        surti_locho: 'occasionally', dal_dhokli_jain: 'frequently',
        shaak_rotli: 'frequently'
      }
    },
    re_maturity: 'three_month', never_list_density: 'heavy',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip', 'eggplant'],
      top3_cuisine_match: ['gujarati_jain', 'jain'],
      cultural_note: 'Senior Ahmedabad Jain couple, heavy never-list — tests pool exhaustion, should trigger \'review preferences\' prompt gracefully',
      special_checks: [
        'CRITICAL: Zero root vegetables + eggplant (brinjal is also avoided by some Jains)',
        'Heavy never-list: if eligible pool drops below threshold, verify graceful empty-state, not crash',
        'Mature 3-month user: RE variety across limited Jain pool must not repeat same dishes every day',
        'Undhiyu Jain version valid — winter seasonal dish from GJ'
      ]
    }
  },

  {
    id: 'P031',
    name: 'Rajesh Jain',
    age: 38, gender: 'male',
    home_state: 'MH', current_city: 'Mumbai',
    diet_type: 'jain', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: ['peanut', 'cashew', 'almond', 'walnut', 'pistachio'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        jain: 'frequently', gujarati: 'frequently',
        north_indian_jain: 'occasionally', maharashtrian_jain: 'occasionally',
        south_indian: 'never', indo_chinese: 'never'
      },
      breakfast: {
        poha_jain: 'frequently', upma_jain: 'occasionally',
        thepla: 'frequently', idli_jain: 'occasionally'
      },
      lunch_dinner: {
        paneer_jain: 'frequently', dal_rice: 'frequently',
        sabzi_roti_jain: 'frequently', gujarati_thali: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'cashew', 'almond', 'peanut', 'walnut'],
      top3_cuisine_match: ['jain', 'gujarati'],
      cultural_note: 'Mumbai Jain with nut allergy — dual constraint (Jain diet + nut allergy), tests stacking of constraints',
      special_checks: [
        'CRITICAL: Both Jain constraint AND nut allergy must be independently enforced',
        'Many Jain dishes use cashew as protein substitute — must flag these',
        'South Indian and Chinese in Never — must not appear',
        'This tests that two independent hard filters both apply correctly'
      ]
    }
  },

  {
    id: 'P032',
    name: 'Bhavna Shah',
    age: 27, gender: 'female',
    home_state: 'GJ', current_city: 'Vadodara',
    diet_type: 'jain', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        gujarati: 'frequently', jain: 'frequently',
        north_indian: 'occasionally', street_food_jain: 'occasionally',
        south_indian: 'occasionally', indo_chinese: 'never'
      },
      breakfast: {
        thepla: 'frequently', dhokla: 'frequently',
        khakra: 'occasionally', poha_jain: 'occasionally'
      },
      lunch_dinner: {
        dal_dhokli: 'frequently', khichdi: 'frequently',
        paneer_jain: 'occasionally', undhiyu: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip'],
      top3_cuisine_match: ['gujarati', 'jain'],
      cultural_note: 'Young Vadodara Jain solo — classic validation that young Jains get appropriately varied, not just elder-targeted dishes',
      special_checks: [
        'CRITICAL: Zero root vegetables',
        'Street food valid if Jain-safe (Sev Puri without potato, Bhel without potato)',
        'Chinese in Never — must not appear',
        'Variety check: 7-day plan must include at least 4 different cuisines from Frequently/Occasionally buckets'
      ]
    }
  },

  {
    id: 'P033',
    name: 'Sunil Lodha',
    age: 45, gender: 'male',
    home_state: 'RJ', current_city: 'Bikaner',
    diet_type: 'jain', household_type: 'family_with_kids', role: 'instruct',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        rajasthani_jain: 'frequently', marwari: 'frequently',
        gujarati: 'occasionally', north_indian_jain: 'occasionally',
        all_others: 'never'
      },
      breakfast: {
        bikaneri_paratha: 'frequently', khichdi: 'occasionally',
        thepla: 'occasionally', poori_jain: 'occasionally'
      },
      lunch_dinner: {
        dal_bati_jain: 'frequently', papad_ki_sabzi: 'frequently',
        sangri_ki_sabzi: 'occasionally', gatte_ki_sabzi: 'frequently',
        bajra_roti_dal: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip'],
      top3_cuisine_match: ['rajasthani_jain', 'marwari'],
      cultural_note: 'Bikaner Jain — desert Rajasthan, reliance on dried ingredients (papad, sangri), role=instruct',
      special_checks: [
        'CRITICAL: Zero root vegetables',
        'Papad Ki Sabzi valid and expected (Rajasthani Jain staple, no roots)',
        'Sangri Ki Sabzi valid (dried desert berries/beans)',
        'region_food_affinity for Bikaner/RJ must surface these desert Jain dishes',
        'role=instruct stored correctly but no RE behavior change'
      ]
    }
  },

  {
    id: 'P034',
    name: 'Nisha Parikh',
    age: 31, gender: 'female',
    home_state: 'MH', current_city: 'Pune',
    diet_type: 'jain', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: ['gluten'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        jain: 'frequently', gujarati: 'frequently',
        north_indian_jain: 'occasionally', south_indian_jain: 'occasionally',
        indo_chinese: 'never'
      },
      breakfast: {
        dhokla: 'frequently', idli_jain: 'occasionally',
        rice_poha_jain: 'occasionally', fruits: 'frequently'
      },
      lunch_dinner: {
        khichdi: 'frequently', dal_rice: 'frequently',
        steamed_vegetables: 'occasionally', rice_based: 'frequently'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'wheat', 'maida', 'atta', 'semolina'],
      top3_cuisine_match: ['jain', 'gujarati'],
      cultural_note: 'Jain + gluten allergy = triple constraint (no roots + no wheat + all vegan implications) — the hardest dietary profile',
      special_checks: [
        'CRITICAL: Zero root vegetables AND zero gluten — both independent constraints',
        'Chapati/roti/paratha must never appear (gluten)',
        'Thepla must be flagged if made with wheat — rice flour Thepla valid',
        'Dhokla (rice+dal fermented) is gluten-free and Jain — should score very high',
        'Rice Khichdi valid (rice+moong, gluten-free, Jain-safe)',
        'Monitor: may produce very small eligible pool — test graceful handling'
      ]
    }
  },

  {
    id: 'P035',
    name: 'Ramesh Oswal',
    age: 65, gender: 'male',
    home_state: 'RJ', current_city: 'Jaisalmer',
    diet_type: 'jain', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        rajasthani_jain: 'frequently', marwari: 'frequently',
        gujarati: 'occasionally', all_others: 'never'
      },
      breakfast: {
        bati: 'occasionally', khichdi: 'frequently',
        khakra: 'frequently', churma: 'occasionally'
      },
      lunch_dinner: {
        dal_bati_churma_jain: 'frequently', panchkuta_sabzi: 'frequently',
        bajra_khichdi: 'frequently', lapsi: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'heavy',
    expectations: {
      must_never_contain: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beet', 'turnip'],
      top3_cuisine_match: ['rajasthani_jain', 'marwari'],
      cultural_note: 'Jaisalmer elder Jain — the most restricted persona, heavy never-list + Jain + very specific regional food',
      special_checks: [
        'CRITICAL: Zero root vegetables',
        'Heavy never-list: pool exhaustion is likely — validate empty-state and \'review preferences\' prompt',
        'Panchkuta (5 dried desert plants) is Jain-safe and culturally appropriate',
        'This persona may have <20 valid dishes — test that RE handles this gracefully, not with crash',
        'Mature 3-month user with heavy never-list: this is the hardest RE edge case'
      ]
    }
  },

  // ─── BLOCK 4: EGG PERSONAS (8) ──────────────────────────────────────────────

  {
    id: 'P036',
    name: 'Aditya Kumar',
    age: 22, gender: 'male',
    home_state: 'BR', current_city: 'Patna',
    diet_type: 'egg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', bihari: 'frequently',
        street_food: 'frequently', indo_chinese: 'occasionally',
        south_indian: 'never'
      },
      breakfast: {
        omelette: 'frequently', egg_bhurji: 'frequently',
        paratha: 'frequently', poha: 'occasionally'
      },
      lunch_dinner: {
        dal_chawal: 'frequently', egg_curry: 'frequently',
        chokha_baati: 'occasionally', sattu_paratha: 'occasionally',
        rajma_chawal: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['north_indian', 'bihari'],
      cultural_note: 'Patna egg-eating student — Bihari food (Sattu, Chokha), eggs valid at all slots but no non-veg meat',
      special_checks: [
        'Egg dishes valid — omelette, bhurji, egg curry all valid',
        'No meat dishes (chicken, mutton) — egg diet_type means only egg as animal protein',
        'Sattu Paratha expected via region_food_affinity for BR',
        'South Indian in Never — must not appear',
        'Bihari dishes must appear via region_food_affinity (Litti Chokha, Sattu)'
      ]
    }
  },

  {
    id: 'P037',
    name: 'Preeti Sharma',
    age: 28, gender: 'female',
    home_state: 'DL', current_city: 'Delhi',
    diet_type: 'egg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        north_indian: 'frequently', continental: 'occasionally',
        indo_chinese: 'frequently', street_food: 'frequently',
        south_indian: 'occasionally'
      },
      breakfast: {
        omelette: 'frequently', egg_paratha: 'frequently',
        scrambled_eggs: 'frequently', bread_egg: 'occasionally'
      },
      lunch_dinner: {
        egg_biryani: 'frequently', egg_curry: 'frequently',
        fried_rice_egg: 'frequently', north_indian_veg: 'occasionally',
        pasta_egg: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['north_indian', 'indo_chinese', 'street_food'],
      cultural_note: 'Delhi solo egg-eater — urban professional, egg appears in every slot, no meat',
      special_checks: [
        'Egg dishes must appear across all 3 meal slots',
        'No chicken, mutton, fish — only eggs as animal protein',
        'Egg Biryani distinct from Chicken Biryani — diet_type check must correctly allow this',
        'Continental egg dishes valid (scrambled, poached, omelette)'
      ]
    }
  },

  {
    id: 'P038',
    name: 'Santosh Naik',
    age: 34, gender: 'male',
    home_state: 'GOA', current_city: 'Panaji',
    diet_type: 'egg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: ['prawn', 'crab'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        goan_vegetarian: 'frequently', konkan: 'frequently',
        south_indian: 'occasionally', continental: 'occasionally',
        north_indian: 'never', indo_chinese: 'occasionally'
      },
      breakfast: {
        sannas: 'frequently', poie_omelette: 'frequently',
        dosa: 'occasionally', poha: 'occasionally'
      },
      lunch_dinner: {
        goan_curry_egg: 'frequently', khatkhate: 'occasionally',
        cafreal_egg: 'occasionally', xacuti_egg: 'occasionally',
        fish_free_goan: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['prawn', 'shrimp', 'crab', 'lobster', 'shellfish'],
      top3_cuisine_match: ['goan_vegetarian', 'konkan'],
      cultural_note: 'Goa egg-eater with shellfish allergy — Goan food is seafood-heavy, this tests the RE navigating a constrained regional cuisine',
      special_checks: [
        'CRITICAL: Zero shellfish (prawn, crab common in Goan food)',
        'Egg-based Goan dishes valid (Goan Omelette Curry, Egg Cafreal)',
        'North Indian in Never — must not appear',
        'If Goan egg dishes are sparse in DB, flag as DATA GAP in report',
        'region_food_affinity for GOA should surface Goan-specific dishes'
      ]
    }
  },

  {
    id: 'P039',
    name: 'Manish Tiwari',
    age: 25, gender: 'male',
    home_state: 'MH', current_city: 'Nagpur',
    diet_type: 'egg', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        vidarbha: 'frequently', maharashtrian: 'frequently',
        north_indian: 'occasionally', indo_chinese: 'frequently',
        south_indian: 'occasionally'
      },
      breakfast: {
        poha: 'frequently', omelette: 'frequently',
        sabudana_khichdi: 'occasionally', paratha: 'occasionally'
      },
      lunch_dinner: {
        saoji_egg_curry: 'frequently', dal_rice: 'frequently',
        egg_masala: 'frequently', chinese_egg: 'occasionally',
        varhadi_dishes: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['vidarbha', 'maharashtrian'],
      cultural_note: 'Nagpur Vidarbha region — Saoji cuisine (very spicy) is regionally specific, tests sub-regional food affinity',
      special_checks: [
        'Saoji Egg Curry expected via region_food_affinity for Nagpur/Vidarbha',
        'Saoji = extremely spicy (spice_level 4) — validate spice_level assigned correctly',
        'No meat (egg diet_type)',
        'Vidarbha dishes distinct from Pune/Mumbai Maharashtra — test sub-regional affinity'
      ]
    }
  },

  {
    id: 'P040',
    name: 'Sanjukta Devi',
    age: 40, gender: 'female',
    home_state: 'WB', current_city: 'Siliguri',
    diet_type: 'egg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        bengali: 'frequently', north_east: 'occasionally',
        north_indian: 'occasionally', south_indian: 'never',
        indo_chinese: 'occasionally'
      },
      breakfast: {
        luchi: 'occasionally', paratha: 'frequently',
        egg_bhurji: 'frequently', bread_egg: 'frequently'
      },
      lunch_dinner: {
        dim_kosha: 'frequently', daal_bhaat: 'frequently',
        egg_curry_bengali: 'frequently', aloo_posto_egg: 'occasionally',
        rice_dishes: 'frequently'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['bengali'],
      cultural_note: 'Siliguri Bengali egg-eater — Dim Kosha (Bengali egg curry) is the signature dish, South Indian blocked',
      special_checks: [
        'Dim Kosha (Bengali egg curry) expected via region_food_affinity for WB',
        'No fish/meat — only eggs',
        'South Indian in Never — must not appear',
        'Aloo Posto variant with egg valid'
      ]
    }
  },

  {
    id: 'P041',
    name: 'Tanvir Ahmed',
    age: 32, gender: 'male',
    home_state: 'KA', current_city: 'Bangalore',
    diet_type: 'egg', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', karnataka: 'frequently',
        north_indian: 'occasionally', indo_chinese: 'frequently',
        continental: 'occasionally'
      },
      breakfast: {
        dosa_egg: 'frequently', omelette: 'frequently',
        idli: 'occasionally', upma: 'occasionally'
      },
      lunch_dinner: {
        egg_rice: 'frequently', egg_masala: 'frequently',
        south_indian_egg_curry: 'occasionally',
        fried_rice_egg: 'frequently', dal_tadka: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['south_indian', 'karnataka', 'indo_chinese'],
      cultural_note: 'Bangalore solo egg-eater — tech city profile, South Indian base with Chinese, no meat',
      special_checks: [
        'Egg Dosa valid at breakfast (egg on top of dosa, common in Bangalore)',
        'No meat — only eggs',
        'Indo-Chinese egg dishes valid (Egg Fried Rice, Chilli Egg)',
        'South Indian egg varieties (Omelette Curry, Egg Masala with coconut) expected'
      ]
    }
  },

  {
    id: 'P042',
    name: 'Fatima Begum',
    age: 48, gender: 'female',
    home_state: 'UP', current_city: 'Aligarh',
    diet_type: 'egg', household_type: 'family_with_kids', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: ['pork', 'beef'] },
    buckets: {
      cuisine: {
        mughlai_veg_egg: 'frequently', north_indian: 'frequently',
        awadhi_veg: 'occasionally', indo_chinese: 'occasionally',
        south_indian: 'never'
      },
      breakfast: {
        egg_paratha: 'frequently', omelette: 'frequently',
        nihari_veg: 'occasionally', paratha: 'occasionally'
      },
      lunch_dinner: {
        egg_biryani: 'frequently', egg_korma: 'frequently',
        shahi_egg: 'occasionally', dal_chawal: 'frequently',
        mughlai_veg: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['pork', 'beef'],
      top3_cuisine_match: ['mughlai_veg_egg', 'north_indian'],
      cultural_note: 'Aligarh Muslim egg-eater — egg + Mughlai style, beef and pork excluded, no meat other than eggs',
      special_checks: [
        'CRITICAL: Zero pork and beef',
        'No chicken/mutton (egg diet_type, not non_veg)',
        'Egg Biryani in Mughlai style expected',
        'South Indian in Never — must not appear',
        'Tests that egg diet_type + exclusions correctly stack'
      ]
    }
  },

  {
    id: 'P043',
    name: 'Krishnamurthy P.',
    age: 55, gender: 'male',
    home_state: 'TN', current_city: 'Madurai',
    diet_type: 'egg', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        tamil: 'frequently', south_indian: 'frequently',
        chettinad: 'occasionally', north_indian: 'never',
        indo_chinese: 'never'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently',
        omelette: 'occasionally', pongal: 'frequently'
      },
      lunch_dinner: {
        muttai_kulambu: 'frequently', sambar_rice: 'frequently',
        rasam_rice: 'frequently', egg_chettinad: 'occasionally',
        curd_rice: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'light',
    expectations: {
      must_never_contain: [],
      top3_cuisine_match: ['tamil', 'south_indian'],
      cultural_note: 'Madurai Tamil egg-eater — eggs in Tamil-style curries (Muttai Kulambu), North Indian and Chinese blocked',
      special_checks: [
        'Muttai Kulambu (Tamil egg curry) expected via region_food_affinity for TN',
        'North Indian and Chinese in Never — must not appear',
        'Mature 3-month user: variety guard active — Rice-based dishes should rotate',
        'No meat other than eggs'
      ]
    }
  },

  // ─── BLOCK 5: VEGAN PERSONAS (7) ────────────────────────────────────────────

  {
    id: 'P044',
    name: 'Ishaan Mehta',
    age: 26, gender: 'male',
    home_state: 'MH', current_city: 'Mumbai',
    diet_type: 'vegan', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', north_indian_vegan: 'frequently',
        continental_vegan: 'occasionally', indo_chinese_vegan: 'frequently',
        street_food_vegan: 'frequently'
      },
      breakfast: {
        oats: 'frequently', idli: 'frequently', dosa: 'occasionally',
        poha: 'frequently', fruits: 'occasionally'
      },
      lunch_dinner: {
        dal_rice: 'frequently', rajma_rice: 'frequently',
        vegan_stir_fry: 'occasionally', south_indian_meals: 'frequently',
        vegan_biryani: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['milk', 'cream', 'paneer', 'ghee', 'butter', 'curd', 'cheese', 'honey', 'eggs', 'meat', 'fish'],
      top3_cuisine_match: ['south_indian', 'north_indian_vegan'],
      cultural_note: 'Mumbai vegan flatmate — modern urban, expects variety, strict vegan (no honey either)',
      special_checks: [
        'CRITICAL: Zero dairy, zero eggs, zero animal products including honey',
        'Dal Tadka must use oil not ghee — verify ingredient flag on ghee',
        'South Indian dishes without ghee/butter are naturally vegan (idli, plain dosa)',
        'Vegan dishes should not all be boring — variety of cooking methods expected',
        'Many Indian dishes use ghee as finishing — these must be excluded'
      ]
    }
  },

  {
    id: 'P045',
    name: 'Ananya Roy',
    age: 31, gender: 'female',
    home_state: 'WB', current_city: 'Kolkata',
    diet_type: 'vegan', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: ['peanut', 'cashew', 'almond', 'walnut', 'pistachio'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        bengali_vegan: 'frequently', south_indian: 'frequently',
        north_indian_vegan: 'occasionally', continental_vegan: 'occasionally',
        indo_chinese_vegan: 'occasionally'
      },
      breakfast: {
        poha: 'frequently', idli: 'occasionally', dosa: 'occasionally',
        oats_vegan: 'frequently', smoothie: 'occasionally'
      },
      lunch_dinner: {
        aloo_posto_vegan: 'frequently', dal_bhaat: 'frequently',
        mixed_veg_curry: 'occasionally', rice_dishes: 'frequently',
        vegan_stir_fry: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['dairy', 'eggs', 'honey', 'meat', 'fish', 'cashew', 'almond', 'peanut', 'walnut'],
      top3_cuisine_match: ['bengali_vegan', 'south_indian'],
      cultural_note: 'Kolkata vegan with nut allergy — Aloo Posto naturally vegan, tests vegan + nut constraint stack',
      special_checks: [
        'CRITICAL: Zero dairy + zero nuts — two independent constraints',
        'Aloo Posto (poppy seed, no nuts, no dairy) expected in top suggestions',
        'Bengali vegan dishes are less common in DB — flag DATA GAP if pool is small',
        'Cashew-based vegan cheeses/creams also excluded (nut allergy)'
      ]
    }
  },

  {
    id: 'P046',
    name: 'Prakash Iyer',
    age: 43, gender: 'male',
    home_state: 'TN', current_city: 'Chennai',
    diet_type: 'vegan', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', tamil_vegan: 'frequently',
        north_indian_vegan: 'occasionally', continental_vegan: 'never',
        indo_chinese: 'occasionally'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', pongal_vegan: 'frequently',
        kozhukattai: 'occasionally', upma_oil: 'occasionally'
      },
      lunch_dinner: {
        sambar_rice: 'frequently', rasam_rice: 'frequently',
        kootu: 'frequently', poriyal: 'frequently',
        tamarind_rice: 'occasionally'
      }
    },
    re_maturity: 'three_month', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['dairy', 'ghee', 'eggs', 'honey', 'meat', 'fish'],
      top3_cuisine_match: ['south_indian', 'tamil_vegan'],
      cultural_note: 'Chennai Tamil vegan couple — traditional Tamil food is largely naturally vegan (no ghee finishing), mature user',
      special_checks: [
        'CRITICAL: Zero dairy including ghee',
        'Traditional Tamil food (Poriyal, Kootu, Sambar) is naturally vegan when oil replaces ghee — verify',
        'Pongal: ghee-based version excluded, oil-based version valid — test dish variant logic',
        'Mature 3-month user: variety across Tamil sub-cuisines expected',
        'Continental vegan in Never — must not appear'
      ]
    }
  },

  {
    id: 'P047',
    name: 'Zara Siddiqui',
    age: 24, gender: 'female',
    home_state: 'DL', current_city: 'Delhi',
    diet_type: 'vegan', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: ['gluten'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', north_indian_vegan: 'occasionally',
        continental_vegan: 'frequently', street_food_vegan: 'occasionally',
        indo_chinese_vegan: 'frequently'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', fruits: 'frequently',
        smoothie: 'occasionally', oats_gf: 'occasionally'
      },
      lunch_dinner: {
        rice_dal: 'frequently', south_indian_meals: 'frequently',
        vegan_gf_stir_fry: 'occasionally', rice_based: 'frequently',
        vegan_chinese: 'occasionally'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['dairy', 'eggs', 'honey', 'meat', 'fish', 'wheat', 'maida', 'atta', 'semolina', 'barley'],
      top3_cuisine_match: ['south_indian', 'continental_vegan'],
      cultural_note: 'Delhi vegan + gluten allergy — extremely constrained, South Indian rice-based dishes are the natural fit',
      special_checks: [
        'CRITICAL: Zero dairy + zero gluten — hardest combination outside of Jain',
        'Idli and plain Dosa (rice+urad dal, no wheat) are valid and expected to dominate',
        'Roti/paratha/chapati excluded (gluten)',
        'Most North Indian dishes use ghee or wheat — expect small pool, validate graceful handling',
        'Continental vegan + GF: rice pasta, quinoa-based valid if in DB'
      ]
    }
  },

  {
    id: 'P048',
    name: 'Deepa Krishnan',
    age: 37, gender: 'female',
    home_state: 'KL', current_city: 'Kozhikode',
    diet_type: 'vegan', household_type: 'couple', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        kerala_vegan: 'frequently', south_indian: 'frequently',
        north_indian_vegan: 'occasionally', continental_vegan: 'occasionally',
        indo_chinese: 'never'
      },
      breakfast: {
        puttu_vegan: 'frequently', appam_vegan: 'frequently',
        idiyappam: 'frequently', dosa: 'occasionally'
      },
      lunch_dinner: {
        avial: 'frequently', olan: 'frequently',
        erissery: 'frequently', kalan: 'occasionally',
        sambar_rice: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'light',
    expectations: {
      must_never_contain: ['dairy', 'ghee', 'eggs', 'honey', 'meat', 'fish'],
      top3_cuisine_match: ['kerala_vegan', 'south_indian'],
      cultural_note: 'Kozhikode vegan couple — Kerala Sadya dishes are naturally vegan (Avial, Olan, Erissery use coconut not dairy)',
      special_checks: [
        'CRITICAL: Zero dairy including ghee and honey',
        'Avial (coconut+veg, no dairy) naturally vegan — should score high',
        'Olan (ash gourd + coconut milk, vegan) expected',
        'Puttu: traditionally with coconut, vegan — verify ghee flag on recipe',
        'Chinese in Never — must not appear',
        'Kerala coconut-based dishes are the RE showcase for natural vegan alignment'
      ]
    }
  },

  {
    id: 'P049',
    name: 'Rohan Bose',
    age: 20, gender: 'male',
    home_state: 'WB', current_city: 'Kolkata',
    diet_type: 'vegan', household_type: 'flatmates', role: 'cook',
    allergens: { ingredient_names: [] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', bengali_vegan: 'occasionally',
        north_indian_vegan: 'occasionally', indo_chinese_vegan: 'frequently',
        continental_vegan: 'frequently', street_food_vegan: 'frequently'
      },
      breakfast: {
        oats: 'frequently', idli: 'frequently', smoothie: 'occasionally',
        poha: 'frequently', dosa: 'occasionally'
      },
      lunch_dinner: {
        dal_rice: 'frequently', vegan_biryani: 'frequently',
        chinese_vegan: 'frequently', vegan_continental: 'occasionally',
        south_indian_rice: 'frequently'
      }
    },
    re_maturity: 'cold_start', never_list_density: 'light',
    expectations: {
      must_never_contain: ['dairy', 'eggs', 'honey', 'meat', 'fish'],
      top3_cuisine_match: ['south_indian', 'indo_chinese_vegan', 'street_food_vegan'],
      cultural_note: 'Kolkata student vegan — newer-generation vegan choices, expects Indo-Chinese and Continental vegan options, tests DB breadth',
      special_checks: [
        'CRITICAL: Zero dairy and eggs',
        'Vegan Indo-Chinese (Chilli Veg, Veg Fried Rice with no egg) valid if DB has these',
        'If vegan Chinese options sparse in DB, flag DATA GAP — not RE failure',
        'Continental vegan (pasta with olive oil, no cheese) valid if in DB',
        'Young user: spice preferences unknown at cold start — RE must not default to very spicy'
      ]
    }
  },

  {
    id: 'P050',
    name: 'Laleh Mehdi',
    age: 33, gender: 'female',
    home_state: 'MH', current_city: 'Pune',
    diet_type: 'vegan', household_type: 'solo', role: 'cook',
    allergens: { ingredient_names: ['soy'] },
    exclusions: { ingredient_names: [] },
    buckets: {
      cuisine: {
        south_indian: 'frequently', north_indian_vegan: 'frequently',
        continental_vegan: 'occasionally', maharashtrian_vegan: 'frequently',
        indo_chinese: 'never'
      },
      breakfast: {
        idli: 'frequently', dosa: 'frequently', poha: 'frequently',
        fruits: 'occasionally', upma_oil: 'occasionally'
      },
      lunch_dinner: {
        dal_rice: 'frequently', sabzi_roti_vegan: 'frequently',
        south_indian_meals: 'frequently', misal_vegan: 'occasionally',
        veg_biryani_vegan: 'occasionally'
      }
    },
    re_maturity: 'two_week', never_list_density: 'moderate',
    expectations: {
      must_never_contain: ['dairy', 'eggs', 'honey', 'meat', 'fish', 'soy', 'tofu', 'soya', 'edamame'],
      top3_cuisine_match: ['south_indian', 'maharashtrian_vegan', 'north_indian_vegan'],
      cultural_note: 'Pune vegan with soy allergy — tests vegan + soy exclusion (soy is common in vegan protein alternatives)',
      special_checks: [
        'CRITICAL: Zero dairy + zero soy — dual constraint',
        'Tofu excluded (soy-based) — many vegan recipes use tofu as protein',
        'Soy milk excluded — even if used in small quantities in continental recipes',
        'Chinese in Never — must not appear',
        'Dal-based dishes valid (not soy) — moong, chana, masoor all safe',
        'This tests that vegan ≠ always safe for soy allergy users'
      ]
    }
  }

];

// Persona summary statistics (for report generation)
export const PERSONA_STATS = {
  total: 50,
  by_diet: {
    veg: 15,
    non_veg: 12,
    jain: 8,
    egg: 8,
    vegan: 7
  },
  with_allergens: PERSONAS.filter(p => p.allergens.ingredient_names.length > 0).length,
  with_exclusions: PERSONAS.filter(p => p.exclusions.ingredient_names.length > 0).length,
  cold_start: PERSONAS.filter(p => p.re_maturity === 'cold_start').length,
  two_week: PERSONAS.filter(p => p.re_maturity === 'two_week').length,
  three_month: PERSONAS.filter(p => p.re_maturity === 'three_month').length,
  heavy_never_list: PERSONAS.filter(p => p.never_list_density === 'heavy').length,
  states_covered: [...new Set(PERSONAS.map(p => p.home_state))].length
};

export default PERSONAS;
