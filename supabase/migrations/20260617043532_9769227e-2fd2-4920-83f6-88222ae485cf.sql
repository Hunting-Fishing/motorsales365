
ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS max_price_php numeric,
  ADD COLUMN IF NOT EXISTS region_scope text,
  ADD COLUMN IF NOT EXISTS service_radius_km int,
  ADD COLUMN IF NOT EXISTS eta_minutes int,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_24_7 boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_business_service_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.region_scope IS NOT NULL AND NEW.region_scope NOT IN
    ('on_site','barangay','city','province','region','nationwide') THEN
    RAISE EXCEPTION 'invalid region_scope: %', NEW.region_scope;
  END IF;
  IF NEW.max_price_php IS NOT NULL AND NEW.price_php IS NOT NULL
     AND NEW.max_price_php < NEW.price_php THEN
    RAISE EXCEPTION 'max_price_php must be >= price_php';
  END IF;
  IF NEW.service_radius_km IS NOT NULL AND NEW.service_radius_km < 0 THEN
    RAISE EXCEPTION 'service_radius_km must be >= 0';
  END IF;
  IF NEW.eta_minutes IS NOT NULL AND NEW.eta_minutes < 0 THEN
    RAISE EXCEPTION 'eta_minutes must be >= 0';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_business_service_row ON public.business_services;
CREATE TRIGGER trg_validate_business_service_row
  BEFORE INSERT OR UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_service_row();

CREATE INDEX IF NOT EXISTS idx_bs_active_price ON public.business_services (active, price_php);
CREATE INDEX IF NOT EXISTS idx_bs_catalog_active ON public.business_services (catalog_id, active);
CREATE INDEX IF NOT EXISTS idx_bs_tags_gin ON public.business_services USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_bs_region_scope ON public.business_services (region_scope) WHERE region_scope IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bs_eta ON public.business_services (eta_minutes) WHERE eta_minutes IS NOT NULL;
