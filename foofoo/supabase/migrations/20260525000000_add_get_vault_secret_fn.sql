-- Migration: add get_vault_secret() helper for Edge Functions
-- Edge Functions cannot query vault.decrypted_secrets directly via PostgREST
-- (the vault schema is not in the exposed_schemas list). Instead, Edge Functions
-- call this SECURITY DEFINER function which runs with the owner's privileges
-- and can read from vault internally.

CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;
  RETURN v_secret;
END;
$$;

-- Only service_role (used by Edge Functions) can call this
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;

COMMENT ON FUNCTION public.get_vault_secret IS
  'Read a single secret from Supabase Vault by name. '
  'SECURITY DEFINER so Edge Functions (service_role) can access vault without '
  'exposing the vault schema via PostgREST.';
