# CANONICAL_ALGORITHM_LEDGER

Expected end-to-end flow assembled from algorithm-bearing DOCX. Stage letters per recovery prompt 2.3.

## A. Onboarding -> household profile
### DOC-10
- **5. Recommended Screen Flow**
  - If the user selects family with kids, ask age-band chips for infant/toddler/school child/teen. If the user selects family with elders, ask soft/digestive/diabetic follow-ups. If the user selects special health/life stage, ask pregnancy/post
- **7. Output Contract**
  - onboarding_result = {  "main_cohort_id": "MC_FAMILY",  "sub_cohort_id": "SC_COUPLE_WITH_INFANT",  "home_state": "Madhya Pradesh",  "current_city": "Mumbai",  "diet_mode": "vegetarian",  "member_segments": ["INFANT", "DIABETIC_ELDER"],  "coo
  - Onboarding can be completed quickly while still producing a valid household profile.
  - Every answer maps to a known backend field in DOC-11.
  - Skipped answers have defined fallback behavior in DOC-20.

### DOC-20
- **7. Confidence Score Use**
  - Every generated plan should include an internal confidence score. Low-confidence users should receive more familiar defaults and more opportunities to swipe/adjust. High-confidence users can receive more specific regional and persona-tailor
  - Minimal onboarding still yields a valid weekly class plan.
  - Low-confidence assumptions are conservative and easy to correct through swipes.
  - Diet hard constraints are not guessed.

## B. Profile -> cohort/persona + overlays
### DOC-03
- **8. Implementation Output**
  - persona_assignment = {  "main_cohort_id": "MC_FAMILY",  "sub_cohort_id": "SC_COUPLE_WITH_INFANT",  "base_persona_id": "P_COUPLE_WITH_INFANT",  "overlay_persona_ids": ["O_DIABETIC_ELDER"],  "confidence": 0.86,  "routing_trace": ["main_cohort
  - User is never shown a long backend persona list.
  - Every detailed persona used by the engine can be traced to onboarding answers.
  - Overlapping personas are supported through overlays rather than duplicate persona explosion.

## C. Persona -> weekly class plan
### DOC-13
- **4. Algorithm Overview**
  - Build or load household profile.
  - Apply hard constraints.
  - Assign persona and overlays.
  - Find cohort rows in Cohort_Matrix_v3.
  - Load weekly class plan rows from Weekly_Class_Plan_v3.
  - Apply state profile and current city migration overlay.
  - Apply cook capability and time pressure adjustments.
  - Apply weekday/weekend cadence.
  - Validate class rotation and variety.
  - Generate add-on component plan for member segments.
  - Expand classes to dish candidates.
  - Return class-first plan plus ranked dishes and explanation tags.
- **5. Decision Hierarchy**
- **6. Pseudocode**
  - def generate_weekly_class_plan(profile):    constraints = resolve_constraints(profile)    persona = assign_persona(profile)    cohort = find_best_cohort(profile, persona)    base_plan = load_weekly_plan(cohort.cohort_id)    plan = apply_sta
- **7. Failure Handling**
- **8. Output Shape**
  - week_plan_day = {  "date": "2026-06-15",  "day_of_week": "Monday",  "breakfast": {"primary_class_code": "BF_LIGHT_GRAIN", "dish_candidates": [...]},  "lunch": {"primary_class_code": "LUNCH_DAL_SABZI_ROTI", "dish_candidates": [...]},  "snack
  - Algorithm is deterministic with fixed seed.
  - Plan can be generated even with minimal profile.
  - All output classes exist in DOC-05/DOC-12.
  - All add-ons are separate from primary meals.

### DOC-14
- **8. Validation Algorithm**
  - Count primary class occurrences by slot and week.
  - Count heavy classes per day.
  - Check consecutive heavy meals.
  - Check weekend special allocation.
  - Check state/city overlay representation.
  - Check add-on presence for required member segments.
  - If violation occurs, replace using secondary/tertiary class or safe fallback.
  - Weekly plan feels realistic, not random.
  - Class repetition is allowed when behaviorally normal but controlled.
  - Weekend meals differ from weekdays in appropriate cohorts.

## D. Weekly plan -> member add-ons
## E. Class -> dish candidates + scoring
### DOC-19
- **5. Score Components**
- **6. Hard Filter Before Score**
  - Diet compatibility
  - Allergy compatibility
  - Jain/vegan/fasting compatibility
  - Never list
  - Meal slot eligibility
  - Add-on target-member safety
- **7. Formula**
  - final_score = base_score + class_affinity + regional_affinity + city_overlay + day_slot_fit + cook_fit + food_dna_match + history_modifier + variety_modifier + random_factor
  - Do not score dishes from classes not selected for that slot unless used as fallback.
  - Do not let randomization override hard constraints.
  - Do not over-boost aspirational onboarding dish likes without behavior.
  - Do not collapse class affinity and cuisine affinity into the same thing.
  - Dish rankings come only after class selection.
  - Scoring is explainable with component breakdown.
  - Revealed behavior can gradually override onboarding priors.

## F. Feedback loop
### DOC-21
- **7. Update Frequency**
  - Real-time actions like Never and Not Today should affect the current session immediately. Aggregate preference vectors can update daily or weekly using decayed history. Mature personalization should use last 30/60/90-day windows depending o
- **8. Pseudocode**
  - def process_feedback(event):    if event.type == "NEVER": hard_exclude(event.dish_id)    elif event.type == "NOT_TODAY": add_temp_cooldown(event.dish_id, days=3)    else:        update_class_affinity(event.meal_class_code, event.weight)    
  - Learning updates class-level preferences, not only dish-level likes.
  - Not Today and Never behave differently.
  - Revealed behavior can correct aspirational onboarding.

## G. API contract
### DOC-23
- **7. Generate Week Plan Response**
  - {  "plan_id": "wp_123",  "profile_confidence": 0.86,  "days": [    {      "date": "2026-06-15",      "day_of_week": "Monday",      "meals": {        "breakfast": {          "primary_class_code": "BF_LIGHT_GRAIN",          "dish_candidates":
  - Endpoints support class-first plan generation and dish ranking.
  - Responses include enough traceability for debugging.
  - Validation errors are explicit and do not silently break constraints.
