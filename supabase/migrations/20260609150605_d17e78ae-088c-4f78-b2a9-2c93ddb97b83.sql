
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_username text UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_staff_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_parent_org ON public.profiles(parent_org_id) WHERE parent_org_id IS NOT NULL;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_seats integer;

UPDATE public.subscription_plans SET max_seats = 1 WHERE name = 'Private Seller';
UPDATE public.subscription_plans SET max_seats = 3 WHERE name = 'Verified Seller';
UPDATE public.subscription_plans SET max_seats = 5 WHERE name = 'Dealer Starter';
UPDATE public.subscription_plans SET max_seats = NULL WHERE name IN ('Dealer Pro','Platinum','Enterprise','Business Trial');

CREATE OR REPLACE FUNCTION public.org_seat_count(_org_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.organization_members WHERE organization_id = _org_id
$$;

CREATE OR REPLACE FUNCTION public.org_max_seats(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_max int;
  v_found boolean := false;
BEGIN
  SELECT user_id INTO v_owner FROM public.organization_members
    WHERE organization_id = _org_id AND role = 'owner' LIMIT 1;
  IF v_owner IS NULL THEN RETURN 1; END IF;

  SELECT p.max_seats, true INTO v_max, v_found
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
   WHERE s.user_id = v_owner
     AND s.status = 'active'
     AND (s.current_period_end IS NULL OR s.current_period_end > now())
   ORDER BY COALESCE(p.max_seats, 999999) DESC
   LIMIT 1;

  IF NOT v_found THEN RETURN 1; END IF;
  RETURN v_max;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_login_to_email(_input text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.login_username = lower(btrim(_input))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolve_login_to_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_seat_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_max_seats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(NEW.business_name,''), NULLIF(NEW.full_name,''), 'My Account');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'seller'; END IF;
  v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(NEW.id::text,'-',''), 1, 6);

  INSERT INTO public.organizations (name, slug, kind, created_by)
  VALUES (v_name, v_slug, 'dealership', NEW.id)
  RETURNING id INTO v_org_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_create_seller_org ON public.profiles;
CREATE TRIGGER auto_create_seller_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_auto_create_seller_org();

CREATE OR REPLACE FUNCTION public.tg_set_listing_org_from_staff()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT parent_org_id INTO v_org FROM public.profiles WHERE id = NEW.user_id;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
    RETURN NEW;
  END IF;
  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id = NEW.user_id AND role = 'owner' LIMIT 1;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_listing_org_from_staff ON public.listings;
CREATE TRIGGER set_listing_org_from_staff
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_listing_org_from_staff();

DROP POLICY IF EXISTS "Org members read listing messages" ON public.messages;
CREATE POLICY "Org members read listing messages"
ON public.messages FOR SELECT
USING (
  listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = messages.listing_id
      AND l.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), l.organization_id)
  )
);

-- Backfill orgs for existing sellers
DO $$
DECLARE
  r record;
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.business_name
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = p.id)
      AND COALESCE(p.is_staff_account, false) = false
  LOOP
    v_name := COALESCE(NULLIF(r.business_name,''), NULLIF(r.full_name,''), 'My Account');
    v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
    IF v_slug = '' THEN v_slug := 'seller'; END IF;
    v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(r.id::text,'-',''), 1, 6);

    INSERT INTO public.organizations (name, slug, kind, created_by)
    VALUES (v_name, v_slug, 'dealership', r.id)
    RETURNING id INTO v_org_id;
  END LOOP;
END $$;

UPDATE public.listings l
   SET organization_id = m.organization_id
  FROM public.organization_members m
 WHERE m.user_id = l.user_id
   AND m.role = 'owner'
   AND l.organization_id IS NULL;
