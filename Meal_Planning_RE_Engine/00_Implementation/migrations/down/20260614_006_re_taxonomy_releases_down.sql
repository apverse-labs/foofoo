-- ROLLBACK SCHEMA-RE-005 / BUILD-09
DROP INDEX  IF EXISTS idx_re_tr_created;
DROP POLICY IF EXISTS re_tr_select ON re_taxonomy_releases;
DROP TABLE  IF EXISTS re_taxonomy_releases;
