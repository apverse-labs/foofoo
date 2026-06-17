# RE Persona Coverage Report

> Last updated: 2026-06-14  
> Source file: `foofoo-tests/personas/re-persona-definitions.ts`  
> Total personas defined: **50 / 50** (`RE_PERSONA_COUNT = 50`)  
> Test runner: `foofoo-tests/personas/re-persona-runner.ts`  
> Journey test: `foofoo-tests/integration/re-persona-journey.test.ts`

---

## Coverage Summary

| Dimension | Count | Notes |
|-----------|-------|-------|
| Total personas | 50 | RP001–RP050; all defined |
| Region archetypes covered | 4 / 4 | SOUTH_RICE, NORTH_WHEAT, EAST_RICE, WEST_MIXED |
| Food preference types covered | 5 / 5 | veg, non_veg, egg, jain, vegan |
| Dietary flags covered | 11 / 12 | See gap note below |
| Household sizes | 1–8 members | Single, couple, family, joint |
| Feedback scripts covered | 5 / 5 | eager, picky, random, never_heavy, lock_heavy |
| States covered (homeStateId) | 23 of 36 | See state coverage table |
| Cities covered | 31 unique cities | Across all major metros and regional cities |

> **Dietary flag gap:** `fasting` flag is present in `REDietaryFlag` type and tested (RP016). All 12 defined flags are covered across the 50 personas: `diabetic`, `hypertension`, `pregnant`, `postpartum`, `recovery`, `allergy`, `fasting`, `gym`, `weight_loss`, `lactating`, `jain`, `vegan`.

---

## All 50 Personas

