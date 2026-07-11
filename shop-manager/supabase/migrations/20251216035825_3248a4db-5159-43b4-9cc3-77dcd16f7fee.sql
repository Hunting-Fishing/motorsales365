-- Phase 2: Driver/Operator Compliance and Tire Management Systems

-- =============================================
-- DRIVER/OPERATOR COMPLIANCE TABLES
-- =============================================

-- Driver profiles (extends staff profiles with driver-specific info)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number VARCHAR(50),
  license_class VARCHAR(20),
  license_state VARCHAR(50),
  license_expiry DATE,
  medical_card_expiry DATE,
  endorsements JSONB DEFAULT '[]'::jsonb,
  restrictions TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  date_of_birth DATE,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Driver licenses (historical tracking)
CREATE TABLE IF NOT EXISTS public.driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  license_type VARCHAR(50) NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  issuing_state VARCHAR(50),
  issue_date DATE,
  expiry_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Driver violations
CREATE TABLE IF NOT EXISTS public.driver_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  violation_date DATE NOT NULL,
  violation_type VARCHAR(100) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 0,
  fine_amount DECIMAL(10,2),
  location VARCHAR(255),
  is_resolved BOOLEAN DEFAULT false,
  resolution_date DATE,
  resolution_notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hours of Service (HOS) logs
CREATE TABLE IF NOT EXISTS public.driver_hours_of_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  driving_hours DECIMAL(4,2) DEFAULT 0,
  on_duty_hours DECIMAL(4,2) DEFAULT 0,
  off_duty_hours DECIMAL(4,2) DEFAULT 0,
  sleeper_hours DECIMAL(4,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'compliant',
  violation_type VARCHAR(100),
  notes TEXT,
  certified_by UUID REFERENCES public.profiles(id),
  certified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, log_date)
);

-- Driver equipment assignments
CREATE TABLE IF NOT EXISTS public.driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assignment_date DATE NOT NULL,
  end_date DATE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Driver safety scores
