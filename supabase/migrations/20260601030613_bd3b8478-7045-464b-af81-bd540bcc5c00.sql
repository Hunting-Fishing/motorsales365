DROP POLICY IF EXISTS "Active businesses public read" ON public.businesses;
DROP POLICY IF EXISTS "Moderators manage businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins manage business types" ON public.business_types;

CREATE POLICY "Active businesses public read"
ON public.businesses
FOR SELECT
TO public
USING (status = 'active'::business_status);

CREATE POLICY "Business owners can read own businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Moderators manage businesses"
ON public.businesses
FOR ALL
TO authenticated
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Admins manage business types"
ON public.business_types
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));