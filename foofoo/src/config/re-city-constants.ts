/**
 * Static city → destination-group mapping constants derived from
 * State_Profile_v3 and City_Migration_Overlay_v3 (workbook v3).
 *
 * These values mirror canonical workbook data and must not be invented.
 * Update only when the source workbook is updated.
 */

/** Per-state T1 and T2 city name lists (lowercased). */
export const STATE_TIER_CITIES: Record<string, { t1: string[]; t2: string[] }> = {
  S01: { t1: ['visakhapatnam', 'vizag', 'vijayawada'], t2: ['guntur', 'nellore', 'kurnool'] },
  S02: { t1: ['itanagar', 'guwahati'], t2: ['naharlagun', 'pasighat'] },
  S03: { t1: ['guwahati'], t2: ['dibrugarh', 'silchar', 'jorhat'] },
  S04: { t1: ['patna'], t2: ['gaya', 'bhagalpur', 'muzaffarpur'] },
  S05: { t1: ['raipur'], t2: ['bhilai', 'bilaspur', 'korba'] },
  S06: { t1: ['panaji', 'panjim', 'margao', 'madgaon'], t2: ['vasco', 'mapusa'] },
  S07: { t1: ['ahmedabad', 'surat'], t2: ['vadodara', 'baroda', 'rajkot', 'bhavnagar'] },
  S08: { t1: ['gurugram', 'gurgaon', 'faridabad'], t2: ['panipat', 'karnal', 'hisar'] },
  S09: { t1: ['shimla'], t2: ['dharamshala', 'solan', 'mandi'] },
  S10: { t1: ['ranchi', 'jamshedpur'], t2: ['dhanbad', 'bokaro', 'deoghar'] },
  S11: { t1: ['bengaluru', 'bangalore'], t2: ['mysuru', 'mysore', 'mangaluru', 'mangalore', 'hubballi', 'hubli'] },
  S12: { t1: ['kochi', 'cochin', 'thiruvananthapuram', 'trivandrum'], t2: ['kozhikode', 'calicut', 'thrissur', 'kollam'] },
  S13: { t1: ['indore', 'bhopal'], t2: ['jabalpur', 'gwalior', 'ujjain'] },
  S14: { t1: ['mumbai', 'bombay', 'pune', 'thane', 'navi mumbai', 'navimumbai'], t2: ['nagpur', 'nashik', 'aurangabad', 'chhatrapati sambhajinagar'] },
  S15: { t1: ['imphal'], t2: ['thoubal', 'churachandpur'] },
  S16: { t1: ['shillong'], t2: ['tura', 'jowai'] },
  S17: { t1: ['aizawl'], t2: ['lunglei', 'champhai'] },
  S18: { t1: ['kohima', 'dimapur'], t2: ['mokokchung', 'wokha'] },
  S19: { t1: ['bhubaneswar', 'cuttack'], t2: ['rourkela', 'sambalpur', 'berhampur', 'brahmapur'] },
  S20: { t1: ['ludhiana', 'chandigarh'], t2: ['amritsar', 'jalandhar', 'patiala'] },
  S21: { t1: ['jaipur'], t2: ['jodhpur', 'udaipur', 'kota'] },
  S22: { t1: ['gangtok'], t2: ['namchi', 'gyalshing'] },
  S23: { t1: ['chennai', 'madras', 'coimbatore'], t2: ['madurai', 'tiruchirappalli', 'trichy', 'salem'] },
  S24: { t1: ['hyderabad', 'secunderabad'], t2: ['warangal', 'karimnagar', 'nizamabad'] },
  S25: { t1: ['agartala'], t2: ['dharmanagar'] },
  S26: { t1: ['lucknow', 'noida', 'kanpur'], t2: ['varanasi', 'agra', 'prayagraj', 'allahabad'] },
  S27: { t1: ['dehradun'], t2: ['haridwar', 'haldwani', 'roorkee'] },
  S28: { t1: ['kolkata', 'calcutta', 'howrah'], t2: ['durgapur', 'siliguri', 'asansol'] },
  S29: { t1: ['port blair'], t2: ['mayabunder', 'diglipur'] },
  S30: { t1: ['chandigarh'], t2: ['mohali', 'panchkula'] },
  S31: { t1: ['daman', 'silvassa'], t2: ['diu', 'vapi'] },
  S32: { t1: ['delhi', 'new delhi', 'delhi ncr'], t2: ['ghaziabad', 'greater noida'] },
  S33: { t1: ['srinagar', 'jammu'], t2: ['anantnag', 'baramulla'] },
  S34: { t1: ['leh'], t2: ['kargil'] },
  S35: { t1: ['kavaratti'], t2: ['minicoy', 'agatti'] },
  S36: { t1: ['puducherry', 'pondicherry'], t2: ['karaikal', 'yanam', 'mahe'] },
};

