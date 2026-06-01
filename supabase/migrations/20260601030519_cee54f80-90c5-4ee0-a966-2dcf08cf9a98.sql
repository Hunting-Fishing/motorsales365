DROP POLICY IF EXISTS "Active businesses public read" ON public.businesses;

CREATE POLICY "Active businesses public read"
ON public.businesses
FOR SELECT
TO public
USING (
  status = 'active'::business_status
  OR (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
  OR (auth.uid() IS NOT NULL AND public.can_moderate(auth.uid()))
);