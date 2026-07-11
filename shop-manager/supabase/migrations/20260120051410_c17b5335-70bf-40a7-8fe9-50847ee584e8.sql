-- Create table for tracking materials/parts used on jobs (for costing)
CREATE TABLE public.power_washing_job_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.power_washing_inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_cost_at_use NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity_used * unit_cost_at_use) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for estimate templates
CREATE TABLE public.power_washing_estimate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_services TEXT[] DEFAULT '{}',
  default_notes TEXT,
  pricing_rules JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.power_washing_job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_estimate_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for job materials
CREATE POLICY "Users can view job materials for their shop"
  ON public.power_washing_job_materials FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert job materials for their shop"
  ON public.power_washing_job_materials FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update job materials for their shop"
  ON public.power_washing_job_materials FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete job materials for their shop"
  ON public.power_washing_job_materials FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for estimate templates
CREATE POLICY "Users can view estimate templates for their shop"
  ON public.power_washing_estimate_templates FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert estimate templates for their shop"
  ON public.power_washing_estimate_templates FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update estimate templates for their shop"
  ON public.power_washing_estimate_templates FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete estimate templates for their shop"
  ON public.power_washing_estimate_templates FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_pw_job_materials_job_id ON public.power_washing_job_materials(job_id);
CREATE INDEX idx_pw_job_materials_shop_id ON public.power_washing_job_materials(shop_id);
CREATE INDEX idx_pw_estimate_templates_shop_id ON public.power_washing_estimate_templates(shop_id);

-- Trigger for updated_at on templates
CREATE TRIGGER update_power_washing_estimate_templates_updated_at
  BEFORE UPDATE ON public.power_washing_estimate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();