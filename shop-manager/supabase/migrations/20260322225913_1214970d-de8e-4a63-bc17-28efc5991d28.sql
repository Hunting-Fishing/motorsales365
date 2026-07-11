-- 1. Create septic-scoped inspection templates table
CREATE TABLE IF NOT EXISTS septic_inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'septic_system',
  description TEXT,
  is_base_template BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES septic_inspection_templates(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create septic inspection template sections
CREATE TABLE IF NOT EXISTS septic_inspection_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES septic_inspection_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create septic inspection template items
CREATE TABLE IF NOT EXISTS septic_inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES septic_inspection_template_sections(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  component_category TEXT,
  linked_component_type TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE septic_inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE septic_inspection_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE septic_inspection_template_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_inspection_templates' AND policyname = 'septic_inspection_templates_shop_isolation') THEN
    CREATE POLICY septic_inspection_templates_shop_isolation ON septic_inspection_templates FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_inspection_template_sections' AND policyname = 'septic_inspection_template_sections_shop_iso') THEN
    CREATE POLICY septic_inspection_template_sections_shop_iso ON septic_inspection_template_sections FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM septic_inspection_templates t WHERE t.id = template_id AND t.shop_id = public.get_current_user_shop_id())
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM septic_inspection_templates t WHERE t.id = template_id AND t.shop_id = public.get_current_user_shop_id())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_inspection_template_items' AND policyname = 'septic_inspection_template_items_shop_iso') THEN
    CREATE POLICY septic_inspection_template_items_shop_iso ON septic_inspection_template_items FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM septic_inspection_template_sections s JOIN septic_inspection_templates t ON t.id = s.template_id WHERE s.id = section_id AND t.shop_id = public.get_current_user_shop_id())
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM septic_inspection_template_sections s JOIN septic_inspection_templates t ON t.id = s.template_id WHERE s.id = section_id AND t.shop_id = public.get_current_user_shop_id())
    );
  END IF;
END $$;

-- 6. Drop the 3 cross-module FK constraints
ALTER TABLE septic_system_types DROP CONSTRAINT IF EXISTS septic_system_types_inspection_template_id_fkey;
ALTER TABLE septic_inspection_records DROP CONSTRAINT IF EXISTS septic_inspection_records_template_id_fkey;
ALTER TABLE septic_inspection_records DROP CONSTRAINT IF EXISTS septic_inspection_records_work_order_id_fkey;

-- 7. Re-point template FKs to septic-scoped tables
ALTER TABLE septic_system_types ADD CONSTRAINT septic_system_types_inspection_template_id_fkey
  FOREIGN KEY (inspection_template_id) REFERENCES septic_inspection_templates(id) ON DELETE SET NULL;

ALTER TABLE septic_inspection_records ADD CONSTRAINT septic_inspection_records_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES septic_inspection_templates(id) ON DELETE SET NULL;