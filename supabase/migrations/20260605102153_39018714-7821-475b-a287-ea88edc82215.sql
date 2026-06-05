
DROP VIEW IF EXISTS public.lead_offers_public;

CREATE OR REPLACE FUNCTION public.list_open_lead_offers(
  _category_slug TEXT DEFAULT NULL,
  _region TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  category_slug TEXT,
  region TEXT,
  province TEXT,
  city TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  budget_min_php NUMERIC,
  budget_max_php NUMERIC,
  urgency TEXT,
  preview TEXT,
  price_php NUMERIC,
  max_unlocks INTEGER,
  unlocks_count INTEGER,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.category_slug,
    o.region,
    o.province,
    o.city,
    o.vehicle_make,
    o.vehicle_model,
    o.vehicle_year,
    o.budget_min_php,
    o.budget_max_php,
    o.urgency,
    o.preview,
    o.price_php,
    o.max_unlocks,
    o.unlocks_count,
    o.posted_at,
    o.expires_at
  FROM public.lead_offers o
  WHERE o.status = 'open'
    AND (o.expires_at IS NULL OR o.expires_at > now())
    AND (_category_slug IS NULL OR o.category_slug = _category_slug)
    AND (_region IS NULL OR o.region = _region)
  ORDER BY
    CASE o.urgency WHEN 'urgent' THEN 0 WHEN 'standard' THEN 1 ELSE 2 END,
    o.posted_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 60), 200));
$$;

REVOKE ALL ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) TO authenticated;
