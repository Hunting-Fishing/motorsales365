-- Create equipment categories table
CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view equipment categories"
  ON public.equipment_categories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage equipment categories"
  ON public.equipment_categories FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add category_id to equipment_assets
ALTER TABLE public.equipment_assets 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.equipment_categories(id);

-- Seed default categories
INSERT INTO public.equipment_categories (name, description, icon, display_order) VALUES
('Heavy Trucks', 'Commercial trucks, transport, flatdecks, roll-on/roll-off', 'Truck', 1),
('Heavy Equipment', 'Excavators, loaders, dozers, cranes, forklifts', 'HardHat', 2),
('Vehicles', 'Fleet, courtesy, rental, service vehicles', 'Car', 3),
('Marine', 'Vessels, outboard motors, marine equipment', 'Ship', 4),
('Shop Equipment', 'Diagnostic, lifting, air tools, electrical', 'Wrench', 5),
('Small Engines', 'Generators, small engines, portable equipment', 'Cog', 6),
('Safety Equipment', 'Fire extinguishers, life rafts, PPE', 'Shield', 7),
('Other', 'Miscellaneous equipment', 'Package', 8);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_assets_category ON public.equipment_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_active ON public.equipment_categories(is_active, display_order);