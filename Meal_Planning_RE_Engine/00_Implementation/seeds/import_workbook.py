#!/usr/bin/env python3
"""
BUILD-01 Seed Import Script
Reads Indian_Meal_Cohort_Persona_DB_v3.xlsx and generates SQL for all RE seed tables.
Import order follows DOC-22 Import_Order sheet.

Usage:
  python import_workbook.py [--dry-run]

NEVER modifies the source workbook.
"""

import openpyxl
import os
import sys

WORKBOOK_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '../../Meal_Planning_RE_Technical_Docs_v1/09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx'
)

# UT name normalization: app INDIAN_STATES → workbook canonical form
UT_NORMALIZATION = {
    'Andaman and Nicobar Islands': 'Andaman & Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Jammu and Kashmir': 'Jammu & Kashmir',
}


def esc(val):
    """Escape a value for SQL single-quoted string."""
    if val is None:
        return 'NULL'
    s = str(val).replace("'", "''")
    return "'" + s + "'"


def bool_val(val):
    if val is None:
        return 'FALSE'
    if isinstance(val, bool):
        return 'TRUE' if val else 'FALSE'
    s = str(val).strip().upper()
    return 'TRUE' if s in ('Y', 'YES', 'TRUE', '1') else 'FALSE'


def int_val(val):
    if val is None:
        return 'NULL'
    try:
        return str(int(float(val)))
    except (ValueError, TypeError):
        return 'NULL'


def num_val(val):
    if val is None:
        return 'NULL'
    try:
        return str(float(val))
    except (ValueError, TypeError):
        return 'NULL'


def sheet_rows(wb, sheet_name):
    ws = wb[sheet_name]
    data = list(ws.iter_rows(values_only=True))
    if not data:
        return [], []
    headers = [str(h).strip() if h is not None else '' for h in data[0]]
    return headers, [r for r in data[1:] if any(c is not None for c in r)]


def build_insert(table, columns, vals, conflict_col):
    col_str = ',\n  '.join(columns)
    rows_str = ',\n'.join(vals)
    return (
        "INSERT INTO public." + table + " (\n  " + col_str + "\n) VALUES\n" +
        rows_str + "\nON CONFLICT (" + conflict_col + ") DO NOTHING;"
    )


