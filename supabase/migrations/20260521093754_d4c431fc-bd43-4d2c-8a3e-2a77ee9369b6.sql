
CREATE TYPE public.ride_status AS ENUM ('draft','published','archived');
CREATE TYPE public.ride_vehicle_type AS ENUM ('car','truck','suv','van','motorcycle','scooter','atv','utv','boat','other');
CREATE TYPE public.ride_mod_category AS ENUM ('engine','drivetrain','suspension','wheels_tires','brakes','exterior','interior','audio_electronics','lighting','tuning','other');

CREATE TABLE public.rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  year int,
  make text,
  model text,
  trim text,
  color text,
  vehicle_type public.ride_vehicle_type NOT NULL DEFAULT 'car',
  engine text,
  transmission text,
  drivetrain text,
  mileage_km int,
  description text,
  cover_photo_url text,
  region text,
  city text,
  status public.ride_status NOT NULL DEFAULT 'draft',
  is_for_sale boolean NOT NULL DEFAULT false,
  linked_listing_id uuid,
  view_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rides_user ON public.rides(user_id);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_rides_published ON public.rides(published_at DESC) WHERE status='published';
CREATE INDEX idx_rides_make_model ON public.rides(make, model);
CREATE INDEX idx_rides_linked_listing ON public.rides(linked_listing_id) WHERE linked_listing_id IS NOT NULL;

CREATE TABLE public.ride_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_photos_ride ON public.ride_photos(ride_id, sort_order);

CREATE TABLE public.ride_mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  category public.ride_mod_category NOT NULL DEFAULT 'other',
  part_name text NOT NULL,
  brand text,
  cost_php numeric,
  installed_on date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_mods_ride ON public.ride_mods(ride_id);

CREATE TABLE public.ride_service_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  service_type text NOT NULL,
  mileage_km int,
  cost_php numeric,
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_service_ride ON public.ride_service_log(ride_id, service_date DESC);

CREATE TABLE public.ride_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  acquired_on date,
  sold_on date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ride_ownership_ride ON public.ride_ownership(ride_id, sort_order);

CREATE TABLE public.ride_likes (
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ride_id, user_id)
);

CREATE TRIGGER trg_rides_updated BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ride_likes_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rides SET like_count = like_count + 1 WHERE id = NEW.ride_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rides SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.ride_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_ride_likes_count
AFTER INSERT OR DELETE ON public.ride_likes
FOR EACH ROW EXECUTE FUNCTION public.ride_likes_count_sync();

CREATE OR REPLACE FUNCTION public.rides_listing_sold_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    UPDATE public.rides SET is_for_sale = false WHERE linked_listing_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rides_listing_sold
AFTER UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.rides_listing_sold_sync();

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_service_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published rides public read" ON public.rides
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert rides" ON public.rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update rides" ON public.rides
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete rides" ON public.rides
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage rides" ON public.rides
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ride photos public read" ON public.ride_photos
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride photos" ON public.ride_photos
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_photos.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride photos" ON public.ride_photos
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride mods public read" ON public.ride_mods
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride mods" ON public.ride_mods
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_mods.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride mods" ON public.ride_mods
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride service public read" ON public.ride_service_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride service" ON public.ride_service_log
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_service_log.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride service" ON public.ride_service_log
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride ownership public read" ON public.ride_ownership
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id
    AND (r.status='published' OR r.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));
CREATE POLICY "Owners manage ride ownership" ON public.ride_ownership
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_ownership.ride_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage ride ownership" ON public.ride_ownership
  FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Ride likes public read" ON public.ride_likes FOR SELECT USING (true);
CREATE POLICY "Users like rides" ON public.ride_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike rides" ON public.ride_likes FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
  VALUES ('ride-media','ride-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ride media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ride-media');
CREATE POLICY "Users upload own ride media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own ride media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own ride media" ON storage.objects
  FOR DELETE USING (bucket_id = 'ride-media' AND auth.uid()::text = (storage.foldername(name))[1]);
