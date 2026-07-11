
-- Export product categories (user-manageable)
CREATE TABLE public.export_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  display_order integer DEFAULT 0,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, slug)
);

ALTER TABLE public.export_product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view export categories for their shop"
  ON public.export_product_categories FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id() OR shop_id IS NULL);

CREATE POLICY "Users can manage export categories for their shop"
  ON public.export_product_categories FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Seed default system categories for import/export
INSERT INTO public.export_product_categories (shop_id, name, slug, description, icon, display_order, is_system) VALUES
  (NULL, 'Salt', 'salt', 'Sea salt, rock salt, industrial salt, iodized salt', 'grain', 1, true),
  (NULL, 'Dehydrated Food', 'dehydrated_food', 'Dried fruits, vegetables, spices, herbs', 'leaf', 2, true),
  (NULL, 'Vehicles', 'vehicle', 'Cars, trucks, heavy machinery for export', 'car', 3, true),
  (NULL, 'Grains & Cereals', 'grains_cereals', 'Rice, wheat, corn, barley, oats', 'wheat', 4, true),
  (NULL, 'Seafood', 'seafood', 'Frozen, dried, or canned fish and shellfish', 'fish', 5, true),
  (NULL, 'Spices & Seasonings', 'spices', 'Whole and ground spices, seasoning blends', 'flame', 6, true),
  (NULL, 'Minerals & Ores', 'minerals', 'Raw minerals, construction aggregates, ores', 'mountain', 7, true),
  (NULL, 'Textiles & Garments', 'textiles', 'Fabrics, clothing, handcrafted textiles', 'shirt', 8, true),
  (NULL, 'Coffee & Cocoa', 'coffee_cocoa', 'Green coffee, roasted beans, cocoa products', 'coffee', 9, true),
  (NULL, 'Building Materials', 'building_materials', 'Cement, rebar, lumber, roofing', 'building', 10, true),
  (NULL, 'Beverages', 'beverages', 'Rum, juice, water, alcoholic and non-alcoholic', 'glass-water', 11, true),
  (NULL, 'Oils & Fats', 'oils_fats', 'Cooking oils, essential oils, animal fats', 'droplet', 12, true),
  (NULL, 'Chemicals', 'chemicals', 'Industrial chemicals, cleaning products, fertilizers', 'flask-conical', 13, true),
  (NULL, 'Electronics & Parts', 'electronics', 'Consumer electronics, components, accessories', 'cpu', 14, true),
  (NULL, 'Handicrafts & Art', 'handicrafts', 'Handmade goods, paintings, sculptures', 'palette', 15, true),
  (NULL, 'Agricultural Products', 'agriculture', 'Fresh produce, sugar, tobacco, raw ag products', 'sprout', 16, true),
  (NULL, 'Machinery & Equipment', 'machinery', 'Industrial machines, generators, tools', 'cog', 17, true),
  (NULL, 'Packaging Materials', 'packaging', 'Boxes, bags, containers, wrapping materials', 'package', 18, true),
  (NULL, 'Pharmaceuticals', 'pharma', 'Medicines, supplements, medical supplies', 'pill', 19, true),
  (NULL, 'Other', 'other', 'Miscellaneous import/export goods', 'box', 20, true);

-- Add profit protection columns to export_products
ALTER TABLE public.export_products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.export_product_categories(id),
  ADD COLUMN IF NOT EXISTS min_margin_threshold numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_discount_pct numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cost_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_locked_by uuid,
  ADD COLUMN IF NOT EXISTS cost_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_floor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cost_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS cost_review_notes text,
  ADD COLUMN IF NOT EXISTS tariff_classification text,
  ADD COLUMN IF NOT EXISTS anti_dumping_duty_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countervailing_duty_pct numeric DEFAULT 0;