def generate_sql(wb):
    blocks = []

    # ── 1. ENGINE VERSIONS (hardcoded) ──────────────────────────
    blocks.append("""-- 1. re_engine_versions (6 rows hardcoded)
INSERT INTO public.re_engine_versions (version_code, version_label, description, is_active) VALUES
  ('legacy_dish_scoring_v1', 'Legacy dish-scoring V1', 'Existing generate-daily-plan, no class layer, inferred_prefs=false', FALSE),
  ('legacy_dish_scoring_v2', 'Legacy dish-scoring V2', 'Existing generate-daily-plan + inferred_prefs overlay', FALSE),
  ('classfirst_v1', 'Class-first cold-start V1', 'New household/class-first rule-based engine; BUILD-01 to BUILD-04', TRUE),
  ('classfirst_v2', 'Class-first feedback V2', 'History + feedback adaptation; future build', FALSE),
  ('classfirst_v3', 'Class-first cluster V3', 'Cluster-seeded; future build', FALSE),
  ('classfirst_v4', 'Class-first collaborative V4', 'Full collaborative filtering; future build', FALSE)
ON CONFLICT (version_code) DO NOTHING;""")

    # ── 2. STATES ──────────────────────────────────────────────
    _, state_rows = sheet_rows(wb, 'State_Profile_v3')
    vals = []
    for r in state_rows:
        if not r[0]:
            continue
        row_vals = [esc(r[i]) for i in range(15)]
        vals.append('  (' + ','.join(row_vals) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 2. re_states (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_states (\n"
        "  state_id,state_ut,region_archetype,tier1_or_metro_cities,tier2_cities,\n"
        "  nonveg_intensity,primary_staple_base,breakfast_class_pool,\n"
        "  weekday_lunch_class_pool,weekday_dinner_class_pool,weekend_special_class_pool,\n"
        "  snack_class_pool,nonveg_class_pool,behavioral_notes,planning_note\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (state_id) DO NOTHING;"
    )

    # ── 3. CITY MIGRATION OVERLAYS ────────────────────────────
    _, ov_rows = sheet_rows(wb, 'City_Migration_Overlay_v3')
    vals = []
    for r in ov_rows:
        if not r[0]:
            continue
        vals.append(
            '  (' + ','.join([esc(r[0]), esc(r[1]), esc(r[2]),
                               num_val(r[3]), num_val(r[4]), num_val(r[5]),
                               esc(r[6]), esc(r[7]), esc(r[9])]) + ')'
        )
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 3. re_city_migration_overlays (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_city_migration_overlays (\n"
        "  origin_state_ut,destination_group_code,destination_group_name,\n"
        "  home_state_signature_weight,current_city_lifestyle_weight,national_modern_weight,\n"
        "  overlay_meal_classes,planning_rule,v3_usage_note\n"
        ") VALUES\n" + vals_str +
        "\nON CONFLICT (origin_state_ut, destination_group_code) DO NOTHING;"
    )

    # ── 4. MAIN COHORTS ───────────────────────────────────────
    _, mc_rows = sheet_rows(wb, 'Main_Cohort_Hierarchy')
    vals = []
    for r in mc_rows:
        if not r[0]:
            continue
        vals.append('  (' + ','.join([esc(r[i]) for i in range(5)]) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 4. re_main_cohorts (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_main_cohorts "
        "(main_cohort_id,main_cohort_label,user_understands_as,subcohort_screen_copy,routing_notes)\n"
        "VALUES\n" + vals_str + "\nON CONFLICT (main_cohort_id) DO NOTHING;"
    )

    # ── 5. PERSONAS ───────────────────────────────────────────
    _, p_rows = sheet_rows(wb, 'Persona_Master_v3')
    vals = []
    for r in p_rows:
        if not r[0]:
            continue
        # columns: 0=persona_id,1=persona_name,2=age_band,3=household_stage,4=lifecycle_health
        # 5=cook_dependency,6=time_pressure,7=nonveg_mode,8=revealed_behavior_summary
        # 9=bf_boost,10=ld_boost,11=sn_boost,12=dn_boost,13=onboarding_trigger
        # 14=main_cohort_id,15=sub_cohort_id,16=sub_cohort_label
        # 17=can_be_overlay,18=dependent_addon_default,19=health_overlay_default
        # 20=cook_overlay_default,21=recommended_onboarding_path
        can_overlay = bool_val(r[17]) if len(r) > 17 else 'FALSE'
        health_ov = bool_val(r[19]) if len(r) > 19 else 'FALSE'
        cook_ov = bool_val(r[20]) if len(r) > 20 else 'FALSE'
        dep_addon = esc(r[18]) if len(r) > 18 else 'NULL'
        rec_path = esc(r[21]) if len(r) > 21 else 'NULL'
        vals.append(
            '  (' + ','.join([
                esc(r[0]), esc(r[1]), esc(r[14]), esc(r[15]), esc(r[16]),
                esc(r[2]), esc(r[3]), esc(r[4]), esc(r[5]), esc(r[6]),
                esc(r[7]), esc(r[8]), esc(r[9]), esc(r[10]), esc(r[11]),
                esc(r[12]), esc(r[13]), can_overlay, dep_addon,
                health_ov, cook_ov, rec_path
            ]) + ')'
        )
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 5. re_personas (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_personas (\n"
        "  persona_id,persona_name,main_cohort_id,sub_cohort_id,sub_cohort_label,\n"
        "  age_band,household_stage,lifecycle_health,cook_dependency,time_pressure,\n"
        "  nonveg_mode,revealed_behavior_summary,bf_boost_classes,ld_boost_classes,sn_boost_classes,\n"
        "  dn_boost_classes,onboarding_branch_trigger,can_be_overlay,dependent_addon_default,\n"
        "  health_overlay_default,cook_overlay_default,recommended_onboarding_path\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (persona_id) DO NOTHING;"
    )

    # ── 6. SUBCOHORTS ─────────────────────────────────────────
    _, sc_rows = sheet_rows(wb, 'Subcohort_Routing')
    vals = []
    for r in sc_rows:
        if not r[2]:
            continue
        do_not_show = bool_val(r[8]) if len(r) > 8 else 'TRUE'
        vals.append(
            '  (' + ','.join([esc(r[2]), esc(r[3]), esc(r[0]),
                               esc(r[4]), esc(r[5]), esc(r[6]),
                               esc(r[7]), do_not_show]) + ')'
        )
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 6. re_subcohorts (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_subcohorts (\n"
        "  sub_cohort_id,sub_cohort_label,main_cohort_id,maps_to_persona_id,persona_name,\n"
        "  show_as_chip_text,ask_next,do_not_show_in_first_screen\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (sub_cohort_id) DO NOTHING;"
    )

    # ── 7. ROUTING RULES ──────────────────────────────────────
    _, rr_rows = sheet_rows(wb, 'Routing_Rules_v3')
    vals = []
    for r in rr_rows:
        if not r[0]:
            continue
        vals.append('  (' + ','.join([esc(r[i]) for i in range(6)]) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 7. re_routing_rules (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_routing_rules "
        "(rule_id,shown_when,input_type,user_prompt_summary,why_it_matters,maps_to_fields)\n"
        "VALUES\n" + vals_str + "\nON CONFLICT (rule_id) DO NOTHING;"
    )

    # ── 8. MEAL CLASSES ───────────────────────────────────────
    _, mclass_rows = sheet_rows(wb, 'Meal_Class_Master_v3')
    vals = []
    for r in mclass_rows:
        if not r[0]:
            continue
        is_primary = bool_val(r[19])
        vals.append(
            '  (' + ','.join([
                esc(r[0]), esc(r[1]), esc(r[2]), esc(r[3]), esc(r[4]),
                int_val(r[5]), int_val(r[6]), esc(r[7]), esc(r[8]), esc(r[9]),
                esc(r[10]), esc(r[11]), esc(r[12]), esc(r[13]), esc(r[14]),
                esc(r[15]), esc(r[16]), esc(r[17]), esc(r[18]), is_primary,
                esc(r[20]) if len(r) > 20 else 'NULL',
                esc(r[21]) if len(r) > 21 else 'NULL',
                esc(r[22]) if len(r) > 22 else 'NULL'
            ]) + ')'
        )
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 8. re_meal_classes (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_meal_classes (\n"
        "  meal_class_code,slot_group,class_name,class_category,diet_type,\n"
        "  weekday_fit,weekend_fit,cook_complexity,heaviness,primary_base,\n"
        "  cooking_methods,texture,richness,example_dishes,region_relevance,\n"
        "  behavioral_meaning,food_dna_tags,class_family_code,planning_role,allowed_as_weekly_primary,\n"
        "  addon_target_segment,overlap_resolution,db_use_note\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (meal_class_code) DO NOTHING;"
    )

    # ── 9. CLASS DISH OPTIONS ─────────────────────────────────
    # Import dishes for ALL 131 meal classes per the canonical workbook contract
    # (Class_Dish_Options_v3 = 1050 rows). The 13 member-specific classes
    # (allowed_as_weekly_primary=FALSE) are NOT excluded here: their dishes are
    # required for add-on / combo-template expansion, and they are kept out of the
    # family primary meal by re_meal_classes.allowed_as_weekly_primary + the
    # re_meal_class_overlap_rules guard table seeded below — NOT by deleting dishes.
    # (Prior versions wrongly dropped these 104 rows; see migration 008.)
    _, cdo_rows = sheet_rows(wb, 'Class_Dish_Options_v3')
    vals = []
    for r in cdo_rows:
        if not r[0]:
            continue
        vals.append('  (' + ','.join([esc(r[i]) for i in range(11)]) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 9. re_class_dish_options (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_class_dish_options (\n"
        "  dish_option_id,meal_class_code,meal_class_name,dish_name,diet_type,\n"
        "  region_relevance,slot_group,usage_note,source_logic,class_use_scope,join_rule\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (dish_option_id) DO NOTHING;"
    )

    # ── 9b. MEAL CLASS OVERLAP RULES ──────────────────────────
    # Seed the guard table that keeps member-specific classes out of the family
    # primary rotation (canonical: Meal_Class_Overlap_Resolution = 13 rows).
    _, ovr_rows = sheet_rows(wb, 'Meal_Class_Overlap_Resolution')
    ovr_vals = []
    for r in ovr_rows:
        if not r[0]:
            continue
        code = esc(r[0])
        reason = esc(r[2])
        action = '; '.join([str(r[i]).strip() for i in (3, 4) if r[i]])
        action = action + ' | addon_target=' + (str(r[5]).strip() if r[5] else '')
        ovr_vals.append("  (" + code + "," + reason + ",'weekly_primary_rotation'," + esc(action) + ")")
    if ovr_vals:
        blocks.append(
            "-- 9b. re_meal_class_overlap_rules (" + str(len(ovr_vals)) + " rows)\n" +
            "INSERT INTO public.re_meal_class_overlap_rules (meal_class_code,reason,excluded_from,action_note)\n"
            "SELECT v.code,v.reason,v.exfrom,v.note FROM (VALUES\n" + ',\n'.join(ovr_vals) +
            "\n) AS v(code,reason,exfrom,note)\n"
            "WHERE NOT EXISTS (SELECT 1 FROM public.re_meal_class_overlap_rules r WHERE r.meal_class_code=v.code);"
        )

    # ── 10. ADDON CLASSES ─────────────────────────────────────
    _, ac_rows = sheet_rows(wb, 'Addon_Component_Class_Master')
    vals = []
    for r in ac_rows:
        if not r[0]:
            continue
        vals.append('  (' + ','.join([esc(r[i]) for i in range(8)]) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 10. re_addon_classes (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_addon_classes (\n"
        "  addon_class_code,slot_group,target_member_segment,addon_class_name,diet_type,\n"
        "  food_dna_role,example_dishes,planning_note\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (addon_class_code) DO NOTHING;"
    )

    # ── 11. ADDON DISH OPTIONS ────────────────────────────────
    _, ado_rows = sheet_rows(wb, 'Addon_Dish_Options')
    vals = []
    for r in ado_rows:
        if not r[0]:
            continue
        vals.append('  (' + ','.join([esc(r[i]) for i in range(8)]) + ')')
    vals_str = ',\n'.join(vals)
    blocks.append(
        "-- 11. re_addon_dish_options (" + str(len(vals)) + " rows)\n" +
        "INSERT INTO public.re_addon_dish_options (\n"
        "  addon_dish_option_id,addon_class_code,addon_class_name,dish_or_component_name,target_member_segment,\n"
        "  slot_group,diet_type,usage_note\n"
        ") VALUES\n" + vals_str + "\nON CONFLICT (addon_dish_option_id) DO NOTHING;"
    )

    # ── 12. COHORTS (2,953 rows — batched 500) ────────────────
    _, c_rows = sheet_rows(wb, 'Cohort_Matrix_v3')
    all_vals = []
    for r in c_rows:
        if not r[0]:
            continue
        dep_req = bool_val(r[27]) if len(r) > 27 else 'FALSE'
        health_ov = bool_val(r[29]) if len(r) > 29 else 'FALSE'
        cook_ov = bool_val(r[30]) if len(r) > 30 else 'FALSE'
        dep_seg = esc(r[28]) if len(r) > 28 else 'NULL'
        addon_logic = esc(r[31]) if len(r) > 31 else 'NULL'
        state_notes = esc(r[32]) if len(r) > 32 else 'NULL'
        meal_rule = esc(r[33]) if len(r) > 33 else 'NULL'
        confidence = esc(r[34]) if len(r) > 34 else 'NULL'
        display_name = esc(r[36]) if len(r) > 36 else 'NULL'
        all_vals.append(
            '  (' + ','.join([
                esc(r[0]), esc(r[1]), esc(r[2]), esc(r[3]), esc(r[4]), esc(r[5]),
                esc(r[6]), esc(r[7]), esc(r[8]), esc(r[9]), esc(r[10]),
                esc(r[11]), esc(r[12]), esc(r[13]), esc(r[14]), esc(r[15]), esc(r[16]),
                int_val(r[17]), int_val(r[18]),
                esc(r[19]), esc(r[20]), esc(r[21]), esc(r[22]),
                esc(r[23]), esc(r[24]), esc(r[25]), esc(r[26]),
                dep_req, dep_seg, health_ov, cook_ov,
                addon_logic, state_notes, meal_rule, confidence, display_name
            ]) + ')'
        )

    cohort_cols = (
        "  cohort_id,state_id,state_ut,city_tier_code,city_tier,representative_cities,\n"
        "  main_cohort_id,sub_cohort_id,sub_cohort_label,persona_id,persona_name,\n"
        "  age_band,household_stage,lifecycle_health,cook_dependency,time_pressure,nonveg_mode,\n"
        "  nonveg_meals_per_week_default,egg_meals_per_week_default,\n"
        "  weekday_breakfast_class_mix,weekday_lunch_class_mix,weekday_snack_class_mix,weekday_dinner_class_mix,\n"
        "  weekend_breakfast_class_mix,weekend_lunch_class_mix,weekend_snack_class_mix,weekend_dinner_class_mix,\n"
        "  dependent_addon_required,dependent_member_segments,\n"
        "  health_overlay_default,cook_overlay_default,\n"
        "  household_addon_logic,state_signature_notes,main_meal_vs_addon_rule,planning_confidence,cohort_display_name"
    )
    batch_size = 500
    for i in range(0, len(all_vals), batch_size):
        batch = all_vals[i:i+batch_size]
        batch_str = ',\n'.join(batch)
        bn = i // batch_size + 1
        total = (len(all_vals) + batch_size - 1) // batch_size
        blocks.append(
            "-- 12. re_cohorts batch " + str(bn) + "/" + str(total) + " (" + str(len(batch)) + " rows)\n" +
            "INSERT INTO public.re_cohorts (\n" + cohort_cols + "\n) VALUES\n" +
            batch_str + "\nON CONFLICT (cohort_id) DO NOTHING;"
        )

    # ── 13. WEEKLY CLASS PLANS (20,665 rows — batched 500) ────
    _, wcp_rows = sheet_rows(wb, 'Weekly_Class_Plan_v3')
    all_vals = []
    for r in wcp_rows:
        if not r[0]:
            continue
        all_vals.append(
            '  (' + ','.join([esc(r[i]) for i in range(23)]) + ')'
        )

    wcp_cols = (
        "  plan_day_id,cohort_id,persona_id,day_of_week,weekday_weekend,\n"
        "  breakfast_primary_class,breakfast_secondary_class,breakfast_tertiary_class,breakfast_addon_class_code,\n"
        "  lunch_primary_class,lunch_secondary_class,lunch_tertiary_class,lunch_addon_class_code,\n"
        "  snack_primary_class,snack_secondary_class,snack_tertiary_class,snack_addon_class_code,\n"
        "  dinner_primary_class,dinner_secondary_class,dinner_tertiary_class,dinner_addon_class_code,\n"
        "  scheduled_nonveg_slot,qa_mapping_status"
    )
    for i in range(0, len(all_vals), batch_size):
        batch = all_vals[i:i+batch_size]
        batch_str = ',\n'.join(batch)
        bn = i // batch_size + 1
        total = (len(all_vals) + batch_size - 1) // batch_size
        blocks.append(
            "-- 13. re_weekly_class_plans batch " + str(bn) + "/" + str(total) + " (" + str(len(batch)) + " rows)\n" +
            "INSERT INTO public.re_weekly_class_plans (\n" + wcp_cols + "\n) VALUES\n" +
            batch_str + "\nON CONFLICT (plan_day_id) DO NOTHING;"
        )

    # ── 14. HOUSEHOLD ADDON PLANS (7,993 rows — batched 500) ──
    _, hacp_rows = sheet_rows(wb, 'Household_Addon_Component_Plan')
    all_vals = []
    for r in hacp_rows:
        if not r[0]:
            continue
        all_vals.append(
            '  (' + ','.join([esc(r[i]) for i in range(15)]) + ')'
        )

    hacp_cols = (
        "  addon_plan_id,cohort_id,state_ut,city_tier,persona_id,persona_name,\n"
        "  day_of_week,meal_slot,target_member_segment,addon_class_code,addon_class_name,\n"
        "  addon_examples,attached_to_main_class_code,component_not_replacement_note,cooking_logic"
    )
    for i in range(0, len(all_vals), batch_size):
        batch = all_vals[i:i+batch_size]
        batch_str = ',\n'.join(batch)
        bn = i // batch_size + 1
        total = (len(all_vals) + batch_size - 1) // batch_size
        blocks.append(
            "-- 14. re_household_addon_plans batch " + str(bn) + "/" + str(total) + " (" + str(len(batch)) + " rows)\n" +
            "INSERT INTO public.re_household_addon_plans (\n" + hacp_cols + "\n) VALUES\n" +
            batch_str + "\nON CONFLICT (addon_plan_id) DO NOTHING;"
        )

    # ── 15. NONVEG LOGIC ──────────────────────────────────────
    _, nv_rows = sheet_rows(wb, 'NonVeg_Logic_v3')
    vals = []
    for r in nv_rows:
        if not r[0]:
            continue
        vals.append(
            '  (' + ','.join([
                esc(r[0]), esc(r[1]), esc(r[2]),
                int_val(r[3]), int_val(r[4]),
                esc(r[5]) if len(r) > 5 else 'NULL',
                esc(r[6]) if len(r) > 6 else 'NULL'
            ]) + ')'
        )
    if vals:
        vals_str = ',\n'.join(vals)
        blocks.append(
            "-- 15. re_nonveg_logic (" + str(len(vals)) + " rows)\n" +
            "INSERT INTO public.re_nonveg_logic (\n"
            "  state_id,state_ut,nonveg_intensity,\n"
            "  default_nonveg_per_week,default_egg_per_week,preferred_nonveg_classes,planning_notes\n"
            ") VALUES\n" + vals_str + "\nON CONFLICT (state_id) DO NOTHING;"
        )

    return blocks


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate RE seed SQL from workbook')
    parser.add_argument('--dry-run', action='store_true', help='Print block summaries without full SQL')
    args = parser.parse_args()

    print("Loading workbook...", file=sys.stderr)
    wb = openpyxl.load_workbook(WORKBOOK_PATH, read_only=True, data_only=True)
    blocks = generate_sql(wb)
    print(f"Generated {len(blocks)} SQL blocks", file=sys.stderr)

    for block in blocks:
        if args.dry_run:
            first_line = block.strip().split('\n')[0]
            print(f"  {first_line}")
        else:
            print(block)
            print()

    print("-- DONE", file=sys.stderr)
