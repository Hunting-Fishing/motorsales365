
-- 1. Departments table
CREATE TABLE public.shop_departments (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 100,
  hero_image_url text,
  seo_title text,
  seo_description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_departments TO anon;
GRANT SELECT ON public.shop_departments TO authenticated;
GRANT ALL ON public.shop_departments TO service_role;

ALTER TABLE public.shop_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by everyone"
  ON public.shop_departments FOR SELECT
  USING (active = true);

CREATE POLICY "Shop managers can manage departments"
  ON public.shop_departments FOR ALL
  TO authenticated
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE TRIGGER trg_shop_departments_updated
  BEFORE UPDATE ON public.shop_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Department columns on shop_categories
ALTER TABLE public.shop_categories
  ADD COLUMN IF NOT EXISTS department_slug text REFERENCES public.shop_departments(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cross_department_slugs text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_shop_categories_department
  ON public.shop_categories(department_slug);
CREATE INDEX IF NOT EXISTS idx_shop_categories_cross_dept
  ON public.shop_categories USING GIN (cross_department_slugs);

-- 3. Seed departments
INSERT INTO public.shop_departments (slug, name, description, icon, sort_order) VALUES
  ('performance-parts',     'Performance Parts',     'Intakes, exhausts, body kits, spoilers, tuning and bolt-on power.', 'Gauge',    10),
  ('maintenance-fluids',    'Maintenance & Fluids',  'Engine oil, ATF, brake fluid, coolant, grease and service supplies.', 'Droplets', 20),
  ('repair-replacement',    'Repair & Replacement',  'OEM-style brakes, suspension, ignition, cooling and engine parts.', 'Wrench',   30),
  ('wheels-tires-brakes',   'Wheels, Tires & Brakes','Tires, wheels, TPMS, brake pads and rotors.', 'CircleDot',40),
  ('interior-exterior',     'Interior & Exterior',   'Detailing, mats, seat covers, tint, decals and accessories.', 'Sparkles', 50),
  ('tools-garage',          'Tools & Garage',        'Hand tools, power tools, jacks, lifts, storage and safety gear.', 'Hammer',   60),
  ('electronics-lighting',  'Electronics & Lighting','Dashcams, head units, speakers, sensors and LED/HID lighting.', 'Cable',    70),
  ('specialty',             'Specialty',             'Motorcycle gear, off-road overland and EV/hybrid essentials.', 'Compass',  80)
ON CONFLICT (slug) DO NOTHING;

-- 4. Assign each top-level category to a department
UPDATE public.shop_categories SET department_slug = 'interior-exterior'    WHERE slug = 'detailing'         AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'tools'             AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'repair-replacement'   WHERE slug = 'parts'             AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'electronics-lighting' WHERE slug = 'electronics'       AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'interior-exterior'    WHERE slug = 'accessories'       AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'wheels-tires-brakes'  WHERE slug = 'tires-wheels'      AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'maintenance-fluids'   WHERE slug = 'lubricants'        AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'safety'            AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'performance-parts'    WHERE slug = 'performance-tuning' AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'performance-parts'    WHERE slug = 'exterior-mods'     AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'motorcycle-gear'   AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'off-road-overland' AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'ev-hybrid'         AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'garage-storage'    AND parent_id IS NULL;

-- 5. Cross-department tags for items that naturally fit two departments
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['wheels-tires-brakes']    WHERE slug = 'brakes';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['maintenance-fluids']     WHERE slug = 'filters';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['maintenance-fluids']     WHERE slug = 'belts-hoses';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['performance-parts']      WHERE slug IN ('window-tint','decals');
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['performance-parts']      WHERE slug = 'perf-exhaust';
