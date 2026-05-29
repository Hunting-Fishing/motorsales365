
-- Function: delete auth users whose email is not confirmed after 24h
-- Cascades via existing FKs (profiles.id -> auth.users.id on delete cascade, etc.)
CREATE OR REPLACE FUNCTION public.cleanup_unverified_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleted_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id
    FROM auth.users
    WHERE email_confirmed_at IS NULL
      AND confirmed_at IS NULL
      AND created_at < (now() - interval '24 hours')
      AND (deleted_at IS NULL)
  LOOP
    -- Remove dependent business ownership references first (defensive)
    UPDATE public.businesses SET owner_id = NULL WHERE owner_id = r.id;
    DELETE FROM auth.users WHERE id = r.id;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_unverified_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_unverified_users() TO service_role;

-- Schedule hourly cleanup via pg_cron
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-unverified-users');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-unverified-users',
  '17 * * * *',
  $$SELECT public.cleanup_unverified_users();$$
);
