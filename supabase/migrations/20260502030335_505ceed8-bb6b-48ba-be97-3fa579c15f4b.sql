DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read"
  ON public.listings
  FOR SELECT
  USING (
    status IN ('active'::listing_status, 'pending_sale'::listing_status)
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Media readable with listing" ON public.listing_media;
CREATE POLICY "Media readable with listing"
  ON public.listing_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_media.listing_id
        AND (
          l.status IN ('active'::listing_status, 'pending_sale'::listing_status)
          OR l.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );