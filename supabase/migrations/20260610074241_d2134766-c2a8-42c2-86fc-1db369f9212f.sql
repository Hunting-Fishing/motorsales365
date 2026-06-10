
ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'emergency',
  ADD COLUMN IF NOT EXISTS situation text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_trim text,
  ADD COLUMN IF NOT EXISTS vehicle_drivetrain text,
  ADD COLUMN IF NOT EXISTS vehicle_transmission text,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url text,
  ADD COLUMN IF NOT EXISTS ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS damage_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_roll boolean,
  ADD COLUMN IF NOT EXISTS can_steer boolean,
  ADD COLUMN IF NOT EXISTS can_brake boolean,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision;

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_urgency_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_urgency_check
  CHECK (urgency IN ('emergency','time_sensitive','scheduled'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_situation_check
  CHECK (situation IS NULL OR situation IN ('breakdown','accident','flat_tire','no_start','no_fuel','winch','other'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_drivetrain_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_drivetrain_check
  CHECK (vehicle_drivetrain IS NULL OR vehicle_drivetrain IN ('FWD','RWD','AWD','4x4','unknown'));
