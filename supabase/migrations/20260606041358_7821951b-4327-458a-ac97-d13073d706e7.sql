-- 1) Fix the broken self-referential subqueries in the owner UPDATE policy on listings.
DROP POLICY IF EXISTS "Owners update listings" ON public.listings;
CREATE POLICY "Owners update listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (status IS DISTINCT FROM (
    SELECT l.status FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (plan IS DISTINCT FROM (
    SELECT l.plan FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (boost_until IS DISTINCT FROM (
    SELECT l.boost_until FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (expires_at IS DISTINCT FROM (
    SELECT l.expires_at FROM public.listings l WHERE l.id = listings.id
  ))
);

-- 2) Tighten the business-gallery upload policy to require ownership of the target business.
DROP POLICY IF EXISTS "Authenticated upload to business gallery" ON storage.objects;
CREATE POLICY "Authenticated upload to business gallery"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-gallery'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (
        b.owner_id = auth.uid()
        OR (b.organization_id IS NOT NULL AND public.can_manage_org(auth.uid(), b.organization_id))
      )
  )
);