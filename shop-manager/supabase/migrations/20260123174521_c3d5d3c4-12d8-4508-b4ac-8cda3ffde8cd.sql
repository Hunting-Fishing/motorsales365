-- Create junction table for pricing formula chemicals
CREATE TABLE public.power_washing_formula_chemicals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID NOT NULL REFERENCES public.power_washing_pricing_formulas(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.power_washing_inventory(id) ON DELETE SET NULL,
  chemical_name TEXT NOT NULL,
  concentration_light NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  concentration_medium NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  concentration_heavy NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  coverage_sqft_per_gallon NUMERIC(10,2) NOT NULL DEFAULT 150,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add sh_percentage column to inventory for chemicals
ALTER TABLE public.power_washing_inventory
ADD COLUMN IF NOT EXISTS sh_percentage NUMERIC(5,2);

-- Add comments
COMMENT ON TABLE public.power_washing_formula_chemicals IS 'Links pricing formulas to chemicals with concentration levels';
COMMENT ON COLUMN public.power_washing_formula_chemicals.is_primary IS 'Primary chemical used for main calculation (e.g., SH)';
COMMENT ON COLUMN public.power_washing_inventory.sh_percentage IS 'Sodium Hypochlorite percentage for chemical products';

-- Enable RLS
ALTER TABLE public.power_washing_formula_chemicals ENABLE ROW LEVEL SECURITY;

-- RLS policies (access through formula's shop_id)
CREATE POLICY "Users can view formula chemicals through formula"
ON public.power_washing_formula_chemicals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.power_washing_pricing_formulas f
    JOIN public.profiles p ON p.shop_id = f.shop_id
    WHERE f.id = formula_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert formula chemicals"
ON public.power_washing_formula_chemicals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.power_washing_pricing_formulas f
    JOIN public.profiles p ON p.shop_id = f.shop_id
    WHERE f.id = formula_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can update formula chemicals"
ON public.power_washing_formula_chemicals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.power_washing_pricing_formulas f
    JOIN public.profiles p ON p.shop_id = f.shop_id
    WHERE f.id = formula_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete formula chemicals"
ON public.power_washing_formula_chemicals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.power_washing_pricing_formulas f
    JOIN public.profiles p ON p.shop_id = f.shop_id
    WHERE f.id = formula_id AND p.id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_formula_chemicals_formula_id ON public.power_washing_formula_chemicals(formula_id);
CREATE INDEX idx_formula_chemicals_inventory_item_id ON public.power_washing_formula_chemicals(inventory_item_id);

-- Trigger for updated_at
CREATE TRIGGER update_formula_chemicals_updated_at
  BEFORE UPDATE ON public.power_washing_formula_chemicals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();