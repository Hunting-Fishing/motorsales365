
CREATE TABLE public.business_location_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proposed_lat numeric NOT NULL,
  proposed_lng numeric NOT NULL,
  previous_lat numeric,
  previous_lng numeric,
  note text,
  submitter_user_id uuid,
  submitter_ip text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','reverted')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loc_lat_range CHECK (proposed_lat BETWEEN -90 AND 90),
  CONSTRAINT loc_lng_range CHECK (proposed_lng BETWEEN -180 AND 180),
  CONSTRAINT loc_note_len CHECK (note IS NULL OR char_length(note) <= 300)
);

CREATE INDEX idx_blc_status_created ON public.business_location_corrections (status, created_at DESC);
CREATE INDEX idx_blc_business ON public.business_location_corrections (business_id);
CREATE INDEX idx_blc_submitter ON public.business_location_corrections (submitter_user_id);

GRANT SELECT, INSERT ON public.business_location_corrections TO anon;
GRANT SELECT, INSERT ON public.business_location_corrections TO authenticated;
GRANT ALL ON public.business_location_corrections TO service_role;

ALTER TABLE public.business_location_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) may submit a suggestion
CREATE POLICY "Anyone can submit location corrections"
  ON public.business_location_corrections
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Submitters can see their own suggestions
CREATE POLICY "Submitters read own corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (submitter_user_id = auth.uid());

-- Admins / moderators can see and update everything
CREATE POLICY "Moderators read all corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Moderators update corrections"
  ON public.business_location_corrections
  FOR UPDATE
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_blc_updated_at
  BEFORE UPDATE ON public.business_location_corrections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.business_location_corrections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_location_corrections;
