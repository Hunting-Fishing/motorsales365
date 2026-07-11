-- Create custom component definitions table for management to add custom components
CREATE TABLE public.custom_component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hour_meter', 'fluid_level', 'gyr_status', 'checkbox', 'number', 'text')),
  category TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  linked_equipment_type TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, key)
);

-- Enable RLS
ALTER TABLE public.custom_component_definitions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view custom components for their shop
CREATE POLICY "Users can view custom components for their shop"
ON public.custom_component_definitions
FOR SELECT
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
);

-- Policy: Users can create custom components for their shop
CREATE POLICY "Users can create custom components for their shop"
ON public.custom_component_definitions
FOR INSERT
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
);

-- Policy: Users can update custom components for their shop
CREATE POLICY "Users can update custom components for their shop"
ON public.custom_component_definitions
FOR UPDATE
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
);

-- Policy: Users can delete custom components for their shop
CREATE POLICY "Users can delete custom components for their shop"
ON public.custom_component_definitions
FOR DELETE
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_component_definitions_updated_at
  BEFORE UPDATE ON public.custom_component_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scheduling_tables_updated_at();