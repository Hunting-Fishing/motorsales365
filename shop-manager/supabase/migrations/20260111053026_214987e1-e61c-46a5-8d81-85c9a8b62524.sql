-- Add OSM-related columns to existing fuel_stations table
ALTER TABLE public.fuel_stations 
ADD COLUMN IF NOT EXISTS osm_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS regular_price INTEGER,
ADD COLUMN IF NOT EXISTS diesel_price INTEGER,
ADD COLUMN IF NOT EXISTS premium_price INTEGER,
ADD COLUMN IF NOT EXISTS opening_hours TEXT,
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Rename state to province if needed (state exists, province doesn't)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_stations' AND column_name = 'state' AND table_schema = 'public') THEN
        ALTER TABLE public.fuel_stations RENAME COLUMN state TO province;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fuel_stations_osm_id ON public.fuel_stations (osm_id);
CREATE INDEX IF NOT EXISTS idx_fuel_stations_city_province ON public.fuel_stations (city, province);
CREATE INDEX IF NOT EXISTS idx_fuel_stations_coords ON public.fuel_stations (latitude, longitude);

-- Add comment for documentation
COMMENT ON TABLE public.fuel_stations IS 'Fuel station locations with prices - includes data from OpenStreetMap';