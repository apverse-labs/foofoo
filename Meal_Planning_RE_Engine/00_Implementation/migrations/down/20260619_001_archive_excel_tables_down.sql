-- Down for SCHEMA-RE-018: restore original table names/policies

DROP POLICY IF EXISTS re_wcp_archive_select ON re_weekly_class_plans_archive;
CREATE POLICY re_wcp_select ON re_weekly_class_plans_archive FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS re_hap_archive_select ON re_household_addon_plans_archive;
CREATE POLICY re_hap_select ON re_household_addon_plans_archive FOR SELECT TO authenticated USING (true);

ALTER TABLE re_weekly_class_plans_archive RENAME TO re_weekly_class_plans;
ALTER TABLE re_household_addon_plans_archive RENAME TO re_household_addon_plans;
