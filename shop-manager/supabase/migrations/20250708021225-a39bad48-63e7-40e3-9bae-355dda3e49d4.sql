-- Add shop_id column to departments table
ALTER TABLE public.departments 
ADD COLUMN shop_id UUID NOT NULL DEFAULT (
  SELECT id FROM shops LIMIT 1
);

-- Add foreign key constraint
ALTER TABLE public.departments 
ADD CONSTRAINT departments_shop_id_fkey 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_departments_shop_id ON public.departments(shop_id);

-- Remove the temporary default value constraint
ALTER TABLE public.departments ALTER COLUMN shop_id DROP DEFAULT;