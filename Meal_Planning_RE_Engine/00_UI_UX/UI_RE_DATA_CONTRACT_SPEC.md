# UI ↔ RE DATA CONTRACT SPEC
### Foofoo — the binding contract between UI and the class-first RE

> Binds onboarding / home / weekly UI to the real RE backend. Grounded in DOC-11/13/19/21/23 + the UX/
> component specs + the actual repositories, types, and `re_*` tables. **No UI implemented here.**

**Transport reality:** Foofoo is **client-direct-to-Supabase** (no REST server). DOC-23's REST paths are
realized as **repository/service functions** — both shown below. The app calls only `src/services/re-engine.service.ts`
(resolver) + `src/repositories/re-*.ts`; never a specific engine version, never raw SQL in components.

**Identity mapping:** the spec's `household_id` == `re_user_household_profiles.profile_id` == `profiles.id`
(auth UID). There is one household profile per user; noted explicitly so all events key consistently.

### ⚠️ Three contract fields that need additive backend support (flagged, not faked)
| Field | Status | Recommended fix (additive only) |
|---|---|---|
| `generation_run_id` | In DOC-23 + requested; **not a column** on `re_user_weekly_plans` / `re_user_feedback` today | add `generation_run_id UUID` to both (stamp per `generateWeeklyPlan` run); migration Up+Down + register |
| **lock state** | Requested (home/weekly); **no column** (only `re_user_dish_affinity.lock_count`) | add `locked BOOLEAN` per slot on `re_user_weekly_plans` (+ `re_user_addon_plans`), or a `re_user_plan_locks` table |
| **component score breakdown** | DOC-19 defines components; `computeDishScore` returns a **scalar** | have the scorer return a `{component: value}` map (debug/why-this); pure-fn change, unit-testable |
Until these land: `generation_run_id` is null/derived from `(profile_id, plan_week_start, generated_at)`; lock is client-session; score breakdown shows top-signal only. UI must handle their absence gracefully.

---

## A. Onboarding Input Contract (per screen)

> Columns: UI field · component · allowed values · backend field · profile feature · persona/cohort impact ·
> class-affinity · add-on · hard-constraint · confidence · API (repo fn / DOC-23 path) · validation.

| Screen / field | Component | Allowed values | Backend field | Persona/cohort | Class-aff | Add-on | Hard constraint | Conf | API (repo fn) | Validation |
|---|---|---|---|---|---|---|---|---|---|---|
| **OB-01 main cohort** | REQuestionCard + card stack | MC1–MC5 | `re_user_household_profiles.main_cohort_id` | base persona path | — | — | — | +base 0.70 | `saveREMainCohort` (`POST /personas/assign` partial) | required, ∈ {MC1..MC5} |
| **OB-01 sub-cohort** | chips (bottom sheet) | SC* for chosen MC (`re_subcohorts`) | `sub_cohort_id`, derived `persona_id` | base persona | — | maybe | — | +0 | `saveRESubcohort` | ∈ sub-cohorts of MC; persona resolved server-side |
| **OB-03 members** | REMemberChip loop | segment enum (+ age band) | `household_members[]` | — | — | **yes** | — | +0.06/member | `saveREHouseholdMembers` | segment ∈ enum; array (0..n) |
| **OB-04 home_state** | RELocationSelect(home) | 36 `re_states` | `profiles.home_state` → state_id | cohort_id state part | seeds region | — | — | +0.05 | `saveRELocation` (`POST /profiles/household`) | ∈ re_states or free-text-flagged |
| **OB-05 current_city** | RELocationSelect(city) | destination groups | `current_city`→`city_destination_group`,`city_tier`,`migration_overlay` | cohort_id tier; **P28 if migrated** | seeds city | — | — | +0.05 | `saveRELocation`; resolved in `runCohortAssignment` | maps to a group; unknown→PG-hostel |
| **OB-06 diet** | REDietSelect | veg/vegan/jain/egg/nonveg | `food_pref`, `nonveg_mode` | — | — | — | **YES (diet)** | +0.10 | `saveREDietPrefs`+`saveREContractExtras` | required for dish expansion (`MISSING_DIET_MODE` else) |
| **OB-06 egg** | toggle | bool | `egg_allowed` | — | — | — | YES | — | `saveREContractExtras` | bool |
| **OB-06 fasting** | chips | none/weekly/seasonal | `fasting_pattern` | — | — | — | YES (fasting) | — | `saveREContractExtras` | ∈ enum |
| **OB-06 allergies** | chip + search | ingredient IDs | `user_diet_rules.excluded_ingredients[]` | — | — | — | **YES (allergy)** | — | `saveREDietPrefs` | **integer IDs only** |
| **OB-06 nonveg cadence** | follow-up | meals/wk + proteins | `nonveg_meals_per_week`,`preferred_protein_types` | — | — | — | — | — | `saveREDietPrefs` | int 0–21; protein ∈ enum |
| **OB-07 cook** | RECookSelect | self/skilled/needs-steps/tiffin/delivery | `cook_dependency` | **cook overlay P22–25** | — | — | — | +0.04 | `saveRECookDependency` | ∈ enum; default self_cook |
| **OB-08 health** | chips + scope | diabetic/BP/weight/fitness/pregnancy/none | `health_overlay_code`,`health_scope` | **health overlay P15/16/17/18** | — | maybe | scope-dep | +0.08 | `saveREHealthOverlay` (`POST /personas/assign`) | code ∈ enum; scope ∈ {member,household} |
| **OB-09 weekday** | RECookSelect (time) | relaxed/busy/starved | `weekday_time_pressure` | — | nudge quick | — | — | +0.04 | `saveREContractExtras` | ∈ enum; default busy |
| **OB-10 weekend** | chips | special/same/lighter | (→ `class_affinity_vector`) | — | weekend classes | — | — | +0.03 | `saveREClassAffinity` | ∈ enum |
| **OB-11 swipes** | REClassSwipeCard | per-class reaction | `class_affinity_vector` | — | **direct** | — | — | +0.05 | `saveREClassAffinity` | keys ∈ class codes, vals ∈ [-1,1] (`isValidClassAffinityVector`) |
| **OB-12 confirm** | confidence card | — | finalize `confidence`,`routing_trace`,`overlay_persona_ids[]` | resolved | — | — | — | computed | `runCohortAssignment` then `generateWeeklyPlan` (`POST /plans/week/generate`) | profile complete-or-coldstart |

