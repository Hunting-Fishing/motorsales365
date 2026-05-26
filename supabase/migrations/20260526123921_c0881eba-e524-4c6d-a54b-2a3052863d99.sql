
-- 1) listing_boosts: drop public read, add a thin public view
DROP POLICY IF EXISTS "Boosts public read" ON public.listing_boosts;

CREATE POLICY "Owners read own boosts"
  ON public.listing_boosts FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE OR REPLACE VIEW public.listing_active_boosts
WITH (security_invoker = on) AS
SELECT
  listing_id,
  product_slug,
  starts_at,
  ends_at
FROM public.listing_boosts
WHERE (starts_at IS NULL OR starts_at <= now())
  AND (ends_at   IS NULL OR ends_at   >= now());

GRANT SELECT ON public.listing_active_boosts TO anon, authenticated;

-- 2) advertisements: drop column-leaking public policy, expose a safe view
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;

CREATE OR REPLACE VIEW public.active_ads_public
WITH (security_invoker = on) AS
SELECT
  id,
  title,
  caption,
  image_url,
  target_url,
  placement,
  priority,
  starts_at,
  ends_at,
  created_at
FROM public.advertisements
WHERE status = 'active'
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at   IS NULL OR ends_at   >= now());

-- Allow anon access to the view (the view itself filters down to safe columns).
-- The underlying table still needs RLS to permit reads via the view in security_invoker mode.
CREATE POLICY "Public reads active-ad safe columns"
  ON public.advertisements FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >= now())
  );

-- ^ NOTE: this still allows SELECT * via the table for anon; we mitigate by
-- pointing the client and getActiveAds() at the active_ads_public view, and
-- by REVOKEing column SELECT on the sensitive columns from anon.
REVOKE SELECT (advertiser_email, advertiser_name) ON public.advertisements FROM anon, authenticated;

GRANT SELECT ON public.active_ads_public TO anon, authenticated;

-- 3) listing_views: lock down direct inserts (writes only via SECURITY DEFINER fn)
REVOKE INSERT ON public.listing_views FROM anon, authenticated, PUBLIC;
