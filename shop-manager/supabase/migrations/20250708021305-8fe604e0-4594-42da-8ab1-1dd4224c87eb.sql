-- Add shop_id column to departments table as nullable first
ALTER TABLE public.departments 
ADD COLUMN shop_id UUID;

-- Update existing rows to have the first shop's ID
UPDATE public.departments 
SET shop_id = (SELECT id FROM shops LIMIT 1)
WHERE shop_id IS NULL;

-- Make the column NOT NULL
ALTER TABLE public.departments 
ALTER COLUMN shop_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.departments 
ADD CONSTRAINT departments_shop_id_fkey 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_departments_shop_id ON public.departments(shop_id);