---

## B. Home Page Data Contract (per meal card)

Source: `getTodayView(userId)` (`GET` equivalent). One card per slot.

| Field | Type / source | Availability |
|---|---|---|
| `meal_slot` | 'breakfast'\|'lunch'\|'snack'\|'dinner' | ✅ |
| `day` | day_of_week (today) | ✅ |
| `primary_class` | `REMealClassRef{classCode, display}` (dayPlan slot) | ✅ |
| `selected_dish` | top `REDishCandidate{dishOptionId,dishName,dietType,regionRelevance,score}` | ✅ |
| `candidate_dishes` | `REDishCandidate[]` (ranked, same `meal_class_code`) | ✅ `fetchTodayDishCandidates` |
| `addons` | `REAddonComponent[]{addonClassCode,addonClassName,targetMemberSegment,attachedToPrimaryClass}` | ✅ `fetchTodayAddons` |
| `reason_codes` | top signal + supporting (DOC-19 §8) | ✅ top-signal; ⚠️ full breakdown needs scorer change |
| `score_breakdown` | DOC-19 components map | ⚠️ **scalar today** (see flagged fix) — debug/why-this |
| `lock_state` | locked bool | ⚠️ **no column** — client-session until additive |
| `feedback_state` | from `re_user_dish_affinity` (is_never, not_today_until, affinity) | ✅ |
| `engine_version` | `RETodayView.engineVersion` | ✅ |
| `generation_run_id` | per-run ID | ⚠️ **not persisted** — derive/`null` until additive |

UI invariant: every `candidate_dish.meal_class_code === primary_class.classCode` (no cross-class).

---

## C. Weekly Page Data Contract (per week / day / slot)

Source: `fetchUserWeeklyPlan(userId)` → 7 `re_user_weekly_plans` rows.

| Field | Source | Availability |
|---|---|---|
| `class_plan` (per slot) | `*_class` + `*_display` | ✅ |
| `dish_plan` (per slot) | top candidate via expansion | ✅ on demand |
| `addons` (per day) | `re_user_addon_plans` (`fetchUserAddonPlan`) | ✅ |
| `swap_candidates` | within-class (`re_class_dish_options`) → secondary/tertiary class (`re_weekly_class_plans`) | ✅ (`RESwapSheet`) |
| `lock_state` | locked per slot/day/weekend/add-on | ⚠️ no column — additive |
| `variety_indicators` | DOC-14 (same primary class ≤3×/wk; light-dinner count; weekend-special present) — derived client-side from the 7 rows | ✅ derivable |
| `weekday_weekend` | `weekday_weekend` field | ✅ |
| `nonveg_schedule` | `nonveg_scheduled_slot` | ✅ (protein label ⚠️ name-only) |
| `grocery_metadata` | ingredients per selected dish, aggregated across week | ⚠️ needs dish→ingredient linkage (name-only today) |
| `engine_version` | row `engine_version` | ✅ |
| `cohort_id` | row `cohort_id` (debug only in user UI) | ✅ |

---

## D. Feedback Event Contract

All feedback flows through `submitFeedback(userId, dishOptionId, mealClassCode, signal)` → resolver →
`recordFeedback` → `re_user_feedback` (+ affinity tables). **Canonical event envelope:**

