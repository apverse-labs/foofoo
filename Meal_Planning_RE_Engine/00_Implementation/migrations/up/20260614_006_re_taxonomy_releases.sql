-- SCHEMA-RE-005 / BUILD-09 (DOC-27): Taxonomy release audit log.
-- Tracks every taxonomy version release with approver, QA status, and rollback plan.
-- Additive only — no existing table altered.

CREATE TABLE re_taxonomy_releases (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  taxonomy_version TEXT        NOT NULL UNIQUE,
  version_from     TEXT,
  version_to       TEXT        NOT NULL,
  changed_entities JSONB       NOT NULL DEFAULT '[]',
  risk_level       TEXT        NOT NULL CHECK (risk_level IN ('low','medium','high')),
  qa_status        TEXT        NOT NULL CHECK (qa_status IN ('pending','pass','fail')) DEFAULT 'pending',
  qa_report        JSONB,
  approved_by      TEXT,
  release_notes    TEXT,
  rollback_plan    TEXT,
  released_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Authenticated users can read releases (dashboards / version checks).
-- Only service-role callers (admin operations) write rows.
ALTER TABLE re_taxonomy_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY re_tr_select ON re_taxonomy_releases
  FOR SELECT TO authenticated USING (true);

-- Index for ordered release history
CREATE INDEX idx_re_tr_created ON re_taxonomy_releases (created_at DESC);
