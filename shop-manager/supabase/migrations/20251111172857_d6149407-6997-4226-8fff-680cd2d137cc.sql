-- Add extended fields to inventory_items table for comprehensive inventory management

-- Add identification and categorization fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS part_number TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS vehicle_compatibility TEXT;

-- Add inventory management fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS on_hold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_order INTEGER DEFAULT 0;

-- Add pricing fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS margin_markup DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_price_per_unit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0;

-- Add product detail fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS warranty_period TEXT;

-- Add tracking and notes fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS date_bought DATE,
ADD COLUMN IF NOT EXISTS date_last DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS web_links JSONB DEFAULT '[]'::jsonb;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_part_number ON inventory_items(part_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_items_manufacturer ON inventory_items(manufacturer);
CREATE INDEX IF NOT EXISTS idx_inventory_items_subcategory ON inventory_items(subcategory);