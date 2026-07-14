
-- Digital Inspections MVP for Shop Manager
-- Extend vehicle_inspections and add templates/items/photos

ALTER TABLE shop_manager.vehicle_inspections
  ADD COLUMN IF NOT EXISTS shop_id uuid,
  ADD COLUMN IF NOT EXISTS work_order_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS overall_result text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_off_by uuid,
  ADD COLUMN IF NOT EXISTS customer_shared_at timestamptz;

ALTER TABLE shop_manager.vehicle_inspections
  ALTER COLUMN vehicle_body_style DROP NOT NULL;

-- Templates
CREATE TABLE IF NOT EXISTS shop_manager.inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_manager.inspection_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES shop_manager.inspection_templates(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Item results (one row per checked point)
CREATE TABLE IF NOT EXISTS shop_manager.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES shop_manager.vehicle_inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  -- pass | attention | fail | na
  result text,
  notes text,
  measurement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON shop_manager.inspection_items(inspection_id);

-- Photos attached to inspection or specific item
CREATE TABLE IF NOT EXISTS shop_manager.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES shop_manager.vehicle_inspections(id) ON DELETE CASCADE,
  item_id uuid REFERENCES shop_manager.inspection_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON shop_manager.inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_vi_shop ON shop_manager.vehicle_inspections(shop_id);
CREATE INDEX IF NOT EXISTS idx_vi_wo ON shop_manager.vehicle_inspections(work_order_id);

GRANT USAGE ON SCHEMA shop_manager TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_template_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_photos TO authenticated;
GRANT ALL ON shop_manager.inspection_templates TO service_role;
GRANT ALL ON shop_manager.inspection_template_items TO service_role;
GRANT ALL ON shop_manager.inspection_items TO service_role;
GRANT ALL ON shop_manager.inspection_photos TO service_role;

ALTER TABLE shop_manager.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Templates: shop members can see own shop's templates + system templates
DROP POLICY IF EXISTS "templates_select" ON shop_manager.inspection_templates;
CREATE POLICY "templates_select" ON shop_manager.inspection_templates FOR SELECT TO authenticated
USING (is_system = true OR shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "templates_write" ON shop_manager.inspection_templates;
CREATE POLICY "templates_write" ON shop_manager.inspection_templates FOR ALL TO authenticated
USING (shop_id = shop_manager.get_current_user_shop_id())
WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "template_items_select" ON shop_manager.inspection_template_items;
CREATE POLICY "template_items_select" ON shop_manager.inspection_template_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id
  AND (t.is_system = true OR t.shop_id = shop_manager.get_current_user_shop_id())));

DROP POLICY IF EXISTS "template_items_write" ON shop_manager.inspection_template_items;
CREATE POLICY "template_items_write" ON shop_manager.inspection_template_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id AND t.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id AND t.shop_id = shop_manager.get_current_user_shop_id()));

-- Vehicle inspections RLS (scoped by shop)
ALTER TABLE shop_manager.vehicle_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vi_all" ON shop_manager.vehicle_inspections;
CREATE POLICY "vi_all" ON shop_manager.vehicle_inspections FOR ALL TO authenticated
USING (shop_id = shop_manager.get_current_user_shop_id())
WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "insp_items_all" ON shop_manager.inspection_items;
CREATE POLICY "insp_items_all" ON shop_manager.inspection_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()));

DROP POLICY IF EXISTS "insp_photos_all" ON shop_manager.inspection_photos;
CREATE POLICY "insp_photos_all" ON shop_manager.inspection_photos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION shop_manager.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vi_upd ON shop_manager.vehicle_inspections;
CREATE TRIGGER trg_vi_upd BEFORE UPDATE ON shop_manager.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();
DROP TRIGGER IF EXISTS trg_ii_upd ON shop_manager.inspection_items;
CREATE TRIGGER trg_ii_upd BEFORE UPDATE ON shop_manager.inspection_items
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();
DROP TRIGGER IF EXISTS trg_it_upd ON shop_manager.inspection_templates;
CREATE TRIGGER trg_it_upd BEFORE UPDATE ON shop_manager.inspection_templates
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();

-- Seed a system default 50-point inspection template
DO $$
DECLARE tid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM shop_manager.inspection_templates WHERE is_system = true AND name = 'Standard Digital Inspection') THEN
    INSERT INTO shop_manager.inspection_templates(name, description, is_default, is_system, active)
    VALUES ('Standard Digital Inspection', 'Default multi-point inspection covering exterior, interior, under-hood, under-vehicle, brakes, tires, and fluids.', true, true, true)
    RETURNING id INTO tid;

    INSERT INTO shop_manager.inspection_template_items(template_id, category, label, sort_order) VALUES
    (tid, 'Exterior', 'Body condition / panels', 10),
    (tid, 'Exterior', 'Headlights & signals', 20),
    (tid, 'Exterior', 'Windshield & wipers', 30),
    (tid, 'Exterior', 'Mirrors', 40),
    (tid, 'Interior', 'Horn operation', 50),
    (tid, 'Interior', 'Seat belts & airbags', 60),
    (tid, 'Interior', 'HVAC / A/C performance', 70),
    (tid, 'Interior', 'Dashboard warning lights', 80),
    (tid, 'Under Hood', 'Engine oil level & condition', 90),
    (tid, 'Under Hood', 'Coolant level & condition', 100),
    (tid, 'Under Hood', 'Brake fluid', 110),
    (tid, 'Under Hood', 'Power steering fluid', 120),
    (tid, 'Under Hood', 'Battery & terminals', 130),
    (tid, 'Under Hood', 'Belts & hoses', 140),
    (tid, 'Under Hood', 'Air filter', 150),
    (tid, 'Under Vehicle', 'Exhaust system', 160),
    (tid, 'Under Vehicle', 'CV boots / drive shafts', 170),
    (tid, 'Under Vehicle', 'Suspension components', 180),
    (tid, 'Under Vehicle', 'Steering linkage', 190),
    (tid, 'Under Vehicle', 'Fluid leaks', 200),
    (tid, 'Brakes', 'Front pad thickness', 210),
    (tid, 'Brakes', 'Rear pad / shoe thickness', 220),
    (tid, 'Brakes', 'Rotors / drums condition', 230),
    (tid, 'Brakes', 'Brake lines & hoses', 240),
    (tid, 'Tires', 'LF tread depth', 250),
    (tid, 'Tires', 'RF tread depth', 260),
    (tid, 'Tires', 'LR tread depth', 270),
    (tid, 'Tires', 'RR tread depth', 280),
    (tid, 'Tires', 'Tire pressure (all)', 290),
    (tid, 'Tires', 'Wear pattern', 300);
  END IF;
END $$;

-- Storage RLS for shop-inspections bucket
DROP POLICY IF EXISTS "shop_inspections_read" ON storage.objects;
CREATE POLICY "shop_inspections_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "shop_inspections_write" ON storage.objects;
CREATE POLICY "shop_inspections_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "shop_inspections_delete" ON storage.objects;
CREATE POLICY "shop_inspections_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);