```jsonc
{
  "user_id":            "uuid",            // auth UID
  "household_id":       "uuid",            // == profile_id (same value)
  "engine_version":     "classfirst_v1",   // resolver-stamped
  "generation_run_id":  "uuid|null",       // ⚠️ null until additive column lands
  "day":                "Mon",             // day_of_week
  "meal_slot":          "lunch",
  "meal_class_code":    "LD_DAL_ROTI_SABZI",
  "dish_id":            "dish_option_id|null",
  "add_on_id":          "addon_class_code|null", // present only for add-on events
  "action":             "ACCEPT",          // signal_type
  "timestamp":          "ISO-8601",
  "metadata":           { }                // action-specific (see below)
}
```

| UI action | `action` (signal) | dish/add-on weight | Tables touched | metadata |
|---|---|---|---|---|
| Swipe keep | `ACCEPT` | dish +0.25 / class +0.10 | feedback, dish_affinity, class_affinity | `{carousel_pos}` |
| Swipe not-today | `NOT_TODAY` | −0.30 + 3-day cooldown | feedback, dish_affinity (`not_today_until`) | `{}` |
| Never | `NEVER` | `is_never=true` | feedback, dish_affinity | `{confirmed:true}` |
| Unlock | `NEVER_REMOVE` (or lock-clear) | clears is_never / lock | dish_affinity / lock store | `{}` |
| Lock | `LOCK` | +0.40 / class +0.20 | feedback, dish_affinity (+lock state ⚠️) | `{scope:meal\|day\|weekend\|addon}` |
| Swap | `ACCEPT`(chosen)+`SWIPE_PAST`(skipped) | per signal | feedback, affinities | `{from_dish,to_dish,tier:same\|different\|broader}` |
| View recipe | `TAP_RECIPE` | +0.15 | feedback, dish_affinity | `{}` |
| Add grocery | `ADD_TO_GROCERY` | +0.35 | feedback, dish_affinity | `{}` |
| Accept add-on | `ACCEPT` (add-on) | + | feedback (add_on_id set) | `{segment}` |
| Reject add-on | `SWIPE_PAST` (add-on) | − | feedback (add_on_id set) | `{segment}` |
| Search (add dish) | explicit-intent | strong + (override repeat guard) | feedback | `{query,picked_dish}` — ⚠️ signal type to add (DOC-21 §5) |
| Refresh | n/a (regenerate) | — | re_user_weekly_plans (unlocked only) | `{slots_regenerated, locked_kept}` |

All writes real-time (DOC-21 §7); affinity clamps per DOC-19 (−0.30..+0.40 dish; −0.30..+0.35 class).

---

## E. Dev / Debug Mode (`RETracePanel` — internal builds only, never prod)

Read-only panel exposing the RE internals for verification (the only place raw codes/scores render):

| Panel field | Source |
|---|---|
| Assigned persona (base) | `re_user_household_profiles.persona_id` |
| Overlays | `overlay_persona_ids[]` |
| Cohort id | `cohort_id` (+ state/tier decode) |
| Confidence + routing_trace | `confidence`, `routing_trace` |
| Selected meal class (per slot) | raw `meal_class_code` |
| Dish pool | `re_class_dish_options` for the class (count + IDs) |
| Score breakdown | DOC-19 components per candidate (⚠️ needs scorer to return components) |
| Violated/missing constraints | diet/allergy/Jain/fasting checks; `MISSING_DIET_MODE`/`HARD_CONSTRAINT_BLOCK` flags |
| Source matrix row | `re_weekly_class_plans` plan_day_id for cohort+day |
| Engine version + generation_run_id | resolver / run stamp |

Gated by a build flag; stripped from production bundles; no analytics.

---

## F. Acceptance Criteria

1. **UI cannot create a class/dish mismatch** — every dish payload carries `meal_class_code`; swap pools are class-scoped; candidate set always shares the slot's class (mirrors DB invariant: 0 dishes in >1 class).
2. **UI cannot hide add-ons inside primary meals** — add-ons are a distinct payload (`REAddonComponent`) rendered as secondary sub-cards; never merged into the primary dish field.
3. **UI sends enough feedback for the learning loop** — every interaction emits the §D envelope with dish + class codes, so both dish- and class-level affinity update (DOC-21 §10).
4. **UI can display all API contract fields** — §B/§C cover every DOC-23 response field; the 3 flagged gaps (`generation_run_id`, lock, score breakdown) have a defined additive path and graceful absence handling.
5. **UI supports multiple RE versions** — all reads/writes go through the resolver (`re-engine.service`), which dispatches by `re_engine_version`; `engine_version` is carried on every view and event; no component imports a version.

---

*This contract is binding: any RE UI component must source data from §A–C, emit §D envelopes, and uphold §F.
The 3 flagged fields are the only additive backend work the UI layer requires; everything else is available today.*
