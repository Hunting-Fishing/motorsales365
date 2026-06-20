
CREATE TABLE public.qr_lead_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  contact text NOT NULL CHECK (char_length(contact) BETWEEN 3 AND 200),
  interest_type text NOT NULL CHECK (interest_type IN ('buying_vehicle','selling_vehicle','business_listing','parts','services','other')),
  interest_detail text CHECK (interest_detail IS NULL OR char_length(interest_detail) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed','archived')),
  notes text,
  visitor_id text,
  user_agent text,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_lead_captures_created_at ON public.qr_lead_captures (created_at DESC);
CREATE INDEX idx_qr_lead_captures_status ON public.qr_lead_captures (status);
CREATE INDEX idx_qr_lead_captures_referral_code ON public.qr_lead_captures (referral_code);

GRANT INSERT ON public.qr_lead_captures TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.qr_lead_captures TO authenticated;
GRANT ALL ON public.qr_lead_captures TO service_role;

ALTER TABLE public.qr_lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a QR lead"
  ON public.qr_lead_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view QR leads"
  ON public.qr_lead_captures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update QR leads"
  ON public.qr_lead_captures
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete QR leads"
  ON public.qr_lead_captures
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qr_lead_captures_updated_at
  BEFORE UPDATE ON public.qr_lead_captures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
