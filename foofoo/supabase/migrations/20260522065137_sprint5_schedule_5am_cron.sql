-- Sprint 5 Section 3C — 5 AM IST daily plan CRON.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Wrapper: pull service_role from vault and POST to the batch Edge Function.
CREATE OR REPLACE FUNCTION public.run_daily_plans_batch()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
BEGIN
  -- ⚠️  HARDCODED PROJECT URL — pg_cron cannot read env vars at runtime, so the
  --    Edge Function URL must be embedded here at migration time.
  --    If the Supabase project ref ever changes, this function must be replaced
  --    with a new migration that contains the updated URL.
  --    Current project: ufgfznpqixplcbhmsqqw (dev/Mumbai, ap-south-1)
  v_url := 'https://ufgfznpqixplcbhmsqqw.supabase.co/functions/v1/generate-daily-plans-batch';

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    INSERT INTO public.etl_jobs (job_name, status, error_message, metadata)
    VALUES (
      'generate-daily-plans-batch',
      'failed',
      'service_role_key not present in vault — set via Supabase Dashboard',
      jsonb_build_object('source', 'cron')
    );
    RETURN -1;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_daily_plans_batch() FROM public;
REVOKE EXECUTE ON FUNCTION public.run_daily_plans_batch() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_daily_plans_batch() FROM authenticated;

-- Schedule: every day at 23:30 UTC = 05:00 IST next day.
DO $$
BEGIN
  PERFORM cron.unschedule('foofoo-5am-daily-plans')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'foofoo-5am-daily-plans');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'foofoo-5am-daily-plans',
  '30 23 * * *',
  $cron$SELECT public.run_daily_plans_batch();$cron$
);
