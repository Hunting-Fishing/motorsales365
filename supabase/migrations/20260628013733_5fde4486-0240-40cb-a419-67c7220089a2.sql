
-- Filter selection events from /parts wizard
CREATE TABLE public.parts_filter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  make TEXT,
  model TEXT,
  year INTEGER,
  country TEXT,
  session_id TEXT,
  user_id UUID,
  referrer TEXT,
  user_agent TEXT
);
CREATE INDEX parts_filter_events_created_at_idx ON public.parts_filter_events (created_at DESC);
CREATE INDEX parts_filter_events_make_model_idx ON public.parts_filter_events (make, model);

GRANT INSERT ON public.parts_filter_events TO anon, authenticated;
GRANT ALL ON public.parts_filter_events TO service_role;

ALTER TABLE public.parts_filter_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon visitors) can log a filter event; no reads from public.
CREATE POLICY "anyone can log filter events"
  ON public.parts_filter_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read filter events"
  ON public.parts_filter_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add product attribution to affiliate_clicks so we know which ingested tile was clicked.
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS partner_sku TEXT,
  ADD COLUMN IF NOT EXISTS product_title TEXT;
