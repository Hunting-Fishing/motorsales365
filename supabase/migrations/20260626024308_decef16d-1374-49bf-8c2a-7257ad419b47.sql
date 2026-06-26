CREATE TABLE public.jdm_chassis_codes (
  code TEXT PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  engine TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jdm_chassis_codes TO anon, authenticated;
GRANT ALL ON public.jdm_chassis_codes TO service_role;

ALTER TABLE public.jdm_chassis_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jdm_chassis_codes public read"
  ON public.jdm_chassis_codes
  FOR SELECT
  USING (true);

CREATE TRIGGER jdm_chassis_codes_set_updated_at
  BEFORE UPDATE ON public.jdm_chassis_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
