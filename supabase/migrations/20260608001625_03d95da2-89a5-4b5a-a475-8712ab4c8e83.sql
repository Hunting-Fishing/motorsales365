
-- Security fixes from scanner findings

-- 1) advertisements: drop public-read RLS policy. Public reads happen via
--    the active_ads_public view (which excludes advertiser_email/advertiser_name);
--    ad managers continue to read via their own policy.
DROP POLICY IF EXISTS "Public reads active-ad safe columns" ON public.advertisements;

-- 2) storage.objects: fix broken business-gallery upload policy that referenced
--    b.name (businesses.name column) instead of the storage object's name.
DROP POLICY IF EXISTS "Authenticated upload to business gallery" ON storage.objects;
CREATE POLICY "Authenticated upload to business gallery"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-gallery'
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND (
          b.owner_id = auth.uid()
          OR (b.organization_id IS NOT NULL
              AND public.can_manage_org(auth.uid(), b.organization_id))
        )
    )
  );

-- 3) lead_offer_unlocks: remove user-facing INSERT. Unlock rows are only
--    legitimately created by the server function (which uses the service-role
--    admin client and validates payment + capacity). Removing this policy
--    closes the bypass where a buyer could insert a row directly and then
--    read contact details from lead_offers.
DROP POLICY IF EXISTS "Buyers insert their own unlocks" ON public.lead_offer_unlocks;
