
CREATE TABLE public.oem_parts_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  vin text NULL,
  make text NULL,
  model text NULL,
  year int NULL,
  trim text NULL,
  engine text NULL,
  parts_description text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed_won','closed_lost')),
  admin_notes text NULL,
  source text NOT NULL DEFAULT 'parts_page',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.oem_parts_interest TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.oem_parts_interest TO authenticated;
GRANT ALL ON public.oem_parts_interest TO service_role;

ALTER TABLE public.oem_parts_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit OEM parts interest"
  ON public.oem_parts_interest FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view OEM parts interest"
  ON public.oem_parts_interest FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can update OEM parts interest"
  ON public.oem_parts_interest FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete OEM parts interest"
  ON public.oem_parts_interest FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_oem_parts_interest_updated_at
  BEFORE UPDATE ON public.oem_parts_interest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX oem_parts_interest_status_created_at_idx
  ON public.oem_parts_interest (status, created_at DESC);
