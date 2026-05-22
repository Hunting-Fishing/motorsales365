
CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 20 THEN
    RAISE EXCEPTION 'A service log entry can have at most 20 photos';
  END IF;
  RETURN NEW;
END;
$$;
