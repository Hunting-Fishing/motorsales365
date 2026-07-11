-- Create power washing pricing formulas table
CREATE TABLE public.power_washing_pricing_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface_type TEXT NOT NULL,
  application TEXT NOT NULL,
  category TEXT DEFAULT 'residential',
  
  -- Pricing per sqft by condition
  price_per_sqft_light NUMERIC(10,4) NOT NULL DEFAULT 0.10,
  price_per_sqft_medium NUMERIC(10,4) NOT NULL DEFAULT 0.18,
  price_per_sqft_heavy NUMERIC(10,4) NOT NULL DEFAULT 0.28,
  minimum_charge NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  
  -- Chemical concentrations (SH percentage)
  sh_concentration_light NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  sh_concentration_medium NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  sh_concentration_heavy NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  mix_coverage_sqft NUMERIC(10,2) NOT NULL DEFAULT 150.0,
  
  -- Labor time calculations
  minutes_per_100sqft INTEGER NOT NULL DEFAULT 3,
  setup_minutes INTEGER NOT NULL DEFAULT 20,
  labor_rate_type TEXT DEFAULT 'standard',
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_pricing_formulas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pricing formulas for their shop"
  ON public.power_washing_pricing_formulas
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pricing formulas for their shop"
  ON public.power_washing_pricing_formulas
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update pricing formulas for their shop"
  ON public.power_washing_pricing_formulas
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pricing formulas for their shop"
  ON public.power_washing_pricing_formulas
  FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_power_washing_pricing_formulas_updated_at
  BEFORE UPDATE ON public.power_washing_pricing_formulas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_pricing_formulas_shop_id ON public.power_washing_pricing_formulas(shop_id);
CREATE INDEX idx_pricing_formulas_surface_type ON public.power_washing_pricing_formulas(surface_type);
CREATE INDEX idx_pricing_formulas_application ON public.power_washing_pricing_formulas(application);