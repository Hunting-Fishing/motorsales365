-- 365 Parts Partner Network — security follow-ups to the P2 RLS hardening.
--
-- Closes the residual risks listed in docs/365_PARTS_P2_RLS_ADVERSARIAL_REPORT.md §6
-- (verified by supabase/tests/parts_network_adversarial_rls.sql, section 7):
--
--   S1  public.businesses was readable column-for-column by anon and every
--       signed-in user, including network_exposure_review_note,
--       network_exposure_reviewed_by and custom_domain_verify_token.
--       -> Those three columns lose SELECT for anon/authenticated. Authorized
--          callers read them through get_business_network_exposure_reviews() and
--          get_business_custom_domain_token(). Custom-domain verification can
--          only be marked "verified" by service-role/moderator contexts, and
--          changing the domain always resets verification.
--   S2  Every active staff role (mechanic, driver, clerk, ...) could read
--       business_inventory_items.cost / supplier / markup_percentage.
--       -> Those columns lose SELECT for authenticated. Owners, managers and
--          assistant managers read them through get_business_inventory_costs().
--   S3  accredit_staff_partner(uuid) was SECURITY DEFINER, executable by anon
--       (through PUBLIC) and had no caller check.
--       -> EXECUTE revoked from PUBLIC/anon; the function now enforces that a
--          direct API caller is the staff user themself or an administrator.
--   S4  Guest/signed-in part inquiries were not rate limited.
--       -> BEFORE INSERT throttle on network_part_inquiries (per contact
--          e-mail, per signed-in requester, per partner for guests). Raises
--          SQLSTATE PT429, which PostgREST returns as HTTP 429.
--   S5  Realtime: postgres_changes payloads are filtered by the subscriber's
--       column SELECT privileges, so S1/S2 also remove those columns from
--       Realtime payloads (business_inventory_items is published with
--       REPLICA IDENTITY FULL). No publication change is needed.
--
-- Additive and idempotent: no table, column or row is dropped or rewritten.
-- Apply manually after review (see the PR description for the procedure).

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------

-- Role claim of the current PostgREST request, or NULL for direct database
-- sessions (migrations, cron, GoTrue/auth triggers, service tooling).
CREATE OR REPLACE FUNCTION public.request_jwt_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )
$$;

REVOKE ALL ON FUNCTION public.request_jwt_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_jwt_role() TO service_role;

-- Column privileges do not extend to columns added later. Every migration
-- that adds a column to public.businesses or public.business_inventory_items
-- must call this function (or grant the new column explicitly), otherwise
-- API clients get "permission denied" for the new column.
CREATE OR REPLACE FUNCTION public.reapply_restricted_column_grants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_private constant text[] := ARRAY[
    'custom_domain_verify_token', 'network_exposure_review_note', 'network_exposure_reviewed_by'
  ];
  v_inventory_cost constant text[] := ARRAY['cost', 'supplier', 'markup_percentage'];
  v_cols text;
BEGIN
  -- businesses: anon + authenticated read every column except the private ones.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO v_cols
  FROM pg_attribute
  WHERE attrelid = 'public.businesses'::regclass AND attnum > 0 AND NOT attisdropped
    AND attname <> ALL (v_business_private);
  REVOKE SELECT ON public.businesses FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.businesses TO anon, authenticated', v_cols);
  EXECUTE format('REVOKE SELECT (%s) ON public.businesses FROM anon, authenticated',
    (SELECT string_agg(quote_ident(c), ', ') FROM unnest(v_business_private) c));

  -- business_inventory_items: authenticated reads every column except cost
  -- data (RLS still limits rows to members). anon keeps the column-limited
  -- grant from 20260927090000 and is not touched here.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO v_cols
  FROM pg_attribute
  WHERE attrelid = 'public.business_inventory_items'::regclass AND attnum > 0 AND NOT attisdropped
    AND attname <> ALL (v_inventory_cost);
  REVOKE SELECT ON public.business_inventory_items FROM authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.business_inventory_items TO authenticated', v_cols);
  EXECUTE format('REVOKE SELECT (%s) ON public.business_inventory_items FROM anon, authenticated',
    (SELECT string_agg(quote_ident(c), ', ') FROM unnest(v_inventory_cost) c));
END;
$$;

REVOKE ALL ON FUNCTION public.reapply_restricted_column_grants() FROM PUBLIC, anon, authenticated;

DO $grants$ BEGIN PERFORM public.reapply_restricted_column_grants(); END $grants$;

-- ---------------------------------------------------------------------------
-- 1. S1 — private business columns
-- ---------------------------------------------------------------------------

