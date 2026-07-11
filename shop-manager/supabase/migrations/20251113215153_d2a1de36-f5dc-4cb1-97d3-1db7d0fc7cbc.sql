-- Fix search_path for the new function by recreating it properly
DROP TRIGGER IF EXISTS trigger_update_maintenance_request_timestamp ON public.maintenance_request_updates;
DROP FUNCTION IF EXISTS update_maintenance_request_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_maintenance_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.maintenance_requests
  SET updated_at = now()
  WHERE id = NEW.maintenance_request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_maintenance_request_timestamp
  AFTER INSERT ON public.maintenance_request_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_request_timestamp();