
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_signup_intent_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_signup_intent_check
  CHECK (signup_intent IS NULL OR signup_intent = ANY (ARRAY['buyer','private_seller','business','service_provider','internal_staff']));

CREATE TABLE IF NOT EXISTS public.internal_org_settings (
  key text PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_org_settings TO service_role;
ALTER TABLE public.internal_org_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access" ON public.internal_org_settings;
CREATE POLICY "No direct client access" ON public.internal_org_settings FOR SELECT USING (false);

INSERT INTO public.internal_org_settings(key, org_id)
VALUES ('canonical_365', 'd45bc407-1510-46e5-9ff2-a9789ad002fa')
ON CONFLICT (key) DO UPDATE SET org_id = EXCLUDED.org_id, updated_at = now();

CREATE OR REPLACE FUNCTION public.canonical_365_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT org_id FROM public.internal_org_settings WHERE key='canonical_365'
$$;

CREATE OR REPLACE FUNCTION public.is_internal_365_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _email IS NOT NULL AND lower(_email) LIKE '%@365motorsales.com'
$$;

CREATE OR REPLACE FUNCTION public.is_internal_365_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.is_staff_account = true
      AND p.parent_org_id = public.canonical_365_org_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_street_address text := NULLIF(m->>'street_address', '');
  v_postal_code text := NULLIF(m->>'postal_code', '');
  v_business_kind_raw text := NULLIF(m->>'business_kind', '');
  v_business_kind business_kind := NULL;
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_phone_e164 text := NULL;
  v_phone_digits text;
  v_is_business boolean;
  v_seller_type seller_type;
  v_ref_code text := NULLIF(m->>'referral_code','');
  v_src_raw text := lower(NULLIF(m->>'signup_source',''));
  v_signup_source text;
  v_is_internal boolean := public.is_internal_365_email(NEW.email);
  v_canonical_org uuid;
BEGIN
  IF v_is_internal THEN
    v_intent := 'internal_staff';
    v_business_name := NULL;
    v_business_address := NULL;
    v_business_kind := NULL;
    v_canonical_org := public.canonical_365_org_id();
  END IF;

  v_is_business := (NOT v_is_internal) AND v_intent IN ('business','service_provider');
  v_seller_type := CASE WHEN v_is_business THEN 'business'::seller_type ELSE 'private'::seller_type END;

  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN v_full := NEW.email; END IF;

  IF v_phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF v_phone_digits LIKE '+%' THEN
      v_phone_e164 := v_phone_digits;
    ELSIF v_phone_digits LIKE '09%' AND length(v_phone_digits) = 11 THEN
      v_phone_e164 := '+63' || substring(v_phone_digits from 2);
    ELSIF v_phone_digits LIKE '9%' AND length(v_phone_digits) = 10 THEN
      v_phone_e164 := '+63' || v_phone_digits;
    ELSIF v_phone_digits LIKE '63%' AND length(v_phone_digits) = 12 THEN
      v_phone_e164 := '+' || v_phone_digits;
    END IF;
  END IF;

  IF v_is_business AND v_business_kind_raw IS NOT NULL THEN
    BEGIN
      v_business_kind := v_business_kind_raw::business_kind;
    EXCEPTION WHEN others THEN
      v_business_kind := NULL;
    END;
  END IF;

  IF v_src_raw IN ('qr','link','direct') THEN
    v_signup_source := v_src_raw;
  ELSIF v_ref_code IS NOT NULL THEN
    v_signup_source := 'link';
  ELSE
    v_signup_source := 'direct';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    street_address, postal_code,
    business_name, business_address, business_region, business_province, business_city, business_postal_code,
    business_kind, seller_type, signup_source,
    is_staff_account, parent_org_id
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone, v_phone_e164,
    v_intent, v_city, v_region, v_province,
    v_street_address, v_postal_code,
    CASE WHEN v_is_business THEN v_business_name END,
    CASE WHEN v_is_business THEN v_business_address END,
    CASE WHEN v_is_business THEN v_region END,
    CASE WHEN v_is_business THEN v_province END,
    CASE WHEN v_is_business THEN v_city END,
    CASE WHEN v_is_business THEN v_postal_code END,
    v_business_kind,
    v_seller_type,
    v_signup_source,
    v_is_internal,
    v_canonical_org
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    signup_intent = COALESCE(EXCLUDED.signup_intent, public.profiles.signup_intent),
    is_staff_account = EXCLUDED.is_staff_account OR public.profiles.is_staff_account,
    parent_org_id = COALESCE(EXCLUDED.parent_org_id, public.profiles.parent_org_id);

  IF v_is_internal AND v_canonical_org IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_canonical_org, NEW.id, 'member'::org_role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_internal_staff_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.is_internal_365_staff(NEW.owner_id) THEN
    RAISE EXCEPTION 'Internal 365 MotorSales staff cannot create a separate business. Contact your admin to be added to the team.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_internal_staff_business ON public.businesses;
CREATE TRIGGER trg_block_internal_staff_business
BEFORE INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.block_internal_staff_business();

CREATE OR REPLACE FUNCTION public.block_internal_staff_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.id = public.canonical_365_org_id() THEN
    RETURN NEW;
  END IF;
  IF public.is_internal_365_staff(NEW.created_by) THEN
    RAISE EXCEPTION 'Internal 365 MotorSales staff cannot create a separate organization.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_internal_staff_org ON public.organizations;
CREATE TRIGGER trg_block_internal_staff_org
BEFORE INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.block_internal_staff_org();

-- Backfill (no seller_type change to avoid unrelated recompute trigger bug)
DO $$
DECLARE
  v_canonical uuid := public.canonical_365_org_id();
  v_admin uuid;
  r record;
BEGIN
  SELECT created_by INTO v_admin FROM public.organizations WHERE id = v_canonical;

  FOR r IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE lower(u.email) LIKE '%@365motorsales.com'
  LOOP
    UPDATE public.profiles
    SET is_staff_account = true,
        parent_org_id = v_canonical,
        signup_intent = 'internal_staff',
        business_name = NULL,
        business_address = NULL,
        business_region = NULL,
        business_province = NULL,
        business_city = NULL,
        business_postal_code = NULL,
        business_kind = NULL
    WHERE id = r.id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_canonical, r.id, 'member'::org_role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.businesses
    SET status = 'archived', owner_id = v_admin
    WHERE owner_id = r.id;

    UPDATE public.organizations
    SET status = 'archived', created_by = v_admin
    WHERE created_by = r.id AND id <> v_canonical;
  END LOOP;
END $$;
