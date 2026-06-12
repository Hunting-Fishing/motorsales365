CREATE TABLE public.listing_fitment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  trim TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_fitment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_fitment TO authenticated;
GRANT ALL ON public.listing_fitment TO service_role;

ALTER TABLE public.listing_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fitment"
  ON public.listing_fitment FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert fitment"
  ON public.listing_fitment FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can update fitment"
  ON public.listing_fitment FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can delete fitment"
  ON public.listing_fitment FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE INDEX listing_fitment_lookup_idx
  ON public.listing_fitment (lower(make), lower(model), year_min, year_max);

CREATE INDEX listing_fitment_listing_idx
  ON public.listing_fitment (listing_id);