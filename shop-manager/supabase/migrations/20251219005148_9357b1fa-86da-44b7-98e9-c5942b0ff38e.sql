-- Add asset_class column to equipment_assets table
ALTER TABLE equipment_assets 
ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'shop_equipment';

-- Add asset_class column to equipment_categories table
ALTER TABLE equipment_categories 
ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'shop_equipment';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_assets_asset_class ON equipment_assets(asset_class);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_asset_class ON equipment_categories(asset_class);

-- Add check constraint for valid asset_class values
ALTER TABLE equipment_assets 
ADD CONSTRAINT check_asset_class 
CHECK (asset_class IN ('shop_equipment', 'fleet', 'safety'));

ALTER TABLE equipment_categories 
ADD CONSTRAINT check_category_asset_class 
CHECK (asset_class IN ('shop_equipment', 'fleet', 'safety'));