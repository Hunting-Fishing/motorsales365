-- Add cost tracking columns to fuel_delivery_compartment_history
ALTER TABLE fuel_delivery_compartment_history
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS fill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();