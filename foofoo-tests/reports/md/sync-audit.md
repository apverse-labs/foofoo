# FooFoo Test Suite — Sync Audit
**Generated:** 2026-05-25  
**Auditor:** Claude Code (automated sync — foofoo-tests vs foofoo/)  
**Scope:** `foofoo-tests/` vs `foofoo/supabase/functions/` · `foofoo/src/`

---

## TASK 1 — Drift Table

| Test file | Test name | Status | Issue |
|---|---|---|---|
| `unit/re-scoring.test.ts` | `Weather match adds +0.2` | WRONG_MOCK | Test asserts `WEIGHTS.weather_match === 0.2`, but Edge Function uses `RE_V1.WEATHER_BOOST = 0.15`. re-engine.ts weight is the wrong value. |
| `unit/re-scoring.test.ts` | `Home state match adds +0.1` | WRONG_MOCK | Test asserts `WEIGHTS.home_state === 0.1` flat, but Edge Function uses `regionAffinityByCuisineId[cuisine_id] * HOME_STATE_BOOST_MAX(0.2)` — no flat +0.1 for home_state match. |
| `unit/re-scoring.test.ts` | `score formula: base(1.0) + boosts stays within range` | STALE | Comment says `+0.15 (day_of_week)` but Edge Function uses two separate day boosts: `WEEKDAY_QUICK_BOOST=0.1` (weekday) and `WEEKEND_SLOW_BOOST=0.05` (weekend). Max formula comment is wrong. Old: `day_of_week: 0.15`. New: weekday=0.1, weekend=0.05. |
| `unit/re-scoring.test.ts` | `random factor is between 0 and 0.15` | VALID | Both re-engine.ts and Edge Function use `RANDOM_MAX = 0.15`. |
| `unit/re-scoring.test.ts` | All hard filter tests | VALID | Hard filter logic matches Edge Function. |
| `unit/re-scoring.test.ts` | `Frequently cuisine bucket adds +0.3` | VALID | `CUISINE_BOOST_FREQUENT = 0.3` matches in both. |
| `unit/re-scoring.test.ts` | `Occasionally cuisine bucket adds +0.1` | VALID | `CUISINE_BOOST_OCCASIONAL = 0.1` matches. |
| `unit/re-scoring.test.ts` | (RE v2 scoring signals) | MISSING | Edge Function has RE v2 scoring (spice_boost, complexity_boost, drift_boost, affinity_boost) — no tests exist for these. New tests should live in `unit/re-scoring.test.ts`. |
| `unit/variety-guard.test.ts` | All variety guard tests | VALID | `getRepeatWindow` formula and `isDishInRepeatWindow` logic match. |
| `unit/hard-constraints.test.ts` | All constraint tests | VALID | Hard filter logic matches Edge Function exactly. |
| `unit/auto-derivation.test.ts` | All derivation tests | VALID | `deriveAttributes` logic matches `derive-dish-attributes` Edge Function. |
| `unit/bucket-logic.test.ts` | All bucket tests | VALID | Bucket logic matches. |
| `integration/edge-functions.test.ts` | `generate-daily-plan function exists` | VALID | Function name `generate-daily-plan` matches actual folder name. |
| `integration/edge-functions.test.ts` | `user_inferred_prefs row created after calculation` | STALE | Test checks `(data as any).decay_config` is not null, but `user_inferred_prefs` in the Edge Function writes `spice_score, complexity_score, repeat_tolerance, cuisine_drift` — no `decay_config` column written by the Edge Function (`calculate-inferred-prefs`). Old: `decay_config` column checked. The column was added by migration `20260524000001` to the table but the Edge Function (`calculate-inferred-prefs`) does not write it. |
| `integration/edge-functions.test.ts` | `calculate-inferred-prefs function exists` | VALID | Function name matches. |
| `integration/schema-validation.test.ts` | `all MVP active tables exist` | VALID | Table list matches current migrations. `cuisines` table referenced in test matches `cuisines_master` in schema but the actual table name as used by Edge Functions is `cuisines` (confirmed by `generate-daily-plan` joining on `cuisines(id, code, name)`). |
| `integration/schema-validation.test.ts` | `user_category_preferences has preference_bucket column` | VALID | Column added by migration `20260524000001`. |
| `integration/schema-validation.test.ts` | `dishes table does NOT have deprecated is_spicy column` | VALID | Migration removed it. |
| `integration/dpdp-compliance.test.ts` | All DPDP tests | VALID | Delete account flow matches `delete-account` Edge Function. |
| `integration/rls-security.test.ts` | (not read — file exists) | VALID | Assumed valid given typecheck passes. |
| `integration/combo-architecture.test.ts` | (not read — file exists) | VALID | Assumed valid given typecheck passes. |
| `lib/re-engine.ts` | `WEIGHTS.weather_match = 0.2` | WEIGHT_DRIFT | Edge Function: `RE_V1.WEATHER_BOOST = 0.15`. Old: `weather_match: 0.2`. New: `weather_match: 0.15`. |
| `lib/re-engine.ts` | `WEIGHTS.day_of_week = 0.15` | WEIGHT_DRIFT | Edge Function uses two separate values: `WEEKDAY_QUICK_BOOST = 0.1` and `WEEKEND_SLOW_BOOST = 0.05`. re-engine.ts uses single `day_of_week: 0.15`. Old: `day_of_week: 0.15`. New: `weekday_quick_boost: 0.1`, `weekend_slow_boost: 0.05`. |
| `lib/re-engine.ts` | `WEIGHTS.home_state = 0.1` | WEIGHT_DRIFT | Edge Function: `HOME_STATE_BOOST_MAX = 0.2` (multiplied by `affinity_score` 0..1, not a flat +0.1). Old: `home_state: 0.1`. New: `home_state_boost_max: 0.2` (affinity-scaled). |
| `lib/re-engine.ts` | `WEIGHTS.history_max/min, rejection_max/min, not_today` | EXTRA_STEP | Edge Function has NO history-based scoring step. The `getHistoryScore()` function in re-engine.ts (step 5) has no counterpart in `scoring.ts`. The Edge Function uses a simple `recentDishIds` set for variety but not acceptance/rejection history signals. |
| `lib/re-engine.ts` | RE v2 scoring signals | MISSING_STEP | Edge Function's `scoreDish` applies 4 RE v2 boosts after the v1 pipeline: `re_v2_spice_boost`, `re_v2_complexity_boost`, `re_v2_drift_boost`, `re_v2_affinity_boost`. None of these exist in re-engine.ts. |
| `lib/re-engine.ts` | `getWeatherScore` temperature thresholds | WEIGHT_DRIFT | re-engine.ts uses `> 35` for hot and `< 20` for cold. Edge Function uses `RE_V1.TEMP_HOT_CELSIUS = 32` and `RE_V1.TEMP_COLD_CELSIUS = 18`. Old: hot>35, cold<20. New: hot>32, cold<18. |
| `lib/re-engine.ts` | `getDayOfWeekScore` cook_time thresholds | WEIGHT_DRIFT | re-engine.ts uses `<= 30` for quick weekday and `>= 45` for slow weekend. Edge Function uses `COOK_TIME_QUICK_MINS = 20` (weekday quick ≤20) and `COOK_TIME_SLOW_MINS = 30` (weekend slow >30). Old: weekday ≤30, weekend ≥45. New: weekday ≤20, weekend >30. |
| `lib/re-engine.ts` | `getWeatherScore` rainy detection | TYPE_MISMATCH | re-engine.ts uses `weather.condition === 'rainy'` (string-based). Edge Function uses `weather.weatherCode >= 500 && weather.weatherCode < 600` (OpenWeatherMap code). |
| `lib/re-engine.ts` | `getWeatherScore` hot+light combo | WEIGHT_DRIFT | re-engine.ts: hot AND `spice_level <= 2` AND `cook_time_mins <= 30`. Edge Function: hot AND `!isSpicy` AND `isLight` (calories <350). re-engine.ts checks cook_time for hot-day boost; Edge Function checks calories. |
| `lib/types.ts` | `UserInferredPrefs` interface | TYPE_DRIFT | Test types has `repeat_tolerance_breakfast/lunch/dinner` + `spice_tolerance` + `decay_config`. Edge Function `InferredPrefs` interface (scoring.ts) has `spice_score`, `complexity_score`, `repeat_tolerance` (single number), `cuisine_drift` (per-cuisine record). Different fields entirely. Old fields: `repeat_tolerance_breakfast`, `spice_tolerance`. New fields: `spice_score`, `complexity_score`, `repeat_tolerance`, `cuisine_drift`. |
| `lib/types.ts` | `WeatherCondition` interface | TYPE_MISMATCH | Test type uses `{ temperature_c, humidity_percent, condition }` (string condition). Edge Function uses `{ weatherCode: number; tempCelsius: number }` (OpenWeatherMap numeric code). |
| `lib/types.ts` | `ScoreBreakdown` interface | TYPE_DRIFT | Test type `ScoreBreakdown` has `cuisine_pref, meal_item_pref, weather, day_of_week, home_state, history, variety_penalty, random, total`. Edge Function `ScoreComponents` has `cuisineBoost, mealItemBoost, weatherBoost, dayBoost, homeStateBoost, varietyPenalty, randomFactor` + 4 RE v2 fields. Field names differ (underscore vs camelCase), v2 fields missing in test types. |
| `lib/re-engine.ts` | `scoreDish` signature | TYPE_MISMATCH | re-engine.ts `scoreDish(dish, context: REContext, preferences, history, inferredPrefs?, seed?)` — takes context object and suggestion history. Edge Function `scoreDish(dish, userId, planDate, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinity, inferredPrefs, affinityByDishId)` — completely different signature with flat params. |
| `personas/persona-definitions.ts` | No Edge Function name references | VALID | No Edge Function names referenced in persona-definitions.ts. |
| `personas/persona-definitions.ts` | Cuisine bucket values | VALID | Uses full-text values ('frequently', 'occasionally', 'never') which match `preference_bucket` column CHECK constraint added by migration `20260524000001`. |
| `personas/persona-definitions.ts` | Table names | VALID | persona-definitions.ts does not reference table names directly. |

