-- Add billing coordinates columns to fuel_delivery_customers table
ALTER TABLE public.fuel_delivery_customers 
ADD COLUMN IF NOT EXISTS billing_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS billing_longitude DOUBLE PRECISION;