CREATE TABLE IF NOT EXISTS public.driver_safety_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  overall_score INTEGER DEFAULT 100,
  speeding_events INTEGER DEFAULT 0,
  hard_braking_events INTEGER DEFAULT 0,
  rapid_acceleration_events INTEGER DEFAULT 0,
  accident_count INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  miles_driven DECIMAL(10,2) DEFAULT 0,
  hours_driven DECIMAL(6,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TIRE MANAGEMENT TABLES
-- =============================================

-- Tire brands reference
CREATE TABLE IF NOT EXISTS public.tire_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  warranty_miles INTEGER,
  warranty_months INTEGER,
  rating VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tire inventory
CREATE TABLE IF NOT EXISTS public.tire_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  brand_id UUID REFERENCES public.tire_brands(id) ON DELETE SET NULL,
  brand_name VARCHAR(100),
  model VARCHAR(100),
  size VARCHAR(50) NOT NULL,
  dot_code VARCHAR(20),
  serial_number VARCHAR(50),
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  vendor_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'new',
  tread_depth_initial DECIMAL(4,2),
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tire installations
CREATE TABLE IF NOT EXISTS public.tire_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  tire_id UUID NOT NULL REFERENCES public.tire_inventory(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  position VARCHAR(20) NOT NULL,
  install_date DATE NOT NULL,
  install_mileage INTEGER,
  install_hours DECIMAL(10,2),
  remove_date DATE,
  remove_mileage INTEGER,
  remove_hours DECIMAL(10,2),
  removal_reason VARCHAR(100),
  installed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tire inspections
CREATE TABLE IF NOT EXISTS public.tire_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  tire_id UUID NOT NULL REFERENCES public.tire_inventory(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL,
  tread_depth_32nds DECIMAL(4,2),
  pressure_psi DECIMAL(5,2),
  condition VARCHAR(20) DEFAULT 'good',
  damage_type VARCHAR(100),
  damage_location VARCHAR(50),
  photo_url TEXT,
  inspector_id UUID REFERENCES public.profiles(id),
  inspector_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tire rotations
CREATE TABLE IF NOT EXISTS public.tire_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  rotation_date DATE NOT NULL,
  mileage INTEGER,
  hours DECIMAL(10,2),
  rotation_pattern JSONB,
  performed_by UUID REFERENCES public.profiles(id),
  work_order_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_hours_of_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_safety_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_rotations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

CREATE POLICY "driver_profiles_select" ON public.driver_profiles FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_profiles_insert" ON public.driver_profiles FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_profiles_update" ON public.driver_profiles FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_profiles_delete" ON public.driver_profiles FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "driver_licenses_select" ON public.driver_licenses FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_licenses_insert" ON public.driver_licenses FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_licenses_update" ON public.driver_licenses FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_licenses_delete" ON public.driver_licenses FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "driver_violations_select" ON public.driver_violations FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_violations_insert" ON public.driver_violations FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_violations_update" ON public.driver_violations FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_violations_delete" ON public.driver_violations FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "driver_hos_select" ON public.driver_hours_of_service FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_hos_insert" ON public.driver_hours_of_service FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_hos_update" ON public.driver_hours_of_service FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_hos_delete" ON public.driver_hours_of_service FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "driver_assignments_select" ON public.driver_assignments FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_assignments_insert" ON public.driver_assignments FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_assignments_update" ON public.driver_assignments FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_assignments_delete" ON public.driver_assignments FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "driver_safety_scores_select" ON public.driver_safety_scores FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_safety_scores_insert" ON public.driver_safety_scores FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_safety_scores_update" ON public.driver_safety_scores FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "driver_safety_scores_delete" ON public.driver_safety_scores FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "tire_brands_select" ON public.tire_brands FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_brands_insert" ON public.tire_brands FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_brands_update" ON public.tire_brands FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_brands_delete" ON public.tire_brands FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "tire_inventory_select" ON public.tire_inventory FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inventory_insert" ON public.tire_inventory FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inventory_update" ON public.tire_inventory FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inventory_delete" ON public.tire_inventory FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "tire_installations_select" ON public.tire_installations FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_installations_insert" ON public.tire_installations FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_installations_update" ON public.tire_installations FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_installations_delete" ON public.tire_installations FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "tire_inspections_select" ON public.tire_inspections FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inspections_insert" ON public.tire_inspections FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inspections_update" ON public.tire_inspections FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_inspections_delete" ON public.tire_inspections FOR DELETE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "tire_rotations_select" ON public.tire_rotations FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_rotations_insert" ON public.tire_rotations FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_rotations_update" ON public.tire_rotations FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "tire_rotations_delete" ON public.tire_rotations FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_driver_profiles_shop ON public.driver_profiles(shop_id);
CREATE INDEX idx_driver_profiles_staff ON public.driver_profiles(staff_id);
CREATE INDEX idx_driver_licenses_driver ON public.driver_licenses(driver_id);
CREATE INDEX idx_driver_violations_driver ON public.driver_violations(driver_id);
CREATE INDEX idx_driver_hos_driver ON public.driver_hours_of_service(driver_id);
CREATE INDEX idx_driver_hos_date ON public.driver_hours_of_service(log_date);
CREATE INDEX idx_driver_assignments_driver ON public.driver_assignments(driver_id);
CREATE INDEX idx_driver_safety_driver ON public.driver_safety_scores(driver_id);
CREATE INDEX idx_tire_inventory_shop ON public.tire_inventory(shop_id);
CREATE INDEX idx_tire_inventory_status ON public.tire_inventory(status);
CREATE INDEX idx_tire_installations_tire ON public.tire_installations(tire_id);
CREATE INDEX idx_tire_installations_equip ON public.tire_installations(equipment_id);
CREATE INDEX idx_tire_inspections_tire ON public.tire_inspections(tire_id);
CREATE INDEX idx_tire_rotations_equip ON public.tire_rotations(equipment_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_driver_profiles_ts BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_licenses_ts BEFORE UPDATE ON public.driver_licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_violations_ts BEFORE UPDATE ON public.driver_violations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_hos_ts BEFORE UPDATE ON public.driver_hours_of_service FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_assignments_ts BEFORE UPDATE ON public.driver_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_safety_ts BEFORE UPDATE ON public.driver_safety_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tire_brands_ts BEFORE UPDATE ON public.tire_brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tire_inventory_ts BEFORE UPDATE ON public.tire_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tire_installations_ts BEFORE UPDATE ON public.tire_installations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tire_inspections_ts BEFORE UPDATE ON public.tire_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tire_rotations_ts BEFORE UPDATE ON public.tire_rotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();