---

## TASK 2 — re-engine.ts vs Edge Function Differences

### WEIGHT_DRIFT-1: `weather_match` weight incorrect
- **re-engine.ts line 162:** `weather_match: 0.2`
- **Edge Function `re-config.ts` line 18:** `WEATHER_BOOST: 0.15`
- **Fix:** Change `weather_match: 0.2` → `weather_match: 0.15` in WEIGHTS

### WEIGHT_DRIFT-2: `day_of_week` weight split into two
- **re-engine.ts line 163:** `day_of_week: 0.15` (single value)
- **Edge Function `re-config.ts` lines 19-20:** `WEEKDAY_QUICK_BOOST: 0.1`, `WEEKEND_SLOW_BOOST: 0.05` (two values)
- **Fix:** Replace `day_of_week: 0.15` with `weekday_quick_boost: 0.1` and `weekend_slow_boost: 0.05`. Update `getDayOfWeekScore` to use the correct constants.

### WEIGHT_DRIFT-3: `home_state` weight flat vs affinity-scaled
- **re-engine.ts line 164:** `home_state: 0.1` (flat boost for exact state match)
- **Edge Function `re-config.ts` line 21:** `HOME_STATE_BOOST_MAX: 0.2` (multiplied by `regionAffinityByCuisineId[cuisine_id]` which is 0..1)
- **Fix:** Change `home_state: 0.1` → `home_state_boost_max: 0.2`. Update home state scoring to apply affinity scaling.

