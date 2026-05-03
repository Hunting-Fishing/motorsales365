
CREATE OR REPLACE FUNCTION public.is_towing_provider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE user_id = _user_id
      AND category_slug = 'towing'
      AND status IN ('active','pending_sale')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_towing_provider(uuid) FROM anon;
