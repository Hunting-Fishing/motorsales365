-- Track price changes for listings so we can show price drops in a live feed.
CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price_php numeric NOT NULL,
  new_price_php numeric NOT NULL,
  delta_php numeric NOT NULL,
  delta_pct numeric NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_price_history_changed_at
  ON public.listing_price_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_price_history_listing
  ON public.listing_price_history (listing_id, changed_at DESC);

ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history for active/pending listings (public marketplace data).
DROP POLICY IF EXISTS "Public can read price history for visible listings" ON public.listing_price_history;
CREATE POLICY "Public can read price history for visible listings"
  ON public.listing_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_price_history.listing_id
        AND l.status IN ('active','pending_sale')
    )
  );

-- Trigger to capture price changes
CREATE OR REPLACE FUNCTION public.tg_listing_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old numeric := COALESCE(OLD.price_php, 0);
  v_new numeric := COALESCE(NEW.price_php, 0);
  v_delta numeric;
  v_pct numeric;
BEGIN
  IF v_old = v_new OR v_old <= 0 OR v_new <= 0 THEN
    RETURN NEW;
  END IF;
  v_delta := v_new - v_old;
  v_pct := ROUND((v_delta / v_old) * 100.0, 2);
  INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct)
  VALUES (NEW.id, v_old, v_new, v_delta, v_pct);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_price_history ON public.listings;
CREATE TRIGGER trg_listing_price_history
AFTER UPDATE OF price_php ON public.listings
FOR EACH ROW
WHEN (OLD.price_php IS DISTINCT FROM NEW.price_php)
EXECUTE FUNCTION public.tg_listing_price_history();

-- Enable realtime for the activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_price_history;