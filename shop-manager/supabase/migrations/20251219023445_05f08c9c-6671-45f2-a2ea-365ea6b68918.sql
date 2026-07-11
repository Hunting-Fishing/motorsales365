-- Create inspection_form_templates table for base and asset-specific templates
CREATE TABLE public.inspection_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- vessel, skiff, automobile, heavy_truck, equipment
  description TEXT,
  is_base_template BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES public.inspection_form_templates(id),
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_form_sections table
CREATE TABLE public.inspection_form_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.inspection_form_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_form_items table
CREATE TABLE public.inspection_form_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.inspection_form_sections(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'gyr_status', -- gyr_status, text, number, checkbox, date
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_item_type CHECK (item_type IN ('gyr_status', 'text', 'number', 'checkbox', 'date'))
);

-- Add inspection_template_id to equipment_assets
ALTER TABLE public.equipment_assets 
ADD COLUMN IF NOT EXISTS inspection_template_id UUID REFERENCES public.inspection_form_templates(id);

-- Add template_id and inspection_data to equipment_inspections
ALTER TABLE public.equipment_inspections 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.inspection_form_templates(id),
ADD COLUMN IF NOT EXISTS inspection_data JSONB DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.inspection_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_form_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_form_templates
CREATE POLICY "Users can view inspection templates" 
ON public.inspection_form_templates FOR SELECT 
USING (true);

CREATE POLICY "Users can create inspection templates" 
ON public.inspection_form_templates FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update inspection templates" 
ON public.inspection_form_templates FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete inspection templates" 
ON public.inspection_form_templates FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for inspection_form_sections
CREATE POLICY "Users can view inspection sections" 
ON public.inspection_form_sections FOR SELECT 
USING (true);

CREATE POLICY "Users can create inspection sections" 
ON public.inspection_form_sections FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update inspection sections" 
ON public.inspection_form_sections FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete inspection sections" 
ON public.inspection_form_sections FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for inspection_form_items
CREATE POLICY "Users can view inspection items" 
ON public.inspection_form_items FOR SELECT 
USING (true);

CREATE POLICY "Users can create inspection items" 
ON public.inspection_form_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update inspection items" 
ON public.inspection_form_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete inspection items" 
ON public.inspection_form_items FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_inspection_templates_asset_type ON public.inspection_form_templates(asset_type);
CREATE INDEX idx_inspection_templates_parent ON public.inspection_form_templates(parent_template_id);
CREATE INDEX idx_inspection_sections_template ON public.inspection_form_sections(template_id);
CREATE INDEX idx_inspection_items_section ON public.inspection_form_items(section_id);
CREATE INDEX idx_equipment_assets_template ON public.equipment_assets(inspection_template_id);
CREATE INDEX idx_equipment_inspections_template ON public.equipment_inspections(template_id);

-- Add triggers for updated_at
CREATE TRIGGER update_inspection_form_templates_updated_at
BEFORE UPDATE ON public.inspection_form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_form_sections_updated_at
BEFORE UPDATE ON public.inspection_form_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_form_items_updated_at
BEFORE UPDATE ON public.inspection_form_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.inspection_form_templates IS 'Stores pre-trip inspection form templates for different asset types';
COMMENT ON TABLE public.inspection_form_sections IS 'Sections within an inspection template';
COMMENT ON TABLE public.inspection_form_items IS 'Individual inspection items within a section';
COMMENT ON COLUMN public.inspection_form_items.item_type IS 'Type of input: gyr_status (Green/Yellow/Red), text, number, checkbox, date';