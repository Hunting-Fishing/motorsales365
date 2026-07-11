
-- 1. Septic Employees table
CREATE TABLE IF NOT EXISTS public.septic_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  hire_date date,
  hourly_rate numeric,
  status text NOT NULL DEFAULT 'active',
  emergency_contact_name text,
  emergency_contact_phone text,
  home_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_employees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_employees' AND policyname = 'septic_employees_shop_isolation') THEN
  CREATE POLICY septic_employees_shop_isolation ON public.septic_employees
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 2. Septic Employee Roles
CREATE TABLE IF NOT EXISTS public.septic_employee_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.septic_employees(id) ON DELETE CASCADE,
  role text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, role)
);

ALTER TABLE public.septic_employee_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_employee_roles' AND policyname = 'septic_employee_roles_shop_isolation') THEN
  CREATE POLICY septic_employee_roles_shop_isolation ON public.septic_employee_roles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.septic_employees e WHERE e.id = employee_id AND e.shop_id = public.get_current_user_shop_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.septic_employees e WHERE e.id = employee_id AND e.shop_id = public.get_current_user_shop_id()));
END IF;
END $$;

-- 3. Septic Certification Types
CREATE TABLE IF NOT EXISTS public.septic_certification_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  requires_renewal boolean NOT NULL DEFAULT true,
  default_validity_months integer,
  category text NOT NULL DEFAULT 'certification',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_certification_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_certification_types' AND policyname = 'septic_certification_types_shop_isolation') THEN
  CREATE POLICY septic_certification_types_shop_isolation ON public.septic_certification_types
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 4. Septic Employee Certifications
CREATE TABLE IF NOT EXISTS public.septic_employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.septic_employees(id) ON DELETE CASCADE,
  certification_type_id uuid NOT NULL REFERENCES public.septic_certification_types(id) ON DELETE CASCADE,
  certificate_number text,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  status text NOT NULL DEFAULT 'valid',
  document_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_employee_certifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_employee_certifications' AND policyname = 'septic_employee_certifications_shop_isolation') THEN
  CREATE POLICY septic_employee_certifications_shop_isolation ON public.septic_employee_certifications
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.septic_employees e WHERE e.id = employee_id AND e.shop_id = public.get_current_user_shop_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.septic_employees e WHERE e.id = employee_id AND e.shop_id = public.get_current_user_shop_id()));
END IF;
END $$;

-- 5. Seed default cert types for shops with septic module
INSERT INTO public.septic_certification_types (shop_id, name, description, requires_renewal, default_validity_months, category)
SELECT s.id, ct.name, ct.description, ct.requires_renewal, ct.default_validity_months, ct.category
FROM public.shops s
CROSS JOIN (VALUES
  ('CDL Class A', 'Commercial Driver License - Class A', true, 60, 'license'),
  ('CDL Class B', 'Commercial Driver License - Class B', true, 60, 'license'),
  ('Tanker Endorsement', 'CDL Tanker (N) Endorsement', true, 60, 'endorsement'),
  ('HazMat Endorsement', 'CDL Hazardous Materials (H) Endorsement', true, 60, 'endorsement'),
  ('Medical Card', 'DOT Medical Examiner Certificate', true, 24, 'certification'),
  ('Septic Installer License', 'Licensed septic system installer', true, 24, 'license'),
  ('Inspector Certification', 'Certified septic system inspector', true, 24, 'certification'),
  ('Confined Space Entry', 'Confined space entry training', true, 12, 'training'),
  ('First Aid/CPR', 'First Aid and CPR certification', true, 24, 'training'),
  ('OSHA 10', 'OSHA 10-hour safety training', false, NULL, 'training'),
  ('OSHA 30', 'OSHA 30-hour safety training', false, NULL, 'training'),
  ('Water Quality Certification', 'Water quality testing certification', true, 36, 'certification')
) AS ct(name, description, requires_renewal, default_validity_months, category)
WHERE EXISTS (SELECT 1 FROM public.shop_enabled_modules sem JOIN public.modules m ON sem.module_id = m.id WHERE sem.shop_id = s.id AND m.slug = 'septic');

-- 6. Migrate drivers to employees
INSERT INTO public.septic_employees (id, shop_id, profile_id, first_name, last_name, phone, email, hire_date, hourly_rate, status, home_address, notes, created_at, updated_at)
SELECT id, shop_id, profile_id, first_name, last_name, phone, email, hire_date, hourly_rate, status, home_address, notes, created_at, updated_at
FROM public.septic_drivers
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.septic_employee_roles (employee_id, role, is_primary)
SELECT id, 'driver', true FROM public.septic_drivers
ON CONFLICT (employee_id, role) DO NOTHING;
