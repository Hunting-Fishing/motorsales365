-- Fix missing database columns based on error logs

-- 1. Add full_name column to profiles table
-- This is likely a computed field from first_name + last_name
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text 
GENERATED ALWAYS AS (
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
    THEN trim(first_name || ' ' || last_name)
    WHEN first_name IS NOT NULL 
    THEN first_name
    WHEN last_name IS NOT NULL 
    THEN last_name
    ELSE NULL
  END
) STORED;

-- 2. Add quantity_in_stock column to inventory_items table
-- This appears to be an alias or view column for the existing quantity column
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS quantity_in_stock integer;

-- Update quantity_in_stock to match existing quantity values
UPDATE public.inventory_items 
SET quantity_in_stock = quantity 
WHERE quantity_in_stock IS NULL;

-- Create trigger to keep quantity_in_stock in sync with quantity
CREATE OR REPLACE FUNCTION public.sync_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- When quantity changes, update quantity_in_stock
  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    NEW.quantity_in_stock = NEW.quantity;
  END IF;
  
  -- When quantity_in_stock changes, update quantity
  IF NEW.quantity_in_stock IS DISTINCT FROM OLD.quantity_in_stock THEN
    NEW.quantity = NEW.quantity_in_stock;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to inventory_items
DROP TRIGGER IF EXISTS sync_inventory_quantity_trigger ON public.inventory_items;
CREATE TRIGGER sync_inventory_quantity_trigger
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_quantity();

-- 3. Add resource column to permissions table (based on the p.resource error)
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS resource text;

-- Set default resource values based on module for existing permissions
UPDATE public.permissions 
SET resource = module 
WHERE resource IS NULL;

-- 4. Create index for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity_in_stock 
ON public.inventory_items(quantity_in_stock) 
WHERE quantity_in_stock IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permissions_resource 
ON public.permissions(resource) 
WHERE resource IS NOT NULL;

-- 5. Add constraints to ensure data consistency
ALTER TABLE public.inventory_items 
ADD CONSTRAINT IF NOT EXISTS check_quantity_sync 
CHECK (quantity_in_stock = quantity OR quantity_in_stock IS NULL);