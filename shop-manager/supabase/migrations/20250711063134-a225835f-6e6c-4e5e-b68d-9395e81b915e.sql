-- Add ECO FEE fields to work_order_parts table
ALTER TABLE work_order_parts 
ADD COLUMN eco_fee NUMERIC DEFAULT 0,
ADD COLUMN eco_fee_applied BOOLEAN DEFAULT false;