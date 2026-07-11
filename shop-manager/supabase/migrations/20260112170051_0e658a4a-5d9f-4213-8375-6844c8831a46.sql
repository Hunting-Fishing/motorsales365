-- Add latitude and longitude columns to water_delivery_settings for business location
ALTER TABLE public.water_delivery_settings 
ADD COLUMN IF NOT EXISTS business_latitude double precision,
ADD COLUMN IF NOT EXISTS business_longitude double precision;