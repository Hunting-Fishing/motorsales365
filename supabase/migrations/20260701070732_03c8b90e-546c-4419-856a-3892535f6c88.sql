
-- 1) parts_outlets: remove public SELECT (all client reads go through server functions using service role)
DROP POLICY IF EXISTS "Anyone can read active outlets" ON public.parts_outlets;

-- 2) parts_supplier_applications: remove broad public row SELECT, expose safe view instead
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;

CREATE OR REPLACE VIEW public.partner_storefronts_public AS
SELECT
  storefront_slug,
  company_name,
  country,
  business_kind,
  website,
  storefront_blurb,
  storefront_logo_url,
  storefront_categories
FROM public.parts_supplier_applications
WHERE storefront_published = true
  AND storefront_slug IS NOT NULL;

GRANT SELECT ON public.partner_storefronts_public TO anon, authenticated;

-- 3) wanted_post_responses: hide contact_value from the public; keep it visible to responder & post owner
DROP POLICY IF EXISTS "Anyone can view responses to open posts" ON public.wanted_post_responses;

CREATE POLICY "Responder or post owner can view responses"
ON public.wanted_post_responses
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.wanted_posts wp
    WHERE wp.id = wanted_post_responses.wanted_post_id
      AND wp.user_id = auth.uid()
  )
);

CREATE OR REPLACE VIEW public.wanted_post_responses_public AS
SELECT
  wpr.id,
  wpr.wanted_post_id,
  wpr.user_id,
  wpr.message,
  wpr.listing_id,
  wpr.business_id,
  wpr.created_at,
  wpr.updated_at
FROM public.wanted_post_responses wpr
JOIN public.wanted_posts wp ON wp.id = wpr.wanted_post_id
WHERE wp.status = 'open';

GRANT SELECT ON public.wanted_post_responses_public TO anon, authenticated;
