-- ============================================================================
-- T1-6 / T0-5: Remove hardcoded webhook Bearer secret from notify_user_signup()
-- ============================================================================
--
-- BEFORE APPLYING: rename this file — replace PLACEHOLDER_TIMESTAMP with a real
-- UTC timestamp, e.g.:
--   mv supabase/migrations/PLACEHOLDER_TIMESTAMP_rotate_signup_webhook_secret.sql \
--      supabase/migrations/$(date -u +%Y%m%d%H%M%S)_rotate_signup_webhook_secret.sql
--
-- PROBLEM
--   Migrations 20260420000000, 20260420000002, and 20260421000000 embed the
--   live SUPABASE_WEBHOOK_SECRET as a literal Bearer token inside
--   public.notify_user_signup(). The secret lives in git history and cannot
--   be rotated without editing SQL.
--
-- FIX (chosen approach: Supabase Vault)
--   The function now reads the secret at call time from Supabase Vault
--   (vault.decrypted_secrets) by name: 'signup_webhook_secret'.
--   - Encrypted at rest (authenticated encryption via the Vault extension);
--     never appears in pg_dump output, catalogs, or logical backups in
--     plaintext — unlike a GUC (pg_db_role_setting) or a plain config table.
--   - Rotation is dashboard/SQL-editor only: vault.update_secret(). No
--     migration, no git commit, no redeploy of the database schema.
--   - The trigger itself stays declarative in migrations (survives
--     `supabase db reset` and new environments), which a dashboard-configured
--     Database Webhook would not.
--
-- PRECONDITION (see docs/audit/specs/T1-6-rotation-runbook.md, Phase 1)
--   A Vault secret named 'signup_webhook_secret' must be created BEFORE this
--   migration is applied, seeded with the CURRENT value of
--   SUPABASE_WEBHOOK_SECRET. If it is missing, signups still succeed but the
--   welcome email is silently skipped (a WARNING is raised in Postgres logs).
--
-- SAFETY PROPERTIES
--   - Idempotent: CREATE OR REPLACE for both function and trigger.
--   - Signup can never fail because of this trigger: the entire body is
--     wrapped in an exception handler (pattern from 20260420000002).
--   - SECURITY DEFINER with a pinned search_path. This tightens the pattern
--     from 20260421000000 (`public, net, pg_temp`) to the strictest form,
--     search_path = '' — every object reference below is schema-qualified,
--     so nothing is resolvable via a caller-controlled path.
--   - net.http_post is ASYNC (pg_net queues the request; a background worker
--     sends it), so the trigger adds no HTTP latency to signup. Keeping the
--     hand-rolled pg_net trigger is therefore fine; the only thing wrong with
--     it was where the secret lived.
--   - NO secret value appears anywhere in this file.
-- ============================================================================

-- 1) Ensure the Vault extension is available.
--    On hosted Supabase projects Vault is preinstalled; this is a guarded
--    no-op there. On local dev (supabase start) it enables the extension.
--    Failure to enable is downgraded to a NOTICE so the migration never
--    blocks: the function below degrades gracefully when Vault is absent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'supabase_vault not enabled (%). Enable it via Dashboard > Database > Extensions before rotating.', SQLERRM;
END;
$$;

-- 2) Replace the trigger function. Secret is fetched from Vault at call time.
CREATE OR REPLACE FUNCTION public.notify_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_secret text;
BEGIN
  BEGIN
    -- Fetch the Bearer secret by name from Vault. Runs as the function owner
    -- (postgres), which is the only role with access to decrypted secrets;
    -- anon/authenticated cannot read vault.decrypted_secrets.
    SELECT ds.decrypted_secret
      INTO v_secret
      FROM vault.decrypted_secrets AS ds
     WHERE ds.name = 'signup_webhook_secret'
     LIMIT 1;

    IF v_secret IS NULL OR v_secret = '' THEN
      -- Secret not provisioned yet: never block signup, just skip the
      -- notification and leave a breadcrumb in the Postgres logs.
      RAISE WARNING 'notify_user_signup: Vault secret "signup_webhook_secret" missing; welcome email skipped for profile %', NEW.id;
      RETURN NEW;
    END IF;

    -- Async HTTP POST via pg_net; delivered by a background worker.
    PERFORM net.http_post(
      url := 'https://saltgoat.co/api/webhooks/user-signup',
      body := pg_catalog.jsonb_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', pg_catalog.row_to_json(NEW)::jsonb,
        'old_record', NULL
      ),
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never let a notification failure (Vault unavailable, pg_net missing,
    -- queue error, ...) block user creation. See 20260420000002.
    NULL;
  END;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_user_signup() IS
  'AFTER INSERT trigger on public.profiles. POSTs the new profile to '
  'https://saltgoat.co/api/webhooks/user-signup (welcome email + newsletter '
  'subscribe) via async pg_net. Bearer secret is read from Supabase Vault '
  '(name: signup_webhook_secret) — rotate with vault.update_secret(), never '
  'by editing this function. Failures are swallowed so signup never breaks.';

-- 3) Lock down direct execution. Trigger functions cannot be invoked through
--    PostgREST anyway (they return trigger), but revoking is cheap insurance
--    and removes the default PUBLIC execute grant.
REVOKE ALL ON FUNCTION public.notify_user_signup() FROM PUBLIC, anon, authenticated;

-- 4) Recreate the trigger idempotently (CREATE OR REPLACE TRIGGER, PG14+).
--    Same name/timing as 20260420000000, so this is a no-op if unchanged.
CREATE OR REPLACE TRIGGER "on_profile_created_send_welcome"
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_signup();

-- ============================================================================
-- POST-APPLY (runbook Phase 2): the value currently in git history is BURNED.
-- Generate a fresh secret and rotate it in Railway + Vault per
-- docs/audit/specs/T1-6-rotation-runbook.md. From now on rotation is:
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'signup_webhook_secret'),
--     '<new-secret>');
-- plus the matching Railway env update. No migration required.
-- ============================================================================
