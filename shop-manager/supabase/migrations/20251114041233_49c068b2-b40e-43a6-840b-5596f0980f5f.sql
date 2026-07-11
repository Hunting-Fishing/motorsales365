-- Make technician_id foreign key constraint deferrable or drop and recreate as nullable
-- First, check if the constraint allows NULL values

-- Drop the existing foreign key constraint
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_technician_id_fkey;

ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS fk_work_orders_technician;

-- Recreate the foreign key constraint to allow NULL values
ALTER TABLE work_orders
ADD CONSTRAINT fk_work_orders_technician 
FOREIGN KEY (technician_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;