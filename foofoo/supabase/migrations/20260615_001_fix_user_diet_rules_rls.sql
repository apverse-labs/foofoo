-- Fix: user_diet_rules had RLS enabled but no policy, causing 403 on all writes.
-- Adds own-row ALL policy so authenticated users can insert/update/select their own row.
CREATE POLICY diet_rules_all_own ON public.user_diet_rules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
