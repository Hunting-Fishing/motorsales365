-- Currencies table for multi-currency display
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  rate_to_php numeric NOT NULL CHECK (rate_to_php > 0),
  decimals smallint NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  auto_update boolean NOT NULL DEFAULT true,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Currencies public read" ON public.currencies;
CREATE POLICY "Currencies public read" ON public.currencies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage currencies" ON public.currencies;
CREATE POLICY "Admins manage currencies" ON public.currencies
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed rates. rate_to_php = how many PHP per 1 unit of the currency.
-- Approximate snapshot; the FX refresher will keep them current.
INSERT INTO public.currencies (code, name, symbol, rate_to_php, decimals, sort_order) VALUES
  ('PHP', 'Philippine Peso',   '₱',  1.0,      2, 0),
  ('USD', 'US Dollar',          '$',  57.50,   2, 1),
  ('EUR', 'Euro',               '€',  62.00,   2, 2),
  ('JPY', 'Japanese Yen',       '¥',   0.37,   0, 3),
  ('SGD', 'Singapore Dollar',   'S$', 42.30,   2, 4),
  ('AED', 'UAE Dirham',         'د.إ',15.65,   2, 5),
  ('AUD', 'Australian Dollar',  'A$', 37.80,   2, 6),
  ('GBP', 'British Pound',      '£',  72.50,   2, 7)
ON CONFLICT (code) DO NOTHING;

-- Bulk upsert RPC, callable by service role from the FX refresher
CREATE OR REPLACE FUNCTION public.upsert_currency_rates(_rates jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  -- Only service role can call this (RLS bypass intentional for cron-driven refresh)
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT (e->>'code')::text AS code, (e->>'rate_to_php')::numeric AS rate
    FROM jsonb_array_elements(_rates) e
  LOOP
    UPDATE public.currencies
       SET rate_to_php = r.rate,
           last_updated_at = now()
     WHERE code = r.code AND auto_update = true AND rate > 0;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;