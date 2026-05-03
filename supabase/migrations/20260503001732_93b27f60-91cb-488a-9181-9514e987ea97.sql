
-- Reorder existing 'other' and add towing
UPDATE public.categories SET sort_order = 7 WHERE slug = 'other';
INSERT INTO public.categories (slug, name, icon, sort_order)
VALUES ('towing', 'Towing & Trucking', 'truck', 6)
ON CONFLICT (slug) DO NOTHING;

-- tow_requests table
CREATE TABLE public.tow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  provider_id uuid,
  listing_id uuid,
  pickup_region text,
  pickup_province text,
  pickup_city text,
  pickup_address text,
  dropoff_region text,
  dropoff_province text,
  dropoff_city text,
  dropoff_address text,
  vehicle_summary text NOT NULL,
  needed_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tow_requests_requester ON public.tow_requests(requester_id);
CREATE INDEX idx_tow_requests_provider ON public.tow_requests(provider_id);
CREATE INDEX idx_tow_requests_status ON public.tow_requests(status);

ALTER TABLE public.tow_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tow_requests_updated_at
BEFORE UPDATE ON public.tow_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helper: is the user a towing provider (has any towing listing)?
CREATE OR REPLACE FUNCTION public.is_towing_provider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE user_id = _user_id
      AND category_slug = 'towing'
      AND status IN ('active','pending_sale')
  )
$$;

-- Policies
CREATE POLICY "Requesters insert own tow requests"
ON public.tow_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters view own tow requests"
ON public.tow_requests FOR SELECT
USING (
  auth.uid() = requester_id
  OR auth.uid() = provider_id
  OR (provider_id IS NULL AND status = 'open' AND public.is_towing_provider(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Requesters update own tow requests"
ON public.tow_requests FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Requesters delete own tow requests"
ON public.tow_requests FOR DELETE
USING (auth.uid() = requester_id OR has_role(auth.uid(), 'admin'::app_role));
