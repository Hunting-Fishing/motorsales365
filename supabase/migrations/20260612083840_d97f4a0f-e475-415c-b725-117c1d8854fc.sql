CREATE OR REPLACE FUNCTION public.seller_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND account_status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.seller_account_active(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read"
ON public.listings
FOR SELECT
USING (
  (status IN ('active'::listing_status, 'pending_sale'::listing_status)
   AND public.seller_account_active(user_id))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);