| ID | Name | Home State | Current City | Food Pref | HH Size | Member Roles | Dietary Flags | Region Archetype | Feedback Script |
|----|------|-----------|-------------|-----------|---------|-------------|---------------|-----------------|-----------------|
| RP001 | South veg family | S12 Kerala | Bengaluru | veg | 4 | adult, adult, child, child | — | SOUTH_RICE | eager |
| RP002 | South coastal non-veg | S01 AP | Hyderabad | non_veg | 5 | adult, adult, child, elderly, elderly | elderly | SOUTH_RICE | random |
| RP003 | North wheat couple | S20 Punjab | Amritsar | non_veg | 2 | adult, adult | — | NORTH_WHEAT | eager |
| RP004 | North veg with newborn | S21 Rajasthan | Jaipur | veg | 3 | adult, adult(lactating), infant | lactating | NORTH_WHEAT | picky |
| RP005 | Gujarati joint family | S06 Gujarat | Ahmedabad | veg | 6 | adult, adult, teen, child, elderly, elderly(diabetic) | diabetic | WEST_MIXED | random |
| RP006 | Bengal non-veg | S28 WB | Kolkata | non_veg | 4 | adult, adult, teen, child | — | EAST_RICE | eager |
| RP007 | Jain strict | S06 Gujarat | Mumbai | jain | 3 | adult(jain), adult(jain), toddler | jain | WEST_MIXED | picky |
| RP008 | MP migrant in Mumbai | S13 MP | Mumbai | veg | 3 | adult, adult, child | — | WEST_MIXED | random |
| RP009 | South IT professional | S23 TN | Bengaluru | veg | 1 | adult(gym) | gym | SOUTH_RICE | eager |
| RP010 | North non-veg migrant | S26 UP | Delhi | non_veg | 3 | adult, adult, child | — | NORTH_WHEAT | picky |
| RP011 | Diabetic household | S11 Karnataka | Mysuru | veg | 2 | adult, adult(diabetic) | diabetic | SOUTH_RICE | random |
| RP012 | Pregnancy household | S14 Maharashtra | Pune | non_veg | 2 | adult, adult(pregnant) | pregnant | WEST_MIXED | picky |
| RP013 | Postpartum | S12 Kerala | Kochi | veg | 3 | adult, adult(postpartum), infant | postpartum | SOUTH_RICE | picky |
| RP014 | Elderly-primary | S21 Rajasthan | Udaipur | veg | 2 | elderly, elderly | — | NORTH_WHEAT | random |
| RP015 | Hypertension | S20 Punjab | Ludhiana | non_veg | 4 | adult(HTN), adult, teen, child | hypertension | NORTH_WHEAT | picky |
| RP016 | Fasting | S06 Gujarat | Surat | veg | 4 | adult(fasting), adult, teen, elderly | fasting | WEST_MIXED | random |
| RP017 | Recovery | S23 TN | Coimbatore | veg | 2 | adult, adult(recovery) | recovery | SOUTH_RICE | picky |
| RP018 | Allergy | S14 Maharashtra | Nagpur | non_veg | 3 | adult, adult, child(allergy) | allergy | WEST_MIXED | random |
| RP019 | Weight-loss | S29 Delhi | Delhi | non_veg | 1 | adult(weight_loss) | weight_loss | NORTH_WHEAT | eager |
| RP020 | Northeast India | S02 Assam | Guwahati | non_veg | 4 | adult, adult, teen, child | — | EAST_RICE | random |
| RP021 | Odia coastal | S19 Odisha | Bhubaneswar | non_veg | 5 | adult, adult, child, elderly, elderly | — | EAST_RICE | random |
| RP022 | Himachali | S08 HP | Shimla | non_veg | 4 | adult, adult, teen, child | — | NORTH_WHEAT | eager |
| RP023 | UP migrant in Bengaluru | S26 UP | Bengaluru | veg | 2 | adult, adult | — | NORTH_WHEAT | random |
| RP024 | Tamil family in Mumbai | S23 TN | Mumbai | veg | 4 | adult, adult, child, child | — | SOUTH_RICE | eager |
| RP025 | Kerala family in Delhi | S12 Kerala | Delhi | non_veg | 2 | adult, adult | — | SOUTH_RICE | random |
| RP026 | Pure vegan | S14 Maharashtra | Pune | vegan | 2 | adult(vegan), adult(vegan) | vegan | WEST_MIXED | eager |
| RP027 | Egg-only ovo-veg | S28 WB | Kolkata | egg | 4 | adult, adult, teen, child | — | EAST_RICE | random |
| RP028 | DINK | S11 Karnataka | Bengaluru | non_veg | 2 | adult, adult | — | SOUTH_RICE | eager |
| RP029 | Large joint family | S21 Rajasthan | Jodhpur | veg | 8 | adult, adult, adult(pregnant), adult, teen, toddler, elderly, elderly | pregnant | NORTH_WHEAT | picky |
| RP030 | Teen-heavy | S20 Punjab | Jalandhar | non_veg | 4 | adult, adult, teen, teen | — | NORTH_WHEAT | eager |
| RP031 | Baby-primary | S26 UP | Lucknow | veg | 3 | adult, adult, infant | — | NORTH_WHEAT | picky |
| RP032 | South veg diabetic | S23 TN | Madurai | veg | 2 | adult, adult(diabetic) | diabetic | SOUTH_RICE | picky |
| RP033 | Bihar rural | S03 Bihar | Patna | non_veg | 6 | adult, adult, teen, child, child, elderly | — | EAST_RICE | random |
| RP034 | Jharkhand | S09 Jharkhand | Ranchi | non_veg | 5 | adult, adult, teen, child, elderly | — | EAST_RICE | random |
| RP035 | Goa coastal | S05 Goa | Panaji | non_veg | 2 | adult, adult | — | SOUTH_RICE | eager |
| RP036 | Konkan Marathi | S14 Maharashtra | Ratnagiri | non_veg | 4 | adult, adult, teen, child | — | WEST_MIXED | random |
| RP037 | Kashmiri | S10 J&K | Srinagar | non_veg | 5 | adult, adult, teen, child, elderly | — | NORTH_WHEAT | picky |
| RP038 | Punjabi veg | S20 Punjab | Patiala | veg | 2 | adult, adult | — | NORTH_WHEAT | eager |
| RP039 | Andhra spicy | S01 AP | Vijayawada | non_veg | 4 | adult, adult, teen, child | — | SOUTH_RICE | eager |
| RP040 | Chennai IT | S23 TN | Chennai | veg | 1 | adult(gym) | gym | SOUTH_RICE | eager |
| RP041 | Bengaluru startup | S11 Karnataka | Bengaluru | non_veg | 2 | adult, adult | — | SOUTH_RICE | eager |
| RP042 | Hyderabad biryani | S24 Telangana | Hyderabad | non_veg | 4 | adult, adult, teen, child | — | SOUTH_RICE | eager |
| RP043 | Jain + diabetic | S06 Gujarat | Rajkot | jain | 2 | adult(jain), adult(diabetic) | jain + diabetic | WEST_MIXED | picky |
| RP044 | Never-list stress test | S14 Maharashtra | Mumbai | veg | 1 | adult | — | WEST_MIXED | never_heavy |
| RP045 | Zero feedback cold-start | S26 UP | Kanpur | non_veg | 2 | adult, adult | — | NORTH_WHEAT | random |
| RP046 | Max signals power user | S11 Karnataka | Bengaluru | non_veg | 1 | adult | — | SOUTH_RICE | lock_heavy |
| RP047 | Inconsistent signals | S20 Punjab | Delhi | non_veg | 2 | adult, adult | — | NORTH_WHEAT | random |
| RP048 | Multilingual cook | S23 TN | Mumbai | veg | 5 | adult, adult, teen, child, elderly | — | SOUTH_RICE | picky |
| RP049 | South non-veg migrant | S12 Kerala | Delhi | non_veg | 2 | adult, adult | — | SOUTH_RICE | random |
| RP050 | All segments | S21 Rajasthan | Mumbai | veg | 7 | adult, adult(diabetic), teen, child, toddler, infant, elderly | diabetic | NORTH_WHEAT | picky |

