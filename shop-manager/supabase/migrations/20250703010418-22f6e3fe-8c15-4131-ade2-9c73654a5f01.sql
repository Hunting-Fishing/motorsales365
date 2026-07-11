-- Clean up duplicate foreign key constraints between vehicles and customers tables
-- Drop the duplicate constraints, keeping only the standard one

-- Drop the duplicate foreign key constraints
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_customer;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_customer_id;

-- Keep the standard constraint: vehicles_customer_id_fkey
-- This should already exist and is the one we want to maintain