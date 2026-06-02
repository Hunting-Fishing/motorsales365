
-- Pass A: Security hardening for RLS gaps confirmed against live schema.

-- 1. profiles: prevent users from self-promoting verification / founding member status.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
    AND verified_at         IS NOT DISTINCT FROM (SELECT verified_at         FROM public.profiles WHERE id = auth.uid())
    AND is_founding_member  IS NOT DISTINCT FROM (SELECT is_founding_member  FROM public.profiles WHERE id = auth.uid())
    AND founding_member_number IS NOT DISTINCT FROM (SELECT founding_member_number FROM public.profiles WHERE id = auth.uid())
    AND account_status      IS NOT DISTINCT FROM (SELECT account_status      FROM public.profiles WHERE id = auth.uid())
  );

-- 2. listings: prevent owners from self-setting status / plan / boost / expires_at.
DROP POLICY IF EXISTS "Owners update listings" ON public.listings;
CREATE POLICY "Owners update listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status      IS NOT DISTINCT FROM (SELECT status      FROM public.listings WHERE id = listings.id)
    AND plan        IS NOT DISTINCT FROM (SELECT plan        FROM public.listings WHERE id = listings.id)
    AND boost_until IS NOT DISTINCT FROM (SELECT boost_until FROM public.listings WHERE id = listings.id)
    AND expires_at  IS NOT DISTINCT FROM (SELECT expires_at  FROM public.listings WHERE id = listings.id)
  );

-- listings INSERT: restrict status/plan to safe defaults on creation.
DROP POLICY IF EXISTS "Owners insert listings" ON public.listings;
CREATE POLICY "Owners insert listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('draft'::listing_status, 'active'::listing_status, 'pending_sale'::listing_status)
    AND boost_until IS NULL
  );

-- 3. tow_requests: let a towing provider accept a broadcast (provider_id IS NULL) request.
DROP POLICY IF EXISTS "Requesters update own tow requests" ON public.tow_requests;
CREATE POLICY "Tow request participants update"
  ON public.tow_requests FOR UPDATE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = provider_id
    OR (provider_id IS NULL AND status = 'open' AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = requester_id
    OR auth.uid() = provider_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. ride_likes: remove public read; restrict to owner + ride owner.
DROP POLICY IF EXISTS "Ride likes public read" ON public.ride_likes;
CREATE POLICY "Ride likes own read"
  ON public.ride_likes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_likes.ride_id AND r.user_id = auth.uid())
  );

-- 5. business_tag_links: only expose tags for businesses that are publicly visible.
DROP POLICY IF EXISTS "Tag links public read" ON public.business_tag_links;
CREATE POLICY "Tag links visible for active businesses"
  ON public.business_tag_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_tag_links.business_id AND b.status = 'active'::business_status)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_tag_links.business_id AND b.owner_id = auth.uid())
    OR can_moderate(auth.uid())
  );
