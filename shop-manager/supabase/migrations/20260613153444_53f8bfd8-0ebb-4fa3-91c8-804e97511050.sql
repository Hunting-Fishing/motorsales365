ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS automotive_region text NOT NULL DEFAULT 'asia-ph';

CREATE TABLE IF NOT EXISTS public.auto_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  source_agency text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  affected_makes text[] NOT NULL DEFAULT '{}',
  affected_models text[] NOT NULL DEFAULT '{}',
  year_from int,
  year_to int,
  issued_at date,
  remedy text,
  source_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, source_id)
);
GRANT SELECT ON public.auto_recalls TO anon, authenticated;
GRANT ALL ON public.auto_recalls TO service_role;
ALTER TABLE public.auto_recalls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auto_recalls' AND policyname='Public read auto_recalls') THEN
    CREATE POLICY "Public read auto_recalls" ON public.auto_recalls FOR SELECT USING (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS auto_recalls_region_idx ON public.auto_recalls(region);
CREATE INDEX IF NOT EXISTS auto_recalls_issued_idx ON public.auto_recalls(issued_at DESC);

CREATE TABLE IF NOT EXISTS public.auto_tsbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  manufacturer text NOT NULL,
  bulletin_no text NOT NULL,
  title text NOT NULL,
  affected_makes text[] NOT NULL DEFAULT '{}',
  affected_models text[] NOT NULL DEFAULT '{}',
  year_from int,
  year_to int,
  issued_at date,
  severity text NOT NULL DEFAULT 'medium',
  source_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, manufacturer, bulletin_no)
);
GRANT SELECT ON public.auto_tsbs TO anon, authenticated;
GRANT ALL ON public.auto_tsbs TO service_role;
ALTER TABLE public.auto_tsbs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auto_tsbs' AND policyname='Public read auto_tsbs') THEN
    CREATE POLICY "Public read auto_tsbs" ON public.auto_tsbs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auto_tsbs' AND policyname='Authenticated insert auto_tsbs') THEN
    CREATE POLICY "Authenticated insert auto_tsbs" ON public.auto_tsbs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS auto_tsbs_region_idx ON public.auto_tsbs(region);

CREATE TABLE IF NOT EXISTS public.auto_dtc_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('generic','manufacturer')),
  manufacturer text,
  applicable_regions text[] NOT NULL DEFAULT '{asia-ph,asia,europe,north-america}',
  description text NOT NULL,
  symptoms text,
  common_causes text,
  severity text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auto_dtc_codes_code_mfr_uidx
  ON public.auto_dtc_codes (code, COALESCE(manufacturer, ''));
GRANT SELECT ON public.auto_dtc_codes TO anon, authenticated;
GRANT ALL ON public.auto_dtc_codes TO service_role;
ALTER TABLE public.auto_dtc_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auto_dtc_codes' AND policyname='Public read auto_dtc_codes') THEN
    CREATE POLICY "Public read auto_dtc_codes" ON public.auto_dtc_codes FOR SELECT USING (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS auto_dtc_codes_code_idx ON public.auto_dtc_codes(code);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='auto_recalls_touch') THEN
    CREATE TRIGGER auto_recalls_touch BEFORE UPDATE ON public.auto_recalls
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='auto_tsbs_touch') THEN
    CREATE TRIGGER auto_tsbs_touch BEFORE UPDATE ON public.auto_tsbs
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='auto_dtc_codes_touch') THEN
    CREATE TRIGGER auto_dtc_codes_touch BEFORE UPDATE ON public.auto_dtc_codes
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
