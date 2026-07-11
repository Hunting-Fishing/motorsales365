-- Add missing columns for route optimization support
ALTER TABLE public.septic_routes 
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 0;

ALTER TABLE public.septic_route_stops
ADD COLUMN IF NOT EXISTS drive_time_minutes NUMERIC,
ADD COLUMN IF NOT EXISTS distance_from_previous_miles NUMERIC;