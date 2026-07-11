-- Create water delivery inventory categories table
CREATE TABLE public.water_delivery_inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, slug)
);

-- Create water delivery inventory subcategories table
CREATE TABLE public.water_delivery_inventory_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.water_delivery_inventory_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Enable RLS
ALTER TABLE public.water_delivery_inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_delivery_inventory_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Users can view categories for their shop"
  ON public.water_delivery_inventory_categories FOR SELECT
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    OR shop_id IS NULL
  );

CREATE POLICY "Users can create categories for their shop"
  ON public.water_delivery_inventory_categories FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update categories for their shop"
  ON public.water_delivery_inventory_categories FOR UPDATE
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    AND is_system = false
  );

CREATE POLICY "Users can delete categories for their shop"
  ON public.water_delivery_inventory_categories FOR DELETE
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    AND is_system = false
  );

-- RLS policies for subcategories
CREATE POLICY "Users can view subcategories for their shop"
  ON public.water_delivery_inventory_subcategories FOR SELECT
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    OR shop_id IS NULL
  );

CREATE POLICY "Users can create subcategories for their shop"
  ON public.water_delivery_inventory_subcategories FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update subcategories for their shop"
  ON public.water_delivery_inventory_subcategories FOR UPDATE
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    AND is_system = false
  );

CREATE POLICY "Users can delete subcategories for their shop"
  ON public.water_delivery_inventory_subcategories FOR DELETE
  USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    AND is_system = false
  );

-- Create indexes for performance
CREATE INDEX idx_inventory_categories_shop ON public.water_delivery_inventory_categories(shop_id);
CREATE INDEX idx_inventory_categories_active ON public.water_delivery_inventory_categories(is_active);
CREATE INDEX idx_inventory_subcategories_category ON public.water_delivery_inventory_subcategories(category_id);
CREATE INDEX idx_inventory_subcategories_shop ON public.water_delivery_inventory_subcategories(shop_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.water_delivery_inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_subcategories_updated_at
  BEFORE UPDATE ON public.water_delivery_inventory_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();