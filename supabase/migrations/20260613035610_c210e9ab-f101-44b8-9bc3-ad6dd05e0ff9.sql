ALTER TABLE public.listing_price_history
  ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT 'asking';

CREATE OR REPLACE FUNCTION public.tg_listing_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old numeric;
  v_new numeric;
  v_delta numeric;
  v_pct numeric;
BEGIN
  v_old := COALESCE(OLD.price_php, 0);
  v_new := COALESCE(NEW.price_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'asking');
  END IF;
  v_old := COALESCE(OLD.monthly_php, 0);
  v_new := COALESCE(NEW.monthly_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'monthly');
  END IF;
  v_old := COALESCE(OLD.down_payment_php, 0);
  v_new := COALESCE(NEW.down_payment_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'down_payment');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  label text NOT NULL,
  percent_off numeric(5,2),
  amount_off_php numeric(14,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing_active
  ON public.listing_promotions(listing_id, ends_at DESC);

GRANT SELECT ON public.listing_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;

ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promos for visible listings"
  ON public.listing_promotions FOR SELECT
  USING (
    ends_at > now() AND starts_at <= now() AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_promotions.listing_id
        AND l.status IN ('active','pending_sale')
    )
  );

CREATE POLICY "Owners manage own listing promos"
  ON public.listing_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

CREATE POLICY "Staff manage all listing promos"
  ON public.listing_promotions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role));

CREATE TRIGGER trg_listing_promotions_updated
  BEFORE UPDATE ON public.listing_promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_listing_price_trend(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.changed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trend(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_trends(_listing_ids uuid[])
RETURNS TABLE(
  listing_id uuid,
  field text,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (h.listing_id) h.listing_id, h.field, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = ANY(_listing_ids)
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.listing_id, h.changed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trends(uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_history(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
  ORDER BY h.changed_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_history(uuid) TO anon, authenticated, service_role;
