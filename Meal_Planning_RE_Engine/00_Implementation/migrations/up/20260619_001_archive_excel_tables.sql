-- SCHEMA-RE-018: Archive Excel-shaped tables no longer read by application code
-- (SCHEMA-RE-017 moved re-plan.repository.ts / re-addon.repository.ts onto
-- re_persona_slot_plan / re_segment_addon_rule). Rename rather than drop to
-- preserve all data.

ALTER TABLE re_weekly_class_plans RENAME TO re_weekly_class_plans_archive;
ALTER TABLE re_household_addon_plans RENAME TO re_household_addon_plans_archive;

DROP POLICY IF EXISTS re_wcp_select ON re_weekly_class_plans_archive;
CREATE POLICY re_wcp_archive_select ON re_weekly_class_plans_archive FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS re_hap_select ON re_household_addon_plans_archive;
CREATE POLICY re_hap_archive_select ON re_household_addon_plans_archive FOR SELECT TO authenticated USING (true);
