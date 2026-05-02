-- Add admin-tunable settings for Pending Sale behavior
INSERT INTO public.pricing_settings (key, label, value, description) VALUES
  ('pending_sale_boost_eligible', 'Pending Sale boost eligible', 1, 'Set to 1 to allow sellers to boost listings while they are in Pending Sale status, or 0 to restrict boosts to Active listings only.'),
  ('pending_sale_max_days', 'Pending Sale max days', 14, 'Maximum number of days a listing can stay in Pending Sale before automatically reverting to Active.')
ON CONFLICT (key) DO NOTHING;

-- Auto-expire stale Pending Sale listings back to Active
CREATE OR REPLACE FUNCTION public.expire_stale_pending_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_days numeric;
  expiry_days numeric;
  affected integer;
BEGIN
  SELECT value INTO max_days FROM public.pricing_settings WHERE key = 'pending_sale_max_days';
  SELECT value INTO expiry_days FROM public.pricing_settings WHERE key = 'listing_expiry_days';
  IF max_days IS NULL THEN max_days := 14; END IF;
  IF expiry_days IS NULL THEN expiry_days := 60; END IF;

  WITH updated AS (
    UPDATE public.listings
    SET status = 'active',
        expires_at = now() + (expiry_days || ' days')::interval,
        updated_at = now()
    WHERE status = 'pending_sale'
      AND updated_at < now() - (max_days || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM updated;
  RETURN affected;
END;
$$;