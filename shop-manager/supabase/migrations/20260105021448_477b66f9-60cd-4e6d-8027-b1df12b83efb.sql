-- Create modules table to store module definitions
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read modules
CREATE POLICY "Anyone can read modules" 
ON public.modules 
FOR SELECT 
TO authenticated 
USING (true);

-- Insert default modules
INSERT INTO public.modules (slug, name, description, icon, price) VALUES
  ('automotive', 'Repair Shop', 'Vehicle repair, maintenance, and diagnostic services', 'Car', 49),
  ('power_washing', 'Power Washing', 'Residential and commercial pressure washing services', 'Droplets', 39),
  ('gunsmith', 'Gunsmith', 'Firearm repair, customization, cleaning, and maintenance', 'Target', 39),
  ('marine', 'Marine Services', 'Boat repair, maintenance, and marine equipment services', 'Anchor', 49)
ON CONFLICT (slug) DO NOTHING;

-- Update shop_enabled_modules RLS to allow shop owners to manage their modules
CREATE POLICY "Users can view their shop modules" 
ON public.shop_enabled_modules 
FOR SELECT 
TO authenticated 
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can enable modules for their shop" 
ON public.shop_enabled_modules 
FOR INSERT 
TO authenticated 
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);