-- Reverses SCHEMA-RE-020.

ALTER TABLE re_main_cohorts
  RENAME COLUMN subcohort_screen_copy_FounderInfoOnly TO subcohort_screen_copy;

ALTER TABLE re_routing_rules
  RENAME COLUMN user_prompt_summary_FounderInfoOnly TO user_prompt_summary;
ALTER TABLE re_routing_rules
  RENAME COLUMN why_it_matters_FounderInfoOnly TO why_it_matters;

ALTER TABLE re_subcohorts
  RENAME COLUMN show_as_chip_text_FounderInfoOnly TO show_as_chip_text;
ALTER TABLE re_subcohorts
  RENAME COLUMN ask_next_FounderInfoOnly TO ask_next;