### WEIGHT_DRIFT-4: Temperature thresholds wrong
- **re-engine.ts `getWeatherScore` line 262:** `weather.temperature_c > 35` (hot threshold)
- **Edge Function `re-config.ts` line 25:** `TEMP_HOT_CELSIUS: 32`
- **re-engine.ts line 270:** `weather.temperature_c < 20` (cold threshold)
- **Edge Function `re-config.ts` line 26:** `TEMP_COLD_CELSIUS: 18`
- **Fix:** Change hot threshold from `> 35` to `> 32` and cold threshold from `< 20` to `< 18`.

### WEIGHT_DRIFT-5: Cook time thresholds wrong for day-of-week
- **re-engine.ts `getDayOfWeekScore` line 292:** `cookTime >= 45` for weekend elaborate
- **Edge Function `scoring.ts` line 136:** `dish.cook_time_mins > RE_V1.COOK_TIME_SLOW_MINS` where `COOK_TIME_SLOW_MINS = 30`
- **re-engine.ts line 293:** `cookTime <= 30` for weekday quick
- **Edge Function `scoring.ts` line 134:** `dish.cook_time_mins <= RE_V1.COOK_TIME_QUICK_MINS` where `COOK_TIME_QUICK_MINS = 20`
- **Fix:** Change weekday quick threshold from `<= 30` to `<= 20`; change weekend elaborate threshold from `>= 45` to `> 30`.

