
-- Add group_name to export_product_categories
ALTER TABLE public.export_product_categories ADD COLUMN IF NOT EXISTS group_name text DEFAULT 'Other';

-- Update existing categories with group names
UPDATE public.export_product_categories SET group_name = 'Food & Agriculture' WHERE slug IN ('salt','grains_cereals','seafood','coffee_cocoa','agricultural_products','spices_herbs','sugar_sweeteners','oils_fats','dairy_products','meat_poultry','fruits_vegetables','beverages','processed_foods','dehydrated_food');
UPDATE public.export_product_categories SET group_name = 'Industrial' WHERE slug IN ('minerals_ores','chemicals','machinery_equipment','metals_alloys','building_materials','energy_products','electronics_components');
UPDATE public.export_product_categories SET group_name = 'Consumer Goods' WHERE slug IN ('textiles_apparel','consumer_electronics','furniture_home','personal_care','pharmaceuticals','vehicle');
UPDATE public.export_product_categories SET group_name = 'Raw Materials' WHERE slug IN ('timber_wood','rubber_plastics','paper_packaging','raw_minerals');

-- Create export_product_subcategories table
CREATE TABLE IF NOT EXISTS public.export_product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.export_product_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.export_product_subcategories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view subcategories' AND tablename = 'export_product_subcategories') THEN
  CREATE POLICY "Users can view subcategories" ON public.export_product_subcategories FOR SELECT TO authenticated
    USING (shop_id = public.get_current_user_shop_id() OR shop_id IS NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own subcategories' AND tablename = 'export_product_subcategories') THEN
  CREATE POLICY "Users can manage own subcategories" ON public.export_product_subcategories FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- Add subcategory_id to export_products
ALTER TABLE public.export_products ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.export_product_subcategories(id);

-- Seed system subcategories for key categories
INSERT INTO public.export_product_subcategories (shop_id, category_id, name, slug, display_order, is_system)
SELECT NULL, c.id, s.name, s.slug, s.ord, true
FROM public.export_product_categories c
CROSS JOIN LATERAL (VALUES
  ('Fine Grade', 'fine_grade', 1),
  ('Coarse Grade', 'coarse_grade', 2),
  ('Industrial Grade', 'industrial_grade', 3),
  ('Iodized', 'iodized', 4),
  ('Sea Salt', 'sea_salt', 5),
  ('Rock Salt', 'rock_salt', 6)
) AS s(name, slug, ord)
WHERE c.slug = 'salt'
ON CONFLICT DO NOTHING;

INSERT INTO public.export_product_subcategories (shop_id, category_id, name, slug, display_order, is_system)
SELECT NULL, c.id, s.name, s.slug, s.ord, true
FROM public.export_product_categories c
CROSS JOIN LATERAL (VALUES
  ('Frozen', 'frozen', 1),
  ('Dried', 'dried', 2),
  ('Canned', 'canned', 3),
  ('Fresh', 'fresh', 4),
  ('Smoked', 'smoked', 5)
) AS s(name, slug, ord)
WHERE c.slug = 'seafood'
ON CONFLICT DO NOTHING;

INSERT INTO public.export_product_subcategories (shop_id, category_id, name, slug, display_order, is_system)
SELECT NULL, c.id, s.name, s.slug, s.ord, true
FROM public.export_product_categories c
CROSS JOIN LATERAL (VALUES
  ('Sedan', 'sedan', 1),
  ('SUV', 'suv', 2),
  ('Truck', 'truck', 3),
  ('Heavy Equipment', 'heavy_equipment', 4),
  ('Motorcycle', 'motorcycle', 5)
) AS s(name, slug, ord)
WHERE c.slug = 'vehicle'
ON CONFLICT DO NOTHING;

INSERT INTO public.export_product_subcategories (shop_id, category_id, name, slug, display_order, is_system)
SELECT NULL, c.id, s.name, s.slug, s.ord, true
FROM public.export_product_categories c
CROSS JOIN LATERAL (VALUES
  ('Arabica', 'arabica', 1),
  ('Robusta', 'robusta', 2),
  ('Green Beans', 'green_beans', 3),
  ('Roasted', 'roasted', 4),
  ('Cocoa Powder', 'cocoa_powder', 5),
  ('Cocoa Butter', 'cocoa_butter', 6)
) AS s(name, slug, ord)
WHERE c.slug = 'coffee_cocoa'
ON CONFLICT DO NOTHING;

INSERT INTO public.export_product_subcategories (shop_id, category_id, name, slug, display_order, is_system)
SELECT NULL, c.id, s.name, s.slug, s.ord, true
FROM public.export_product_categories c
CROSS JOIN LATERAL (VALUES
  ('Wheat', 'wheat', 1),
  ('Rice', 'rice', 2),
  ('Corn', 'corn', 3),
  ('Barley', 'barley', 4),
  ('Oats', 'oats', 5),
  ('Sorghum', 'sorghum', 6)
) AS s(name, slug, ord)
WHERE c.slug = 'grains_cereals'
ON CONFLICT DO NOTHING;
