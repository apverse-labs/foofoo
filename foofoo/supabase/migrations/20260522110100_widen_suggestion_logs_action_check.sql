-- Sprint 5 post-QA fix: widen suggestion_logs.action CHECK constraint.
--
-- Root cause: the existing CHECK allows only 6 action values
-- ('accepted','rejected','never','not_today','locked','viewed'). Every
-- 'shown', 'swiped_to', 'swiped_past', 'tapped_detail',
-- 'tapped_ingredients', 'added_to_date', 'unlocked' and 'refresh' insert
-- emitted by the Edge Functions and client gestures has been silently
-- rejected since launch. RE v2 cannot learn without these.
--
-- Net of this migration: only the constraint is widened. No row data
-- changes. Suggestion logs from before now continue to satisfy the new
-- (looser) constraint.
ALTER TABLE public.suggestion_logs
  DROP CONSTRAINT IF EXISTS suggestion_logs_action_check;

ALTER TABLE public.suggestion_logs
  ADD CONSTRAINT suggestion_logs_action_check
  CHECK (action = ANY (ARRAY[
    'accepted'::text, 'rejected'::text, 'shown'::text, 'viewed'::text,
    'swiped'::text, 'swiped_to'::text, 'swiped_past'::text,
    'locked'::text, 'unlocked'::text, 'never'::text, 'not_today'::text,
    'tapped_detail'::text, 'tapped_ingredients'::text,
    'added_to_date'::text, 'refresh'::text
  ]));
