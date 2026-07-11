-- Phase 1: Database Structure Fixes

-- First, ensure the profiles table has proper structure for technicians
-- Add shop_id to work_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'shop_id') THEN
    ALTER TABLE work_orders ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_start_time ON work_orders(start_time);
CREATE INDEX IF NOT EXISTS idx_work_orders_end_time ON work_orders(end_time);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);

-- Update NULL start_time and end_time with created_at as fallback
UPDATE work_orders 
SET start_time = created_at 
WHERE start_time IS NULL;

UPDATE work_orders 
SET end_time = created_at + INTERVAL '4 hours'
WHERE end_time IS NULL;

-- Update NULL total_cost with estimated calculation
UPDATE work_orders 
SET total_cost = COALESCE(estimated_hours * 75.0, 150.0)
WHERE total_cost IS NULL OR total_cost = 0;

-- Add work_order_number where missing
UPDATE work_orders 
SET work_order_number = 'WO-' || LPAD((row_number() OVER (ORDER BY created_at))::text, 4, '0')
WHERE work_order_number IS NULL;

-- Add priority where missing  
UPDATE work_orders 
SET priority = 'medium'
WHERE priority IS NULL;

-- Enable realtime for work_orders table
ALTER TABLE work_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;