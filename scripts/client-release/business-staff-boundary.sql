-- STAGED SOURCE ONLY: not a migration or a live privilege change.
-- Existing roster RLS, chat/native triggers, constraints and helpers are retained.
-- Closes selected direct roster escalation paths; does not certify historical
-- memberships, JWT/session freshness, every privileged writer or global lock order.
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
CREATE SCHEMA client_business_access_candidate;
REVOKE ALL ON SCHEMA client_business_access_candidate FROM PUBLIC, anon, authenticated, service_role;

-- Narrow privileged lookup: ordinary callers do not receive Auth-table access.
-- The caller's verified Data API subject is required, never editable JWT metadata.
CREATE FUNCTION client_business_access_candidate.require_role(
  p_account uuid, p_business uuid, p_allowed text[]
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid;
  v_owner uuid;
  v_role text;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'authenticated'
    OR p_account IS NULL OR p_business IS NULL
    OR auth.uid() IS DISTINCT FROM p_account
    OR p_allowed IS NULL OR cardinality(p_allowed) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE id = p_account FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = p_business FOR SHARE;
  IF NOT FOUND OR v_owner IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  IF v_owner = p_account THEN
    v_role := 'owner';
  ELSE
    SELECT role::text INTO v_role FROM public.business_staff
      WHERE business_id = p_business AND user_id = p_account AND active IS TRUE
      FOR SHARE;
    -- A roster label cannot confer business ownership.
    IF NOT FOUND OR v_role = 'owner' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
    END IF;
  END IF;
  IF (v_role = ANY(p_allowed)) IS DISTINCT FROM TRUE OR auth.uid() IS DISTINCT FROM p_account THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  RETURN v_role;
END $$;

CREATE FUNCTION client_business_access_candidate.guard_roster() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_business uuid;
  v_target uuid;
  v_owner uuid;
  v_role text;
  v_target_user uuid;
  v_state text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.id, NEW.business_id, NEW.user_id, NEW.created_at, NEW.invited_by)
      IS DISTINCT FROM ROW(OLD.id, OLD.business_id, OLD.user_id, OLD.created_at, OLD.invited_by) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
    END IF;
    -- Unknown/new columns are protected too. Timestamp is maintained by the
    -- retained trigger. Targeted role/title/active updates have a second guard,
    -- even if their values are unchanged, because they invoke the native bridge.
    IF TG_ARGV[0] IS DISTINCT FROM 'authority-target' AND OLD.user_id = v_actor
      AND OLD.active IS TRUE
      AND (to_jsonb(NEW) - 'on_shift' - 'updated_at')
        IS NOT DISTINCT FROM (to_jsonb(OLD) - 'on_shift' - 'updated_at') THEN
      PERFORM client_business_access_candidate.require_role(v_actor, OLD.business_id,
        ARRAY['owner','manager','assistant_manager','dispatcher','driver','mechanic','clerk']);
      RETURN NEW;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_business := OLD.business_id;
    v_target := OLD.user_id;
  ELSE
    v_business := NEW.business_id;
    v_target := NEW.user_id;
  END IF;
  v_role := client_business_access_candidate.require_role(v_actor, v_business,
    ARRAY['owner','manager','assistant_manager']);
  SELECT owner_id INTO v_owner FROM public.businesses WHERE id = v_business;
  IF v_target IS NULL OR v_target = v_actor OR v_target = v_owner THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF v_role <> 'owner' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
    END IF;
    RETURN OLD;
  END IF;
  SELECT id INTO v_target_user FROM auth.users WHERE id = v_target FOR KEY SHARE;
  IF NOT FOUND OR NEW.role::text = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.invited_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
  END IF;
  IF v_role <> 'owner' THEN
    IF NEW.role::text IN ('manager','assistant_manager')
      OR (TG_OP = 'UPDATE' AND OLD.role::text IN ('owner','manager','assistant_manager')) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Business staff change denied.';
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE = v_state, MESSAGE = 'Business staff change denied.';
END $$;

-- These names run after the retained BEFORE timestamp trigger. Existing AFTER
-- chat/native behavior is deliberately not rewritten by this boundary.
CREATE TRIGGER zz_client_staff_boundary BEFORE INSERT OR UPDATE OR DELETE
ON public.business_staff FOR EACH ROW
EXECUTE FUNCTION client_business_access_candidate.guard_roster();
CREATE TRIGGER zzz_client_staff_authority_target BEFORE UPDATE OF role, title, active
ON public.business_staff FOR EACH ROW
EXECUTE FUNCTION client_business_access_candidate.guard_roster('authority-target');

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA client_business_access_candidate
FROM PUBLIC, anon, authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace n,
      LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) a
    WHERE n.nspname = 'client_business_access_candidate' AND a.grantee <> n.nspowner
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
      LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE n.nspname = 'client_business_access_candidate' AND a.grantee <> p.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Staff boundary publication denied.';
  END IF;
END $$;
COMMIT;
