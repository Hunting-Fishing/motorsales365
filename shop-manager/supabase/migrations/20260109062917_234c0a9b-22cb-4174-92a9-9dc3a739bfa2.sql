-- Add delivery schedule fields to fuel_delivery_locations for route planning
ALTER TABLE public.fuel_delivery_locations 
ADD COLUMN IF NOT EXISTS delivery_days integer[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_frequency text DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS preferred_delivery_time text DEFAULT NULL;

-- delivery_days: array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
-- delivery_frequency: 'weekly', 'bi_weekly', 'monthly', 'on_demand'

COMMENT ON COLUMN public.fuel_delivery_locations.delivery_days IS 'Array of day numbers (0=Sunday through 6=Saturday) for scheduled deliveries';
COMMENT ON COLUMN public.fuel_delivery_locations.delivery_frequency IS 'Frequency of deliveries: weekly, bi_weekly, monthly, on_demand';
COMMENT ON COLUMN public.fuel_delivery_locations.preferred_delivery_time IS 'Preferred time window for deliveries';