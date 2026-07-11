-- Create maintenance_type_presets table for equipment maintenance types
CREATE TABLE public.maintenance_type_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, name)
);

-- Enable RLS
ALTER TABLE public.maintenance_type_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view system defaults and their shop types"
ON public.maintenance_type_presets FOR SELECT
USING (is_system_default = true OR shop_id IN (
  SELECT shop_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert types for their shop"
ON public.maintenance_type_presets FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their shop types"
ON public.maintenance_type_presets FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM public.profiles WHERE id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_type_presets_updated_at
  BEFORE UPDATE ON public.maintenance_type_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default system types
INSERT INTO public.maintenance_type_presets (name, description, is_system_default, is_active) VALUES
  ('Filter', 'Air, oil, fuel, and hydraulic filters', true, true),
  ('Oil', 'Engine oil, gear oil, hydraulic oil', true, true),
  ('Coolant', 'Engine coolant, antifreeze', true, true),
  ('Belt', 'Drive belts, serpentine belts, V-belts', true, true),
  ('Fluid', 'Brake fluid, transmission fluid, power steering fluid', true, true),
  ('Grease', 'Bearing and fitting lubrication', true, true),
  ('Gasket', 'Seals and gaskets', true, true),
  ('Hose', 'Hydraulic, coolant, and fuel hoses', true, true),
  ('Pump', 'Water, fuel, and hydraulic pumps', true, true),
  ('Electrical', 'Batteries, starters, alternators', true, true),
  ('Impeller', 'Raw water impellers for marine applications', true, true),
  ('Zincs', 'Sacrificial anodes for marine applications', true, true),
  ('Spark Plug', 'Ignition spark plugs', true, true),
  ('Bearing', 'Wheel, shaft, and hub bearings', true, true),
  ('Brake', 'Brake pads, rotors, shoes', true, true),
  ('Other', 'Miscellaneous maintenance items', true, true);