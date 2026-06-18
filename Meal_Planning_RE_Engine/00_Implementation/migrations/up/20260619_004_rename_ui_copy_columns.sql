-- SCHEMA-RE-020: rename UI-copy columns to _FounderInfoOnly.
-- Content already extracted to foofoo/src/config/re-onboarding-content.ts
-- (see UI_COPY_EXTRACTION_LOG.md). No data deleted — rename only.
-- Code references to the old names updated in the same change
-- (re-onboarding.repository.ts, re-onboarding-start edge function);
-- re-step-3.tsx and types/index.ts read the field names already
-- preserved on REMainCohort/RESubcohort, so they are unaffected.

ALTER TABLE re_main_cohorts
  RENAME COLUMN subcohort_screen_copy TO subcohort_screen_copy_FounderInfoOnly;

ALTER TABLE re_routing_rules
  RENAME COLUMN user_prompt_summary TO user_prompt_summary_FounderInfoOnly;
ALTER TABLE re_routing_rules
  RENAME COLUMN why_it_matters TO why_it_matters_FounderInfoOnly;

ALTER TABLE re_subcohorts
  RENAME COLUMN show_as_chip_text TO show_as_chip_text_FounderInfoOnly;
ALTER TABLE re_subcohorts
  RENAME COLUMN ask_next TO ask_next_FounderInfoOnly;
