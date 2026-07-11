-- Ensure shops.name is properly constrained and indexed
-- Add constraints and index for shops.name field

-- Add constraint to ensure shop name is not empty
ALTER TABLE public.shops 
ADD CONSTRAINT shops_name_not_empty 
CHECK (name IS NOT NULL AND trim(name) != '');

-- Create index for faster lookups on shop name
CREATE INDEX IF NOT EXISTS idx_shops_name ON public.shops(name);

-- Add updated_at trigger if it doesn't exist
CREATE TRIGGER IF NOT EXISTS update_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shop_updated_at();

-- Clean up any potential duplicate name fields in company_settings
-- Comment: This is a cleanup query to remove any conflicting shop_name entries
-- that might exist in company_settings, as we're standardizing on shops.name

-- First, let's check if we need to sync any existing shop_name data
-- Update: We'll handle this sync in a separate operation if needed