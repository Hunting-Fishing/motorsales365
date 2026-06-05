
-- 1) Unlock ledger first (so the lead_offers SELECT policy can reference it)
CREATE TABLE public.lead_offer_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  price_php NUMERIC(14,2) NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, buyer_user_id)
);
CREATE INDEX idx_lead_offer_unlocks_buyer ON public.lead_offer_unlocks(buyer_user_id, unlocked_at DESC);
CREATE INDEX idx_lead_offer_unlocks_offer ON public.lead_offer_unlocks(offer_id);

GRANT SELECT, INSERT ON public.lead_offer_unlocks TO authenticated;
GRANT ALL ON public.lead_offer_unlocks TO service_role;

ALTER TABLE public.lead_offer_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unlocks"
  ON public.lead_offer_unlocks
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers read their own unlocks"
  ON public.lead_offer_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Buyers insert their own unlocks"
  ON public.lead_offer_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_user_id);

-- 2) Lead offers table
CREATE TABLE public.lead_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL,
  region TEXT,
  province TEXT,
  city TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  budget_min_php NUMERIC(14,2),
  budget_max_php NUMERIC(14,2),
  urgency TEXT NOT NULL DEFAULT 'standard' CHECK (urgency IN ('low','standard','urgent')),
  preview TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_notes TEXT,
  source_kind TEXT,
  source_id UUID,
  price_php NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','sold','expired','withdrawn')),
  max_unlocks INTEGER NOT NULL DEFAULT 1,
  unlocks_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_offers_open ON public.lead_offers(status, posted_at DESC) WHERE status = 'open';
CREATE INDEX idx_lead_offers_category ON public.lead_offers(category_slug) WHERE status = 'open';
CREATE INDEX idx_lead_offers_region ON public.lead_offers(region) WHERE status = 'open';

-- FK from unlocks → offers, added now that both exist
ALTER TABLE public.lead_offer_unlocks
  ADD CONSTRAINT lead_offer_unlocks_offer_id_fkey
  FOREIGN KEY (offer_id) REFERENCES public.lead_offers(id) ON DELETE CASCADE;

GRANT SELECT ON public.lead_offers TO authenticated;
GRANT ALL ON public.lead_offers TO service_role;

ALTER TABLE public.lead_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead offers"
  ON public.lead_offers
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers read their unlocked offers"
  ON public.lead_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_offer_unlocks u
      WHERE u.offer_id = lead_offers.id
        AND u.buyer_user_id = auth.uid()
    )
  );

-- 3) Public redacted view (no PII)
CREATE OR REPLACE VIEW public.lead_offers_public AS
SELECT
  id,
  category_slug,
  region,
  province,
  city,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  budget_min_php,
  budget_max_php,
  urgency,
  preview,
  price_php,
  max_unlocks,
  unlocks_count,
  posted_at,
  expires_at,
  status
FROM public.lead_offers
WHERE status = 'open'
  AND (expires_at IS NULL OR expires_at > now());

GRANT SELECT ON public.lead_offers_public TO anon;
GRANT SELECT ON public.lead_offers_public TO authenticated;

CREATE TRIGGER trg_lead_offers_updated_at
  BEFORE UPDATE ON public.lead_offers
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
