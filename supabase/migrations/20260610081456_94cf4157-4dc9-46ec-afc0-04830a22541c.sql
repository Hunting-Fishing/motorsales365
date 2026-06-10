ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_situation_check CHECK (situation IS NULL OR (situation = ANY (ARRAY['breakdown'::text, 'accident'::text, 'flat_tire'::text, 'no_start'::text, 'no_fuel'::text, 'winch'::text, 'jump_start'::text, 'dead_battery'::text, 'lockout'::text, 'other'::text])));
ALTER TABLE public.tow_requests ADD COLUMN IF NOT EXISTS passenger_count integer;
ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_passenger_count_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_passenger_count_check CHECK (passenger_count IS NULL OR (passenger_count >= 0 AND passenger_count <= 50));