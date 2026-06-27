
-- Commission rules per merchant
CREATE TABLE public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL UNIQUE,
  rate_bps integer NOT NULL DEFAULT 0,            -- basis points of order_amount (500 = 5.00%)
  flat_fee_cents integer NOT NULL DEFAULT 0,      -- per-conversion flat fee we earn
  per_listing_fee_cents integer NOT NULL DEFAULT 0, -- bonus when conversion attributed to a listing
  boost_multiplier_bps integer NOT NULL DEFAULT 10000, -- 10000 = 1.00x; e.g. 12000 = 1.2x for boosted
  currency text NOT NULL DEFAULT 'PHP',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_rules TO authenticated;
GRANT ALL ON public.affiliate_commission_rules TO service_role;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage commission rules" ON public.affiliate_commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conversions posted from merchant networks
CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL,
  network text,                       -- 'involve_asia' | 'amazon' | 'ebay' | 'partner' | custom
  external_id text,                   -- merchant order id (unique per network)
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  listing_id uuid,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  order_amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  reported_commission_cents bigint,   -- what the network said they'll pay us (optional)
  computed_commission_cents bigint NOT NULL DEFAULT 0, -- derived from rules
  was_boosted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending|confirmed|reversed|paid
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, external_id)
);
CREATE INDEX affiliate_conversions_supplier_idx ON public.affiliate_conversions (supplier_slug, occurred_at DESC);
CREATE INDEX affiliate_conversions_listing_idx ON public.affiliate_conversions (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write conversions" ON public.affiliate_conversions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-network postback secrets (HMAC shared key)
CREATE TABLE public.affiliate_postback_secrets (
  network text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_postback_secrets TO authenticated;
GRANT ALL ON public.affiliate_postback_secrets TO service_role;
ALTER TABLE public.affiliate_postback_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage postback secrets" ON public.affiliate_postback_secrets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_affiliate_commission_rules_updated
  BEFORE UPDATE ON public.affiliate_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_conversions_updated
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_postback_secrets_updated
  BEFORE UPDATE ON public.affiliate_postback_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules for existing active suppliers (5% rate, idempotent)
INSERT INTO public.affiliate_commission_rules (supplier_slug, rate_bps, currency, notes)
SELECT supplier_slug, 500, 'PHP', 'Auto-seeded default 5%'
FROM public.affiliate_links
WHERE is_active = true
ON CONFLICT (supplier_slug) DO NOTHING;
