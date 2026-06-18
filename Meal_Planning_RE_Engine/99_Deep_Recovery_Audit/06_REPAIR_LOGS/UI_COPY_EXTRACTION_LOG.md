# UI Copy Extraction Log

Date: 2026-06-19
Branch: apverse-labs-RE
DB: foofoo-staging (kwypxyqxojauhiehuirz)

## Source: re_main_cohorts.subcohort_screen_copy

| main_cohort_id | main_cohort_label | subcohort_screen_copy |
|---|---|---|
| MC1 | Just me / shared adult household | Show 5-6 sub-options: student/hostel, young professional, working woman alone, flatmates, migrant adult, desk/fitness adult |
| MC2 | Couple household | Show DINK, newly married, mixed-state, planning pregnancy, pregnant household, infant/baby household |
| MC3 | Family with children | Show toddler, school kid, teen, picky eater, family budget, homemaker elaborate |
| MC4 | Joint / elders / care household | Show joint family, elderly couple, recovery light, elder+child, diabetic/BP member |
| MC5 | Special goal or kitchen operating mode | Show health, gym/protein, vegetarian protein, Jain, fasting, skilled cook, cook-needs-instruction, maid-dependent, regular nonveg |

## Source: re_routing_rules — user_prompt_summary + why_it_matters

| rule_id | shown_when | user_prompt_summary | why_it_matters |
|---|---|---|---|
| R01 | Always | Select one of 5: Just me, Couple, Family with children, Joint/elders, Special goal/kitchen mode | Narrows to 5-16 sub options without showing 41 personas. |
| R02 | After main cohort | Show only sub-cohorts under selected main cohort; e.g., Family with children -> toddler/school kid/teen/picky child/budget/homemaker. | Maps to base persona_id. |
| R03 | If baby/infant/child/elder/pregnant/postpartum/recovery selected | Ask "Do they need a separate soft/mild/extra component?" default yes. | Creates add-on component plan, not main meal class. |
| R04 | If health selected OR family member has diabetes/BP/weight goal | Ask "Is this for everyone or only one member?" | If one member, use swap/add-on; if whole household, health classes can enter main rotation. |
| R05 | After household/care | Self-cook, skilled cook, cook needs instructions, maid/helper, tiffin/PG, delivery-heavy. | Adjusts complexity, prep batching, instruction detail. |
| R06 | Always | Veg, egg, nonveg, Jain, vegan, allergies; for nonveg ask weekly frequency + proteins eaten. | Sets hard constraints and weekly protein schedule. |
| R07 | Always | Where are you from and where do you live now? | Blends home-state signature with current city lifestyle overlay. |
| R08 | Optional after 3-5 swipes | Swipe meal classes, not dishes: Simple sabzi, dal-rice, paratha, egg breakfast, fish curry rice, etc. | Captures revealed class preference quickly. |

## Source: re_subcohorts — show_as_chip_text + ask_next

| sub_cohort_id | sub_cohort_label | show_as_chip_text | ask_next |
|---|---|---|---|
| SC1A | student_hostel_budget | Solo student/hostel budget | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC1B | solo_young_professional | Solo young professional | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC1C | working_woman_alone | Working woman living alone | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC1D | flatmates_shared_kitchen | Flatmates shared kitchen | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC1E | migrant_adult_home_state | Migrant in metro preserving home-state food | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC1F | desk_job_sedentary | Desk-job sedentary | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2A | dink_couple | DINK couple no children | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2B | newly_married_mixed_state | Newly married mixed-state couple | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2C | planning_pregnancy | Couple planning pregnancy | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2D | pregnant_household | Pregnant woman | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2E | couple_with_infant_0_6m | Couple with infant 0-6 months | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2F | couple_with_baby_6_18m | Couple with baby 6-18 months | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC2G | interstate_couple_mixed_cuisine | Inter-state couple / mixed cuisine | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3A | family_with_toddler | Nuclear with toddler | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3B | family_with_school_kids | Nuclear with school kids | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3C | family_with_teenagers | Family with teenagers | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3D | child_picky_eater | Child picky eater | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3E | budget_family | Budget/value-conscious | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC3F | homemaker_elaborate_family | Home-maker elaborate cooking | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4A | joint_multigeneration | Joint/multi-generation | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4B | elderly_couple | Elderly couple | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4C | recovery_senior_light | Recovery/senior digestive light | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4D | diabetic_low_gi_household | Diabetic / low-GI | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4E | bp_heart_conscious | Hypertension / heart conscious | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC4F | child_plus_diabetic_elder_overlap | Composite: child + diabetic/elderly member | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5A | weight_loss_calorie_conscious | Weight loss / calorie conscious | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5B | gym_high_protein | Gym/high-protein nonveg or egg-friendly | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5C | vegetarian_protein | Vegetarian protein seeker | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5D | strict_jain | Strict Jain | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5E | fasting_ritual | Fasting/ritual observant | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5F | cook_assisted_skilled | Cook-assisted: skilled cook | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5G | cook_needs_instruction | Cook-assisted: needs constant instruction | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5H | working_woman_managing_cook | Working woman managing cook + office | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5I | maid_dependent_batch_cook | Maid-dependent minimal cooking / batch cook | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5J | premium_experimental_foodie | Premium experimental foodie | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5K | regular_nonveg_household | Regular non-veg | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5L | eggitarian_low_meat | Eggitarian / low-meat | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5M | seafood_coastal_nonveg | Seafood/coastal non-veg | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5N | sunday_mutton_nonveg | Mutton/Sunday special non-veg | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5O | home_veg_outside_nonveg | Vegetarian home, occasional outside non-veg | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |
| SC5P | field_work_heavy_breakfast | Field-work heavy breakfast | Ask baby age / dependent / health / cook / nonveg / origin-city overlays as applicable. |

