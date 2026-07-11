-- Add latitude/longitude columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add latitude/longitude columns to power_washing_jobs table  
ALTER TABLE power_washing_jobs 
ADD COLUMN IF NOT EXISTS property_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS property_longitude DOUBLE PRECISION;

-- Create indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_customers_location 
ON customers(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pw_jobs_location 
ON power_washing_jobs(property_latitude, property_longitude) 
WHERE property_latitude IS NOT NULL AND property_longitude IS NOT NULL;