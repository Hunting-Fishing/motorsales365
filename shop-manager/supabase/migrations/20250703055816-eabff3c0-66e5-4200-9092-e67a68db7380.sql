-- Fix duplicate foreign key constraints more carefully

-- Drop duplicate vehicle_id constraints if they exist
DO $$
BEGIN
  -- Only drop duplicate constraints, keep the main one
  PERFORM 1 FROM pg_constraint 
  WHERE conname = 'work_orders_vehicle_id_fkey1' 
  AND conrelid = 'work_orders'::regclass;
  
  IF FOUND THEN
    ALTER TABLE work_orders DROP CONSTRAINT work_orders_vehicle_id_fkey1;
  END IF;
  
  PERFORM 1 FROM pg_constraint 
  WHERE conname = 'work_orders_vehicle_id_fkey2' 
  AND conrelid = 'work_orders'::regclass;
  
  IF FOUND THEN
    ALTER TABLE work_orders DROP CONSTRAINT work_orders_vehicle_id_fkey2;
  END IF;

  -- Drop duplicate customer_id constraints if they exist  
  PERFORM 1 FROM pg_constraint 
  WHERE conname = 'work_orders_customer_id_fkey1' 
  AND conrelid = 'work_orders'::regclass;
  
  IF FOUND THEN
    ALTER TABLE work_orders DROP CONSTRAINT work_orders_customer_id_fkey1;
  END IF;
  
  PERFORM 1 FROM pg_constraint 
  WHERE conname = 'work_orders_customer_id_fkey2' 
  AND conrelid = 'work_orders'::regclass;
  
  IF FOUND THEN
    ALTER TABLE work_orders DROP CONSTRAINT work_orders_customer_id_fkey2;
  END IF;
END $$;