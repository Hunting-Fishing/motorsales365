-- Phase 1: Database Structure Fixes (Corrected)

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

-- Add work_order_number where missing using a simple approach
UPDATE work_orders 
SET work_order_number = 'WO-' || SUBSTRING(id::text, 1, 8)
WHERE work_order_number IS NULL;

-- Add urgency_level where missing (this field exists)
UPDATE work_orders 
SET urgency_level = 'medium'
WHERE urgency_level IS NULL;

-- Enable realtime for work_orders table
ALTER TABLE work_orders REPLICA IDENTITY FULL;