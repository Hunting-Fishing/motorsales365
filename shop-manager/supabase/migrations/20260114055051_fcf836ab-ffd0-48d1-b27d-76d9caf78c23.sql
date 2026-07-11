-- Add module_id column to products table for module-specific filtering
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS module_id TEXT;

-- Create index for fast filtering by module
CREATE INDEX IF NOT EXISTS idx_products_module_id ON products(module_id);

-- Add comment for documentation
COMMENT ON COLUMN products.module_id IS 'Module identifier (e.g., water-delivery, propane, hvac) for filtering products by module store';