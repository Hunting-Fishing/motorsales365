
-- Create a dedicated main categories table for professional growth
CREATE TABLE public.export_main_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_main_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view main categories" ON public.export_main_categories
  FOR SELECT TO authenticated
  USING (shop_id IS NULL OR shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Users can insert main categories" ON public.export_main_categories
  FOR INSERT TO authenticated
  WITH CHECK (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Users can update own main categories" ON public.export_main_categories
  FOR UPDATE TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops) AND is_system = false);

-- Seed with professionally separated main categories
INSERT INTO public.export_main_categories (name, slug, icon, display_order, is_system) VALUES
  ('Food & Beverages', 'food_beverages', '🍽️', 1, true),
  ('Agriculture', 'agriculture', '🌾', 2, true),
  ('Industrial', 'industrial', '🏭', 3, true),
  ('Electronics & Technology', 'electronics_technology', '💻', 4, true),
  ('Mining & Resources', 'mining_resources', '⛏️', 5, true),
  ('Consumer Goods', 'consumer_goods', '🛍️', 6, true),
  ('Vehicles & Transport', 'vehicles_transport', '🚗', 7, true),
  ('Health & Pharmaceuticals', 'health_pharma', '💊', 8, true),
  ('Other', 'other', '📦', 99, true);

-- Add main_category_id column to export_product_categories
ALTER TABLE public.export_product_categories
  ADD COLUMN main_category_id UUID REFERENCES public.export_main_categories(id);

-- Map existing categories to the new main categories
UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'food_beverages'
) WHERE slug IN ('beverages', 'coffee_cocoa', 'dehydrated_food', 'seafood', 'spices', 'oils_fats', 'salt');

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'agriculture'
) WHERE slug IN ('agriculture', 'grains_cereals');

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'industrial'
) WHERE slug IN ('building_materials', 'chemicals', 'machinery', 'packaging');

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'electronics_technology'
) WHERE slug = 'electronics';

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'mining_resources'
) WHERE slug = 'minerals';

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'consumer_goods'
) WHERE slug IN ('handicrafts', 'textiles');

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'vehicles_transport'
) WHERE slug = 'vehicle';

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'health_pharma'
) WHERE slug = 'pharma';

UPDATE public.export_product_categories SET main_category_id = (
  SELECT id FROM public.export_main_categories WHERE slug = 'other'
) WHERE slug = 'other';
