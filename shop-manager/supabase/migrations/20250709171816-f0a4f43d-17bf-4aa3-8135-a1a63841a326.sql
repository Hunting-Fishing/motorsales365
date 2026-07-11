
-- Phase 1: Database Structure Enhancement
-- Add owner_type to distinguish company vs customer vehicles
ALTER TABLE vehicles 
ADD COLUMN owner_type text NOT NULL DEFAULT 'customer';

-- Add check constraint for valid owner types
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_owner_type_check 
CHECK (owner_type IN ('customer', 'company'));

-- Allow customer_id to be null for company-owned assets
ALTER TABLE vehicles 
ALTER COLUMN customer_id DROP NOT NULL;

-- Add asset category for company vehicles/equipment
ALTER TABLE vehicles 
ADD COLUMN asset_category text;

-- Add check constraint for asset categories (only applies to company assets)
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_asset_category_check 
CHECK (
  (owner_type = 'customer' AND asset_category IS NULL) OR
  (owner_type = 'company' AND asset_category IN ('courtesy', 'rental', 'fleet', 'service', 'equipment', 'other'))
);

-- Add additional company asset fields
ALTER TABLE vehicles 
ADD COLUMN asset_status text DEFAULT 'available';

-- Add check constraint for asset status
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_asset_status_check 
CHECK (asset_status IN ('available', 'in_use', 'maintenance', 'out_of_service', 'retired'));

-- Add checkout tracking for company assets
ALTER TABLE vehicles 
ADD COLUMN checked_out_to uuid,
ADD COLUMN checked_out_at timestamp with time zone,
ADD COLUMN expected_return_date date,
ADD COLUMN current_location text;

-- Update existing vehicles to be customer vehicles
UPDATE vehicles SET owner_type = 'customer' WHERE customer_id IS NOT NULL;

-- Create index for better performance on company asset queries
CREATE INDEX idx_vehicles_owner_type ON vehicles(owner_type);
CREATE INDEX idx_vehicles_asset_category ON vehicles(asset_category) WHERE owner_type = 'company';
CREATE INDEX idx_vehicles_shop_asset ON vehicles(owner_type, asset_category) WHERE owner_type = 'company';

-- Add foreign key constraint for checked_out_to (references profiles)
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_checked_out_to_fkey 
FOREIGN KEY (checked_out_to) REFERENCES profiles(id);

-- Update validation trigger for work order relationships
CREATE OR REPLACE FUNCTION public.validate_vehicle_relationships()
RETURNS trigger 
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If customer_id and vehicle_id are provided, ensure they match (for customer vehicles only)
  IF NEW.customer_id IS NOT NULL AND NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM vehicles 
      WHERE id = NEW.vehicle_id 
      AND (
        (owner_type = 'customer' AND customer_id = NEW.customer_id) OR
        (owner_type = 'company')
      )
    ) THEN
      RAISE EXCEPTION 'Vehicle relationship validation failed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply the trigger to work_orders if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'work_orders') THEN
    DROP TRIGGER IF EXISTS validate_work_order_relationships_trigger ON work_orders;
    CREATE TRIGGER validate_work_order_relationships_trigger 
      BEFORE INSERT OR UPDATE ON work_orders 
      FOR EACH ROW EXECUTE FUNCTION validate_vehicle_relationships();
  END IF;
END $$;