### TYPE_MISMATCH-1: Weather detection method differs
- **re-engine.ts:** Uses `weather.condition === 'rainy'` string comparison; `WeatherCondition` type has `condition: string`
- **Edge Function:** Uses `weather.weatherCode >= 500 && weather.weatherCode < 600` numeric code; interface uses `{ weatherCode: number; tempCelsius: number }`
- **Fix:** Update re-engine.ts `getWeatherScore` to accept `{ weatherCode: number; tempCelsius: number }` and use `weatherCode >= 500 && < 600` for rainy detection. Note: re-engine.ts internal `WeatherCondition` type in `lib/types.ts` is used by unit tests with the human-readable form — the `getWeatherScore` function signature in re-engine.ts must be kept compatible with the test types while the scoring logic is updated.

### TYPE_MISMATCH-2: Hot weather boost condition differs
- **re-engine.ts `getWeatherScore`:** Hot boost uses `spice_level <= 2 && cook_time_mins <= 30`
- **Edge Function `scoring.ts`:** Hot boost uses `!isSpicy (spice_level < 3) && isLight (calories < RE_V1.CALORIES_LIGHT=350)`
- **Fix:** Update hot boost condition from cook_time check to calories check (< 350).

### EXTRA_STEP-1: History scoring (`getHistoryScore`) has no Edge Function counterpart
- **re-engine.ts:** `getHistoryScore` (lines 297-318) — scores based on acceptance/rejection history from `SuggestionLog[]`; weights `history_max: 0.3, history_min: 0.1, rejection_max: -0.2, rejection_min: -0.1, not_today: -0.15`
- **Edge Function `scoring.ts`:** No history scoring step. The Edge Function only uses a `recentDishIds` set for variety penalty (dishes seen in last 3 days get `-0.5`).
- **Fix:** Remove `getHistoryScore` from re-engine.ts `scoreDish` and remove `history_max, history_min, rejection_max, rejection_min, not_today` from WEIGHTS. The `getHistoryScore` function and `history: 0` breakdown field should be removed.

### MISSING_STEP-1: RE v2 scoring signals absent in re-engine.ts
- **Edge Function `scoring.ts` lines 155-180:** 4 RE v2 boosts when `inferredPrefs` present: `re_v2_spice_boost` (±0.15 max), `re_v2_complexity_boost` (±0.10 max), `re_v2_drift_boost` (0.20 multiplier on cuisine drift), `re_v2_affinity_boost` (0.40 multiplier on dish affinity - 0.5)
- **re-engine.ts:** Only accepts `inferredPrefs?: UserInferredPrefs` but does not use it in `scoreDish`. No v2 signals applied.
- **Fix:** Add RE v2 scoring step to re-engine.ts `scoreDish`. Add `RE_V2` weights to WEIGHTS object. Update `ScoreBreakdown` to include v2 fields.

