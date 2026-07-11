-- Fix missing database columns - Part 2: Add triggers and indexes

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity_in_stock 
ON public.inventory_items(quantity_in_stock) 
WHERE quantity_in_stock IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permissions_resource 
ON public.permissions(resource) 
WHERE resource IS NOT NULL;