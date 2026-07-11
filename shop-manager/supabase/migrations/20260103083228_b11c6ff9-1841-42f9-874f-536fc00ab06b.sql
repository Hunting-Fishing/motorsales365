-- Create power washing formulas table for quick mixing recipes
CREATE TABLE public.power_washing_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  surface_type TEXT, -- e.g., concrete, wood, vinyl, brick
  application TEXT, -- e.g., house wash, roof, driveway
  ingredients JSONB NOT NULL DEFAULT '[]', -- [{chemical_id, amount, unit}]
  water_gallons NUMERIC(10,2) NOT NULL DEFAULT 1,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_formulas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Shop users can view their formulas"
  ON public.power_washing_formulas
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Shop users can create formulas"
  ON public.power_washing_formulas
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Shop users can update their formulas"
  ON public.power_washing_formulas
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Shop users can delete their formulas"
  ON public.power_washing_formulas
  FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_power_washing_formulas_shop ON public.power_washing_formulas(shop_id);
CREATE INDEX idx_power_washing_formulas_surface ON public.power_washing_formulas(surface_type);

-- Trigger for updated_at
CREATE TRIGGER update_power_washing_formulas_updated_at
  BEFORE UPDATE ON public.power_washing_formulas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();