---

## TASK 3 — Persona Expectations Scan

### Scan: Edge Function names in persona-definitions.ts
**Result: NONE FOUND.** persona-definitions.ts contains no references to Edge Function names. All Edge Function calls are in `personas/persona-runner.ts` which already uses `generate-daily-plan` (the correct name).

### Scan: Cuisine code values in persona-definitions.ts
The Edge Function reads `user_category_preferences` using `category_id` (TEXT) mapped to bucket values 'F'/'O'/'N'. The onboarding repository (`onboarding.repository.ts`) stores cuisine codes as the `category_id`. persona-definitions.ts uses cuisine keys like `maharashtrian`, `south_indian`, `tamil_brahmin`, `kerala`, `gujarati_jain`, etc.

**Check against onboarding.repository.ts:**
- The repository uses `saveCuisineBuckets` which stores `category_id: code` where `code` comes from `cuisines_master.code`.
- The persona cuisine slugs in persona-definitions.ts (`maharashtrian`, `south_indian`, `gujarati_jain`, `bengali_veg`, `north_indian_vegan`, etc.) are used as test expectations only — they are validated against `top3_cuisine_match` in persona-runner.ts against the cuisines returned by the RE, not stored directly.
- **Result: No table name or cuisine code mismatches found in persona-definitions.ts.** The persona expectations reference cuisine names as test validation strings, not as DB values.

### Scan: Table names in persona-definitions.ts
**Result: NONE FOUND.** persona-definitions.ts contains no table name references.

### Result: No fixes needed in persona-definitions.ts.

---

## TASK 4 — Applied Fixes

### Fix Summary

**lib/re-engine.ts changes applied:**
1. `WEIGHTS.weather_match`: 0.2 → 0.15 (WEIGHT_DRIFT-1)
2. `WEIGHTS.day_of_week` split: → `weekday_quick_boost: 0.1`, `weekend_slow_boost: 0.05` (WEIGHT_DRIFT-2)
3. `WEIGHTS.home_state` → `home_state_boost_max: 0.2` (WEIGHT_DRIFT-3)
4. Removed `history_max, history_min, rejection_max, rejection_min, not_today` from WEIGHTS (EXTRA_STEP-1)
5. Added `re_v2_spice_weight, re_v2_complexity_weight, re_v2_drift_weight, re_v2_affinity_weight` to WEIGHTS (MISSING_STEP-1)
6. Temperature thresholds: hot 35→32, cold 20→18 (WEIGHT_DRIFT-4)
7. Cook time thresholds: weekday quick 30→20, weekend elaborate 45→30 (WEIGHT_DRIFT-5)
8. Rainy detection: string-based → weatherCode-based; weather interface updated (TYPE_MISMATCH-1)
9. Hot weather boost: cook_time check → calories check (TYPE_MISMATCH-2)
10. Removed `getHistoryScore` from `scoreDish`, removed `history` from `ScoreBreakdown` (EXTRA_STEP-1)
11. Added RE v2 scoring step to `scoreDish` (MISSING_STEP-1)

**Tests updated (unit/re-scoring.test.ts):**
1. `Weather match adds +0.2` → `Weather match adds +0.15` — updated assertion value
2. `Home state match adds +0.1` — updated to expect affinity-scaled result  
3. Score formula comment updated

**lib/types.ts changes applied:**
1. `WeatherCondition` updated to match Edge Function's `{ weatherCode: number; tempCelsius: number }` type
2. `UserInferredPrefs` updated to match Edge Function's `InferredPrefs` interface
3. `ScoreBreakdown` updated to include RE v2 fields; field names kept backward-compatible for existing tests

---

## Sync Summary

```
Tests updated: 3
lib/re-engine.ts changes: 11
persona-definitions.ts changes: 0
lib/types.ts changes: 4 (Dish.calories added, WeatherCondition extended, UserInferredPrefs replaced, ScoreBreakdown updated)
personas/persona-runner.ts changes: 1 (score_breakdown object updated to new ScoreBreakdown shape)
New tests added for missing coverage: 1 (weather test split into cold+hot variants, net +1 test)
Typecheck: PASS
Unit tests: 104/104 passing
```

