
-- Helper: auto-populate a rep's territory from their profile signup area.
-- Safe to call any time; no-op if they already have any territory or no signup area.
CREATE OR REPLACE FUNCTION public.auto_setup_sales_rep_territory(_rep_user_id uuid)
RETURNS TABLE(added boolean, region text, province text, city text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region text;
  v_city text;
  v_existing int;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM public.sales_rep_territories
  WHERE rep_user_id = _rep_user_id;

  IF v_existing > 0 THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'already_has_territories'::text;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(signup_region), ''), NULLIF(TRIM(business_region), '')),
         COALESCE(NULLIF(TRIM(signup_city), ''),   NULLIF(TRIM(business_city), ''))
    INTO v_region, v_city
  FROM public.profiles
  WHERE id = _rep_user_id;

  IF v_region IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'no_signup_area'::text;
    RETURN;
  END IF;

  INSERT INTO public.sales_rep_territories (rep_user_id, region, province, city, is_primary)
  VALUES (_rep_user_id, v_region, NULL, v_city, true);

  RETURN QUERY SELECT true, v_region, NULL::text, v_city, 'inserted'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_setup_sales_rep_territory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_setup_sales_rep_territory(uuid) TO authenticated, service_role;

-- Trigger: when a user gains the 'sales' role, auto-setup their territory.
CREATE OR REPLACE FUNCTION public.trg_auto_setup_sales_rep_territory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'sales' THEN
    PERFORM public.auto_setup_sales_rep_territory(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_setup_sales_rep_territory_on_role ON public.user_roles;
CREATE TRIGGER trg_auto_setup_sales_rep_territory_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_setup_sales_rep_territory();
