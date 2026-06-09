
CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
  v_meta jsonb;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;

  -- Inspect auth metadata: skip when staff-creation flow is in progress
  SELECT raw_user_meta_data INTO v_meta FROM auth.users WHERE id = NEW.id;
  IF COALESCE((v_meta->>'is_staff_account')::boolean, false) THEN
    RETURN NEW;
  END IF;

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