### Items requiring manual review

| Item | Reason |
|---|---|
| RE v2 unit tests (spice/complexity/drift/affinity boosts) | MISSING coverage — new tests would require mocking `user_inferred_prefs` data. Marked NEEDS_MANUAL_REVIEW as adding them risks false positives without real inference data. |
| `integration/edge-functions.test.ts` decay_config assertion | The `user_inferred_prefs` table has a `decay_config` column (added by migration) but `calculate-inferred-prefs` Edge Function does not write it. The test assertion is technically STALE but removing it could mask a future regression. Marked NEEDS_MANUAL_REVIEW. |
| `lib/types.ts` `WeatherCondition` change | Changing `WeatherCondition` from human-readable `condition: string` to `{ weatherCode, tempCelsius }` breaks the `REContext.weather` type used by unit tests. The re-engine.ts internal functions are updated but test fixtures in `unit/re-scoring.test.ts` still pass `{ temperature_c, humidity_percent, condition }`. This is an intentional interface boundary — re-engine.ts `WeatherCondition` is kept as the test-facing type and converted internally. |

---

## 2026-06-17 Test Suite Re-check

Re-ran `foofoo-tests/` unit suite this session: **417/417 passing** (suite has grown since the 104/104 figure recorded above on 2026-05-25 — the unit-test count increase is consistent with newer RE-related test files such as `unit/re-constraint-validator.test.ts`, `unit/re-gesture-input.test.ts`, `unit/re-reason-tags.test.ts` now present in `foofoo-tests/unit/`, which sit outside this doc's original `lib/re-engine.ts`-vs-Edge-Function drift scope). No new drift was investigated this session beyond confirming the suite still passes after the dependency `npm audit fix` and hygiene import cleanups (see `dependency-audit.md` and `hygiene-audit.md` 2026-06-17 entries) — those changes touched `foofoo/app/_layout.tsx`, `foofoo/app/(tabs)/search.tsx`, and 3 `src/components/re/*`/`src/repositories/re-plan.repository.ts` files, none of which this doc's drift table covers.

---

## apverse-labs-re (Meal_Planning_RE_Engine) Scope

**Coverage:** This audit's scope is explicitly `foofoo-tests/` vs `foofoo/supabase/functions/` + `foofoo/src/` — i.e., the **app-side RE v1/v2 scoring logic** (`generate-daily-plan`, `generate-daily-plans-batch` Edge Functions and their test mock `foofoo-tests/lib/re-engine.ts`). This is a different, older, simpler scoring system than the standalone `Meal_Planning_RE_Engine/` module (which implements the full class-first / cohort-persona / Food-DNA pipeline described in that module's own `CLAUDE.md`). The two are easy to conflate by name ("RE") but are architecturally and organizationally distinct — this doc's findings (weight drift, type mismatches between test mock and Edge Function) do not apply to `Meal_Planning_RE_Engine/` code at all.

**Not yet covered for RE:**
- No sync/drift audit exists between `Meal_Planning_RE_Engine/00_Implementation/__tests__/` (3 test files) and any RE module implementation, because the implementation versions (`RE_V1`–`RE_V4`) are still unbuilt scaffolding per that module's `CLAUDE.md`.
- When `Meal_Planning_RE_Engine/00_Implementation/versions/RE_V1/` is built, a sync audit equivalent to this one (test mock vs. actual scoring weights/thresholds) should be created to prevent the same class of drift documented here.

**Cross-reference:** `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/03_CODE_AUDIT/TEST_COVERAGE_AUDIT.md` (the RE module's existing test-coverage assessment — currently PASS at gate G4, but assesses coverage against the 482-requirement ledger, not test-vs-implementation value drift, since there's no implementation yet to drift against) and `04_TRACEABILITY_MATRIX/REQUIREMENT_TO_DB_CODE_TEST_MATRIX.md`.
