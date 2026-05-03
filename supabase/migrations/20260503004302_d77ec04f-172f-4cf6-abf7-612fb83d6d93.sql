
-- =========================
-- tow_bids
-- =========================
CREATE TABLE public.tow_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tow_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  price_php numeric NOT NULL CHECK (price_php >= 0),
  eta_minutes integer,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, provider_id)
);

CREATE INDEX idx_tow_bids_request ON public.tow_bids(request_id);
CREATE INDEX idx_tow_bids_provider ON public.tow_bids(provider_id);

ALTER TABLE public.tow_bids ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_tow_bids_updated_at
BEFORE UPDATE ON public.tow_bids
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Providers see/manage their own bids; requesters see bids on their requests; admins manage all.
CREATE POLICY "Providers manage own bids"
ON public.tow_bids
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id AND public.is_towing_provider(auth.uid()));

CREATE POLICY "Requesters view bids on own requests"
ON public.tow_bids
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tow_requests r
    WHERE r.id = tow_bids.request_id AND r.requester_id = auth.uid()
  )
);

CREATE POLICY "Requesters accept bids on own requests"
ON public.tow_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tow_requests r
    WHERE r.id = tow_bids.request_id AND r.requester_id = auth.uid()
  )
);

CREATE POLICY "Admins manage tow_bids"
ON public.tow_bids
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Acceptance trigger
-- =========================
CREATE OR REPLACE FUNCTION public.handle_tow_bid_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  loser record;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO req FROM public.tow_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Update parent request
  UPDATE public.tow_requests
  SET status = 'accepted', provider_id = NEW.provider_id, updated_at = now()
  WHERE id = NEW.request_id;

  -- Decline siblings
  UPDATE public.tow_bids
  SET status = 'declined', updated_at = now()
  WHERE request_id = NEW.request_id AND id <> NEW.id AND status = 'pending';

  -- Notify winner
  INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
  VALUES (
    req.requester_id, NEW.provider_id, req.listing_id,
    'Your bid of ₱' || NEW.price_php || ' was accepted for "' || req.vehicle_summary
      || '". I''ll be in touch with the next steps.'
  );

  -- Notify losers
  FOR loser IN
    SELECT provider_id FROM public.tow_bids
    WHERE request_id = NEW.request_id AND id <> NEW.id AND status = 'declined'
  LOOP
    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
    VALUES (
      req.requester_id, loser.provider_id, req.listing_id,
      'Thanks for bidding on "' || req.vehicle_summary || '" — the customer chose another provider this time.'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_tow_bid_accepted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tg_handle_tow_bid_accepted
AFTER UPDATE ON public.tow_bids
FOR EACH ROW
EXECUTE FUNCTION public.handle_tow_bid_accepted();

-- Realtime
ALTER TABLE public.tow_bids REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tow_bids'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_bids';
  END IF;
END $$;

-- =========================
-- provider_tow_rates
-- =========================
CREATE TABLE public.provider_tow_rates (
  user_id uuid PRIMARY KEY,
  flat_base_php numeric,
  per_km_php numeric,
  min_php numeric,
  available_24_7 boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_tow_rates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_provider_tow_rates_updated_at
BEFORE UPDATE ON public.provider_tow_rates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Provider rates public read"
ON public.provider_tow_rates FOR SELECT USING (true);

CREATE POLICY "Owners manage own rates"
ON public.provider_tow_rates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage rates"
ON public.provider_tow_rates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