-- Review notes are addressed to the business: members of that business and
-- moderators/admins may read them. Rows for other businesses are omitted.
CREATE OR REPLACE FUNCTION public.get_business_network_exposure_reviews(_business_ids uuid[])
RETURNS TABLE (business_id uuid, network_exposure_review_note text, network_exposure_reviewed_by uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.id, b.network_exposure_review_note, b.network_exposure_reviewed_by
  FROM public.businesses b
  WHERE b.id = ANY (_business_ids)
    AND (select auth.uid()) IS NOT NULL
    AND (
      public.can_moderate((select auth.uid()))
      OR public.is_business_member((select auth.uid()), b.id)
    )
$$;

REVOKE ALL ON FUNCTION public.get_business_network_exposure_reviews(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_network_exposure_reviews(uuid[]) TO authenticated, service_role;

-- The DNS verification token is only for people who can manage the business.
CREATE OR REPLACE FUNCTION public.get_business_custom_domain_token(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := (select auth.uid());
  v_token text;
BEGIN
  IF v_uid IS NULL
     OR NOT (
       public.has_business_role(v_uid, _business_id, 'manager'::public.business_staff_role)
       OR public.can_moderate(v_uid)
     ) THEN
    RAISE EXCEPTION 'Not allowed to read this business''s domain verification token'
      USING ERRCODE = '42501';
  END IF;
  SELECT custom_domain_verify_token INTO v_token FROM public.businesses WHERE id = _business_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_custom_domain_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_custom_domain_token(uuid) TO authenticated, service_role;

-- Verification is proven by the server (DNS TXT lookup) and written with the
-- service role. API callers cannot self-mark a domain as verified, and moving
-- a verified business to a different domain always restarts verification.
CREATE OR REPLACE FUNCTION public.guard_business_custom_domain_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.request_jwt_role();
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('anon', 'authenticated')
     OR public.can_moderate((select auth.uid())) THEN
    RETURN NEW;
  END IF;

  IF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.custom_domain_status := CASE WHEN NEW.custom_domain IS NULL THEN 'none' ELSE 'pending' END;
    NEW.custom_domain_verified_at := NULL;
    RETURN NEW;
  END IF;

  IF (NEW.custom_domain_status = 'verified' AND OLD.custom_domain_status IS DISTINCT FROM 'verified')
     OR (NEW.custom_domain_verified_at IS DISTINCT FROM OLD.custom_domain_verified_at
         AND NEW.custom_domain_verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Custom domains are verified by the platform after a DNS check'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_business_custom_domain_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_business_custom_domain_verification ON public.businesses;
CREATE TRIGGER trg_guard_business_custom_domain_verification
  BEFORE UPDATE OF custom_domain, custom_domain_status, custom_domain_verified_at
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_custom_domain_verification();

-- ---------------------------------------------------------------------------
-- 2. S2 — inventory cost data limited to owner / manager / assistant manager
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_business_inventory_costs(_user uuid, _business uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- has_business_role(.., 'manager') is true for the owner and for active
  -- owner/manager/assistant_manager staff: the same set that may write stock.
  SELECT _user IS NOT NULL
    AND public.has_business_role(_user, _business, 'manager'::public.business_staff_role)
$$;

REVOKE ALL ON FUNCTION public.can_view_business_inventory_costs(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_business_inventory_costs(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_business_inventory_costs(_business_id uuid, _item_ids uuid[] DEFAULT NULL)
RETURNS TABLE (item_id uuid, cost numeric, supplier text, markup_percentage numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_view_business_inventory_costs((select auth.uid()), _business_id) THEN
    RAISE EXCEPTION 'Inventory cost data is limited to owners and managers'
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT i.id, i.cost, i.supplier, i.markup_percentage
    FROM public.business_inventory_items i
    WHERE i.business_id = _business_id
      AND (_item_ids IS NULL OR i.id = ANY (_item_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_inventory_costs(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_inventory_costs(uuid, uuid[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. S3 — accredit_staff_partner: no anon access, caller check inside
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accredit_staff_partner(_staff_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_sr RECORD;
  v_full_name text;
  v_app_id uuid;
  v_role text := public.request_jwt_role();
  v_uid uuid;
BEGIN
  -- Trusted contexts: the staff_referrals / auth.users triggers, migrations,
  -- cron and service-role tooling. A direct API call must come from the staff
  -- user themself or from an administrator.
  IF pg_trigger_depth() = 0 AND v_role IS NOT NULL AND v_role <> 'service_role' THEN
    v_uid := (select auth.uid());
    IF v_role <> 'authenticated' OR v_uid IS NULL
       OR (v_uid IS DISTINCT FROM _staff_user_id
           AND NOT public.has_role(v_uid, 'admin'::public.app_role)) THEN
      RAISE EXCEPTION 'Not allowed to accredit this partner' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF _staff_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _staff_user_id;
  IF v_email IS NULL OR lower(v_email) NOT LIKE '%@365motorsales.com' THEN
    RETURN;
  END IF;

  SELECT * INTO v_sr FROM public.staff_referrals
   WHERE staff_user_id = _staff_user_id AND active = true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_sr.id IS NULL THEN RETURN; END IF;

  -- Skip if partner already exists for this code or user.
  IF EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = v_sr.referral_code OR user_id = _staff_user_id
  ) THEN
    -- Ensure it's active.
    UPDATE public.partner_program_partners
       SET active = true, updated_at = now()
     WHERE (referral_code = v_sr.referral_code OR user_id = _staff_user_id)
       AND active = false;
    RETURN;
  END IF;

  SELECT COALESCE(full_name, v_sr.full_name, v_email)
    INTO v_full_name FROM public.profiles WHERE id = _staff_user_id;
  IF v_full_name IS NULL THEN v_full_name := COALESCE(v_sr.full_name, v_email); END IF;

  -- Find or create approved application.
  SELECT id INTO v_app_id FROM public.partner_program_applications
   WHERE user_id = _staff_user_id AND channel_type = 'internal_staff'
   LIMIT 1;

  IF v_app_id IS NULL THEN
    INSERT INTO public.partner_program_applications (
      user_id, full_name, email, phone, channel_type, platforms,
      status, agreed_terms, agreed_terms_at, reviewed_at, admin_notes
    ) VALUES (
      _staff_user_id, v_full_name, v_email, v_sr.phone, 'internal_staff', ARRAY['internal']::text[],
      'approved', true, now(), now(),
      'Auto-accredited: 365 Motorsales internal staff'
    )
    RETURNING id INTO v_app_id;
  ELSE
    UPDATE public.partner_program_applications
       SET status = 'approved', agreed_terms = true,
           agreed_terms_at = COALESCE(agreed_terms_at, now()),
           reviewed_at = COALESCE(reviewed_at, now()),
           admin_notes = COALESCE(admin_notes, 'Auto-accredited: 365 Motorsales internal staff')
     WHERE id = v_app_id;
  END IF;

  INSERT INTO public.partner_program_partners (
    user_id, application_id, referral_code, display_name, active,
    agreed_terms_at, agreed_terms_version
  ) VALUES (
    _staff_user_id, v_app_id, v_sr.referral_code, v_full_name, true,
    now(), 'internal-staff-v1'
  )
  ON CONFLICT (referral_code) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.accredit_staff_partner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accredit_staff_partner(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. S4 — inquiry throttle (database-side, so it also covers direct PostgREST
--    calls made with the public anon key)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS npi_contact_email_created_idx
  ON public.network_part_inquiries (lower(contact_email), created_at DESC);
CREATE INDEX IF NOT EXISTS npi_requester_created_idx
  ON public.network_part_inquiries (requester_user_id, created_at DESC)
  WHERE requester_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.throttle_network_part_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Limits (keep in sync with src/lib/network-inquiry.ts NETWORK_INQUIRY_LIMITS).
  c_per_email_hour   constant int := 5;
  c_per_email_day    constant int := 20;
  c_per_user_hour    constant int := 10;
  c_guest_per_business_hour constant int := 30;
  v_role text := public.request_jwt_role();
  v_email text := lower(trim(coalesce(NEW.contact_email, '')));
  v_n int;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;  -- service role / internal jobs are not throttled
  END IF;

  -- Serialize concurrent submissions for the same address so the counts
  -- below cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended('npi-throttle:' || v_email, 0));

  SELECT count(*) INTO v_n FROM public.network_part_inquiries
  WHERE lower(contact_email) = v_email AND created_at > now() - interval '1 hour';
  IF v_n >= c_per_email_hour THEN
    RAISE EXCEPTION 'Too many part requests from this e-mail address. Please try again later.'
      USING ERRCODE = 'PT429', HINT = 'rate_limited:email_hour';
  END IF;

  SELECT count(*) INTO v_n FROM public.network_part_inquiries
  WHERE lower(contact_email) = v_email AND created_at > now() - interval '1 day';
  IF v_n >= c_per_email_day THEN
    RAISE EXCEPTION 'Too many part requests from this e-mail address today. Please try again tomorrow.'
      USING ERRCODE = 'PT429', HINT = 'rate_limited:email_day';
  END IF;

  IF NEW.requester_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.network_part_inquiries
    WHERE requester_user_id = NEW.requester_user_id AND created_at > now() - interval '1 hour';
    IF v_n >= c_per_user_hour THEN
      RAISE EXCEPTION 'Too many part requests from your account. Please try again later.'
        USING ERRCODE = 'PT429', HINT = 'rate_limited:user_hour';
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended('npi-throttle-business:' || NEW.business_id::text, 0));
    SELECT count(*) INTO v_n FROM public.network_part_inquiries
    WHERE business_id = NEW.business_id AND requester_user_id IS NULL
      AND created_at > now() - interval '1 hour';
    IF v_n >= c_guest_per_business_hour THEN
      RAISE EXCEPTION 'This partner is receiving too many guest requests right now. Please sign in or try again later.'
        USING ERRCODE = 'PT429', HINT = 'rate_limited:business_hour';
    END IF;
  END IF;

  -- The window is based on created_at, so callers must not backdate it.
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.throttle_network_part_inquiry() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_npi_throttle ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_throttle
  BEFORE INSERT ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.throttle_network_part_inquiry();
