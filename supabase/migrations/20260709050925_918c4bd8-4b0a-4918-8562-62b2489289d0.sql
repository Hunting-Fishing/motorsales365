
ALTER TABLE public.franchise_memberships
  DROP CONSTRAINT IF EXISTS franchise_memberships_status_check;
ALTER TABLE public.franchise_memberships
  ADD CONSTRAINT franchise_memberships_status_check
  CHECK (status IN ('pending_payment','active','past_due','suspended','cancelled'));

ALTER TABLE public.franchise_memberships
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_tier_slug TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_franchise_memberships_stripe_sub
  ON public.franchise_memberships(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.franchise_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_setup_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_synced_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.list_public_partners(
  _tier_slug TEXT DEFAULT NULL,
  _province TEXT DEFAULT NULL,
  _limit INT DEFAULT 60
)
RETURNS TABLE (
  membership_id UUID,
  tier_slug TEXT,
  tier_name TEXT,
  member_number TEXT,
  started_at TIMESTAMPTZ,
  business_id UUID,
  business_name TEXT,
  business_slug TEXT,
  city TEXT,
  province TEXT,
  logo_url TEXT,
  cover_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS membership_id,
    m.tier_slug,
    t.name AS tier_name,
    m.member_number,
    m.started_at,
    b.id AS business_id,
    b.name AS business_name,
    b.slug AS business_slug,
    b.city,
    b.province,
    b.logo_url,
    b.cover_url
  FROM public.franchise_memberships m
  JOIN public.businesses b ON b.id = m.business_id
  LEFT JOIN public.franchise_tiers t ON t.slug = m.tier_slug
  WHERE m.status = 'active'
    AND m.business_id IS NOT NULL
    AND b.status = 'active'
    AND (_tier_slug IS NULL OR m.tier_slug = _tier_slug)
    AND (_province IS NULL OR lower(b.province) = lower(_province))
  ORDER BY t.sort_order NULLS LAST, m.started_at DESC
  LIMIT GREATEST(1, LEAST(200, _limit));
$$;

GRANT EXECUTE ON FUNCTION public.list_public_partners(TEXT, TEXT, INT) TO anon, authenticated;
