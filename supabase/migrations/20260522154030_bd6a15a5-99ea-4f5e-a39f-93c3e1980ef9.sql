
CREATE TABLE public.ride_service_log_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id uuid NOT NULL REFERENCES public.ride_service_log(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_service_log_photos_log_id ON public.ride_service_log_photos(log_id, sort_order);

ALTER TABLE public.ride_service_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service log photos public read"
ON public.ride_service_log_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id
    AND (r.status = 'published'::ride_status OR r.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Owners manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
));

CREATE POLICY "Admins manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 100 THEN
    RAISE EXCEPTION 'A service log entry can have at most 100 photos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_log_photo_limit
BEFORE INSERT ON public.ride_service_log_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_log_photo_limit();
