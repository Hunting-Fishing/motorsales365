-- Add last_name column to water_delivery_customers
ALTER TABLE public.water_delivery_customers 
ADD COLUMN last_name text;

-- Add commercial account specific fields
ALTER TABLE public.water_delivery_customers 
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS billing_contact_name text,
ADD COLUMN IF NOT EXISTS billing_contact_email text,
ADD COLUMN IF NOT EXISTS billing_contact_phone text;

-- Rename contact_name to first_name for clarity
ALTER TABLE public.water_delivery_customers 
RENAME COLUMN contact_name TO first_name;