---

## Segment Coverage Breakdown

### By Region Archetype

| Archetype | States Covered | Persona Count |
|-----------|---------------|--------------|
| SOUTH_RICE | S01(AP), S05(Goa), S11(Karnataka), S12(Kerala), S23(TN), S24(Telangana), S31(Puducherry)* | 18 |
| NORTH_WHEAT | S07(Haryana)*, S08(HP), S10(J&K), S20(Punjab), S21(Rajasthan), S26(UP), S27(Uttarakhand)*, S29(Delhi) | 15 |
| EAST_RICE | S02(Assam), S03(Bihar), S09(Jharkhand), S19(Odisha), S28(WB) | 8 |
| WEST_MIXED | S06(Gujarat), S13(MP), S14(Maharashtra) | 9 |

> States marked `*` appear in QA_REGION_BY_STATE but have no homeStateId persona assigned.

### By Food Preference

| Food Pref | Persona Count | % of 50 |
|-----------|--------------|---------|
| non_veg | 27 | 54% |
| veg | 18 | 36% |
| jain | 2 | 4% |
| egg | 1 | 2% |
| vegan | 1 | 2% |

### By Feedback Script

| Script | Persona Count | Purpose |
|--------|--------------|---------|
| eager | 17 | Positive feedback loop, fast affinity build |
| random | 17 | Noise injection, mixed signals |
| picky | 13 | Conservative feedback, constraint stress |
| never_heavy | 1 | NEVER list saturation (RP044) |
| lock_heavy | 1 | LOCK list saturation (RP046) |

### By Household Type

| Type | Personas | Count |
|------|----------|-------|
| Single (size 1) | RP009, RP019, RP040, RP044, RP046 | 5 |
| Couple (size 2) | RP003, RP011, RP012, RP014, RP023, RP025, RP026, RP028, RP035, RP038, RP043, RP045, RP047, RP049 | 14 |
| Small family (3–4) | RP001, RP004, RP006, RP007, RP008, RP010, RP013, RP015, RP016, RP017, RP018, RP022, RP024, RP027, RP030, RP031, RP036, RP039, RP041, RP042 | 20 |
| Medium family (5) | RP002, RP021, RP034, RP037, RP048 | 5 |
| Large / joint (6+) | RP005, RP029, RP033, RP050 | 4 |
| Mixed / partial (2–3 with infant) | RP031 | (counted in small family above) |

### By Dietary Flag (hard constraints tested)

| Dietary Flag | Personas | Count |
|-------------|----------|-------|
| diabetic | RP005, RP011, RP032, RP043, RP050 | 5 |
| pregnant | RP012, RP029 | 2 |
| postpartum | RP013 | 1 |
| lactating | RP004 | 1 |
| gym | RP009, RP040 | 2 |
| weight_loss | RP019 | 1 |
| hypertension | RP015 | 1 |
| recovery | RP017 | 1 |
| allergy | RP018 | 1 |
| fasting | RP016 | 1 |
| jain | RP007, RP043 | 2 |
| vegan | RP026 | 1 |
| infant | RP004, RP013, RP029, RP031, RP050 | 5 |
| elderly | RP002, RP005, RP014, RP016, RP021, RP029, RP033, RP034, RP037, RP048, RP050 | 11 |

### States NOT Represented in Persona Set

States defined in `STATE_NAMES` but with no persona homeStateId assigned (13 of 36):

`S04` (Chhattisgarh), `S07` (Haryana), `S15` (Manipur), `S16` (Meghalaya), `S17` (Mizoram), `S18` (Nagaland), `S22` (Sikkim), `S25` (Tripura), `S27` (Uttarakhand), `S30` (Chandigarh), `S31` (Puducherry), `S32` (Andaman), `S33` (Dadra), `S34` (Daman), `S35` (Lakshadweep), `S36` (Outside India)

> These are low-population or UT states. Their region archetypes are covered via adjacent state personas. This is an expected gap for a 50-persona set.

---

## Migration Scenarios Tested

| Scenario | Personas | Description |
|----------|----------|-------------|
| Same-state native | RP003, RP006, RP020, RP021, RP033, RP039, RP042 | Current city matches home state |
| South→North migration | RP025, RP049 | Kerala → Delhi |
| North→South migration | RP023 | UP → Bengaluru |
| South→West migration | RP024, RP048 | Tamil → Mumbai |
| Other region → metro | RP008, RP010, RP044 | MP/UP → Mumbai/Delhi |
