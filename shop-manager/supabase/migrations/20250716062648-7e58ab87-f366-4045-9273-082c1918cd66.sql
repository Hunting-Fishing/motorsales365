-- Ensure shops.name is properly constrained and indexed
-- Add constraints and index for shops.name field

-- Add constraint to ensure shop name is not empty
ALTER TABLE public.shops 
ADD CONSTRAINT shops_name_not_empty 
CHECK (name IS NOT NULL AND trim(name) != '');

-- Create index for faster lookups on shop name
CREATE INDEX IF NOT EXISTS idx_shops_name ON public.shops(name);

-- Note: The update trigger already exists so we don't need to recreate it