-- Fix duplicate foreign key constraints on work_orders table

-- First, let's check current foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'work_orders'::regclass 
AND contype = 'f';

-- Remove any duplicate or problematic foreign key constraints on vehicle_id
-- Keep only the main foreign key constraint
DO $$
BEGIN
  -- Drop any duplicate foreign key constraints on vehicle_id if they exist
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%vehicle_id%' 
    AND conrelid = 'work_orders'::regclass 
    AND contype = 'f'
  ) THEN
    -- Drop all vehicle_id foreign keys and recreate a single clean one
    EXECUTE 'ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_vehicle_id_fkey';
    EXECUTE 'ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_vehicle_id_fkey1';
    EXECUTE 'ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_vehicle_id_fkey2';
    
    -- Recreate the single correct foreign key constraint
    EXECUTE 'ALTER TABLE work_orders ADD CONSTRAINT work_orders_vehicle_id_fkey 
             FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)';
  END IF;
  
  -- Also ensure customers foreign key is clean
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%customer_id%' 
    AND conrelid = 'work_orders'::regclass 
    AND contype = 'f'
  ) THEN
    -- Clean up customer_id foreign keys
    EXECUTE 'ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_customer_id_fkey1';
    EXECUTE 'ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_customer_id_fkey2';
    
    -- Ensure we have the main constraint
    EXECUTE 'ALTER TABLE work_orders ADD CONSTRAINT work_orders_customer_id_fkey 
             FOREIGN KEY (customer_id) REFERENCES customers(id)
             ON DELETE CASCADE';
  END IF;
END $$;