/**
 * Static maps for region archetype → keyword matching against
 * re_class_dish_options.region_relevance text.
 *
 * Source: re_states.region_archetype + observed region_relevance values
 * in re_class_dish_options seed data.
 */

/** Maps state_id → region_archetype (from re_states seed data). */
export const STATE_REGION_ARCHETYPE: Record<string, string> = {
  S01: 'SOUTH_RICE',        // Andhra Pradesh
  S02: 'NORTHEAST',         // Arunachal Pradesh
  S03: 'NORTHEAST',         // Assam
  S04: 'EAST',              // Bihar
  S05: 'CENTRAL',           // Chhattisgarh
  S06: 'COASTAL',           // Goa
  S07: 'WEST_VEG',          // Gujarat
  S08: 'NORTH_WHEAT',       // Haryana
  S09: 'HIMALAYAN',         // Himachal Pradesh
  S10: 'EAST',              // Jharkhand
  S11: 'SOUTH_RICE',        // Karnataka
  S12: 'SOUTH_RICE',        // Kerala
  S13: 'CENTRAL',           // Madhya Pradesh
  S14: 'WEST_COASTAL',      // Maharashtra
  S15: 'NORTHEAST',         // Manipur
  S16: 'NORTHEAST',         // Meghalaya
  S17: 'NORTHEAST',         // Mizoram
  S18: 'NORTHEAST',         // Nagaland
  S19: 'EAST',              // Odisha
  S20: 'NORTH_WHEAT',       // Punjab
  S21: 'NORTH_WHEAT',       // Rajasthan
  S22: 'HIMALAYAN',         // Sikkim
  S23: 'SOUTH_RICE',        // Tamil Nadu
  S24: 'SOUTH_RICE',        // Telangana
  S25: 'EAST',              // Tripura
  S26: 'NORTH_WHEAT',       // Uttar Pradesh
  S27: 'HIMALAYAN',         // Uttarakhand
  S28: 'EAST',              // West Bengal
  S29: 'COASTAL',           // Andaman & Nicobar Islands
  S30: 'NORTH_WHEAT',       // Chandigarh
  S31: 'WEST_COASTAL',      // Dadra & Nagar Haveli and Daman & Diu
  S32: 'NORTH_WHEAT',       // Delhi
  S33: 'HIMALAYAN',         // Jammu & Kashmir
  S34: 'HIMALAYAN',         // Ladakh
  S35: 'COASTAL',           // Lakshadweep
  S36: 'SOUTH_RICE',        // Puducherry
};

/**
 * Maps region_archetype → keywords to match against region_relevance strings.
 * A dish whose region_relevance contains any matching keyword scores +0.20.
 */
export const REGION_ARCHETYPE_KEYWORDS: Record<string, string[]> = {
  SOUTH_RICE:   ['south', 'kerala', 'karnataka', 'tamil', 'andhra', 'telangana', 'coastal'],
  NORTH_WHEAT:  ['north', 'punjab', 'haryana', 'delhi', 'rajasthan', 'up', 'central'],
  EAST:         ['east', 'bihar', 'jharkhand', 'bengal', 'odisha', 'orissa'],
  WEST_VEG:     ['gujarat', 'west', 'rajasthan'],
  WEST_COASTAL: ['west', 'coastal', 'maharashtra', 'mumbai', 'goa', 'konkan'],
  CENTRAL:      ['central', 'north', 'west', 'mp', 'chhattisgarh'],
  NORTHEAST:    ['northeast', 'assam', 'manipur', 'nagaland', 'east'],
  HIMALAYAN:    ['north', 'himalayan', 'uttarakhand', 'hp', 'himachal', 'kashmir'],
  COASTAL:      ['coastal', 'south', 'west', 'island'],
};

/** Keywords in region_relevance that always give a small pan-India boost (+0.05). */
export const PAN_INDIA_KEYWORDS = ['all regions', 'pan india', 'urban india', 'tier 1'];
