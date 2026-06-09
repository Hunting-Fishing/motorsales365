
-- 1. business_bookings: validate INSERT
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.business_bookings;
CREATE POLICY "Anyone can create a valid booking"
  ON public.business_bookings
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.business_bookable_items i
      WHERE i.id = business_bookings.bookable_item_id
        AND i.business_id = business_bookings.business_id
        AND i.active = true
    )
  );

-- 2. email_routes: role-based admin gating
DROP POLICY IF EXISTS "Super-admin can read email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can insert email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can update email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can delete email routes" ON public.email_routes;

CREATE POLICY "Admins read email routes"
  ON public.email_routes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert email routes"
  ON public.email_routes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update email routes"
  ON public.email_routes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete email routes"
  ON public.email_routes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Storage: restrict report-evidence uploads
DROP POLICY IF EXISTS "Anyone can upload report evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload report evidence to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4. Wanted posts/responses: hide contact_value from anonymous visitors
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon;
