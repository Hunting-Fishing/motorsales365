
CREATE POLICY "Listing owners read saves on own listings" ON public.favorites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = favorites.listing_id AND l.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
