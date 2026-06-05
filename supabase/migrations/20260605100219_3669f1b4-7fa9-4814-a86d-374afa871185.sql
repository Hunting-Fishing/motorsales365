ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS category_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_advertisements_category_sponsor ON public.advertisements (category_slug, priority DESC) WHERE status = 'active'::ad_status AND placement = 'category_banner'::ad_placement;
DROP VIEW IF EXISTS public.active_ads_public;
CREATE VIEW public.active_ads_public AS
SELECT id, title, caption, image_url, target_url, placement, category_slug, priority, starts_at, ends_at, created_at
FROM public.advertisements
WHERE status = 'active'::ad_status
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now());
GRANT SELECT ON public.active_ads_public TO anon, authenticated;