## Action taken (Phase A only)

- Values extracted verbatim to `foofoo/src/config/re-onboarding-content.ts`.
- No data was deleted.
- **The Phase B rename (SCHEMA-RE-020) has NOT been applied.** Step B2's codebase
  search found live references to these exact column names in 4 files:
  - `foofoo/src/repositories/re-onboarding.repository.ts` (selects `subcohort_screen_copy`, `show_as_chip_text`)
  - `foofoo/supabase/functions/re-onboarding-start/index.ts` (selects `subcohort_screen_copy`)
  - `foofoo/app/(re-onboarding)/re-step-3.tsx` (reads `mc.subcohort_screen_copy`, `selected.show_as_chip_text`)
  - `foofoo/src/types/index.ts` (type fields `subcohort_screen_copy`, `show_as_chip_text`)

  Per this prompt's hard rule — "Stop and report before applying migration if any
  code reference search finds usages in 3+ files (escalate to founder for review)" —
  the migration is paused pending founder decision. See the response in-conversation
  for the escalation and options presented.

  Note: `user_prompt_summary`, `why_it_matters`, and `ask_next` had **no** live code
  references found in `foofoo/src/`, `foofoo/app/`, or `foofoo/supabase/` — only
  `subcohort_screen_copy` and `show_as_chip_text` are currently read by the running app.

## Phase B — resolution (2026-06-19)

Founder reviewed the 4-file escalation and chose: update code, then rename.

- `foofoo/src/repositories/re-onboarding.repository.ts` — `fetchREMainCohorts` and
  `fetchRESubcohorts` no longer select `subcohort_screen_copy` / `show_as_chip_text`
  from the DB; they merge the value in from `RE_MAIN_COHORT_SCREEN_COPY` /
  `RE_SUBCOHORT_CHIP_TEXT` (in `re-onboarding-content.ts`) keyed by
  `main_cohort_id` / `sub_cohort_id`. The `REMainCohort`/`RESubcohort` TS shapes are
  unchanged, so `re-step-3.tsx` and `types/index.ts` needed no edits.
- `foofoo/supabase/functions/re-onboarding-start/index.ts` — same pattern, with a
  small duplicated copy map inline (Deno edge functions can't import the RN app's
  TS config file). No live caller of this function was found in the app, but it was
  updated for consistency since the prompt named it as a 3+-file usage.
- `npx tsc --noEmit` → 0 errors after the repository/edge-function changes.
- SCHEMA-RE-020 migration (`20260619_004_rename_ui_copy_columns.sql`) applied to
  foofoo-staging. **Note:** Postgres folds unquoted identifiers to lowercase, so the
  5 renamed columns are actually `..._founderinfoonly` (lowercase), not
  `..._FounderInfoOnly` as literally written in the prompt — verified via
  `information_schema.columns` with `ILIKE '%founderinfoonly%'` (5 rows) and confirmed
  the 5 old names are gone (0 rows). No data deleted.
