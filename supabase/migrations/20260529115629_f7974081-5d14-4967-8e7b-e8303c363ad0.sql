DROP POLICY IF EXISTS "Owners update own businesses" ON public.businesses;
CREATE POLICY "Owners update own businesses" ON public.businesses
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);