/**
 * Cities that always map to a specific cross-state pan-India destination group,
 * checked only when the city is NOT in the user's home-state tier lists.
 */
export const CROSS_STATE_METRO_MAP: Record<string, string> = {
  // MUMBAI_PUNE
  mumbai: 'MUMBAI_PUNE', bombay: 'MUMBAI_PUNE', pune: 'MUMBAI_PUNE',
  pimpri: 'MUMBAI_PUNE', thane: 'MUMBAI_PUNE', 'navi mumbai': 'MUMBAI_PUNE', navimumbai: 'MUMBAI_PUNE',
  // DELHI_NCR
  delhi: 'DELHI_NCR', 'new delhi': 'DELHI_NCR', 'delhi ncr': 'DELHI_NCR',
  gurugram: 'DELHI_NCR', gurgaon: 'DELHI_NCR', noida: 'DELHI_NCR',
  faridabad: 'DELHI_NCR', ghaziabad: 'DELHI_NCR', 'greater noida': 'DELHI_NCR',
  // BENGALURU_HYD_CHENNAI
  bengaluru: 'BENGALURU_HYD_CHENNAI', bangalore: 'BENGALURU_HYD_CHENNAI',
  hyderabad: 'BENGALURU_HYD_CHENNAI', secunderabad: 'BENGALURU_HYD_CHENNAI',
  chennai: 'BENGALURU_HYD_CHENNAI', madras: 'BENGALURU_HYD_CHENNAI',
  // AHMEDABAD_SURAT
  ahmedabad: 'AHMEDABAD_SURAT', surat: 'AHMEDABAD_SURAT',
  // KOLKATA_EAST
  kolkata: 'KOLKATA_EAST', calcutta: 'KOLKATA_EAST', howrah: 'KOLKATA_EAST',
  // GOA_COASTAL
  goa: 'GOA_COASTAL', panaji: 'GOA_COASTAL', panjim: 'GOA_COASTAL',
  margao: 'GOA_COASTAL', vasco: 'GOA_COASTAL',
};

/** destination_group_code → city_tier_code. */
export const DESTINATION_GROUP_TO_TIER: Record<string, 'T1' | 'T2'> = {
  HOME_STATE_TIER1: 'T1',
  HOME_STATE_TIER2: 'T2',
  MUMBAI_PUNE: 'T1',
  DELHI_NCR: 'T1',
  BENGALURU_HYD_CHENNAI: 'T1',
  AHMEDABAD_SURAT: 'T1',
  KOLKATA_EAST: 'T1',
  GOA_COASTAL: 'T2',
  PAN_INDIA_PG_HOSTEL: 'T2',
};

/**
 * Health overlay code → overlay persona ID (Persona_Master_v3, can_be_overlay=Y,
 * health_overlay_default=Y). Proxy personas used where dedicated persona is
 * not yet defined (postpartum, fasting) — flagged for V2 refinement.
 */
export const HEALTH_OVERLAY_PERSONA_MAP: Record<string, string> = {
  weight_loss: 'P17',
  high_protein_fitness: 'P18',
  veg_protein_seeker: 'P19',
  diabetic_management: 'P15',
  hypertension_heart: 'P16',
  pregnancy_support: 'P07',
  postpartum_lactation: 'P07', // proxy — dedicated persona planned V2
  fasting_ritual: 'P36', // proxy (recovery/light) — dedicated persona planned V2
};

/**
 * Cook dependency → overlay persona ID (can_be_overlay=Y, cook_overlay_default=Y).
 * self_cook / delivery_heavy / tiffin_pg_no_kitchen do not trigger a cook overlay.
 */
export const COOK_OVERLAY_PERSONA_MAP: Record<string, string> = {
  skilled_cook: 'P22',
  cook_needs_instruction: 'P23',
  maid_simple: 'P25',
};

/** Persona ID applied when the user is living outside their home state. */
export const MIGRATION_OVERLAY_PERSONA_ID = 'P28';
