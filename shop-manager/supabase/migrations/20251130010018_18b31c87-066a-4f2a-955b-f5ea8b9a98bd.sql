-- ============================================
-- PHASE 1: Safety Management System Tables
-- ============================================

-- 1. Safety Incidents Table
CREATE TABLE public.safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL,
  incident_time TIME,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury', 'near_miss', 'property_damage', 'chemical_exposure', 'slip_trip_fall', 'equipment_failure', 'vehicle_incident', 'fire', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')),
  location TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  injured_person_name TEXT,
  injured_person_type TEXT CHECK (injured_person_type IN ('employee', 'customer', 'visitor', 'contractor')),
  injury_details TEXT,
  medical_treatment_required BOOLEAN DEFAULT false,
  medical_treatment_description TEXT,
  witnesses TEXT[],
  photos TEXT[],
  osha_reportable BOOLEAN DEFAULT false,
  osha_report_number TEXT,
  investigation_status TEXT NOT NULL DEFAULT 'open' CHECK (investigation_status IN ('open', 'under_investigation', 'resolved', 'closed')),
  root_cause TEXT,
  corrective_actions TEXT,
  preventive_measures TEXT,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_investigator UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Daily Shop Inspections Table
CREATE TABLE public.daily_shop_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  inspector_name TEXT NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  fire_extinguishers_ok BOOLEAN,
  emergency_exits_clear BOOLEAN,
  first_aid_kit_stocked BOOLEAN,
  spill_kit_available BOOLEAN,
  ventilation_working BOOLEAN,
  floor_condition TEXT CHECK (floor_condition IN ('good', 'fair', 'poor', 'hazardous')),
  lighting_adequate BOOLEAN,
  ppe_available BOOLEAN,
  tools_condition TEXT CHECK (tools_condition IN ('good', 'fair', 'poor')),
  hazards_identified TEXT[],
  corrective_actions_needed TEXT,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('pass', 'pass_with_issues', 'fail')),
  notes TEXT,
  inspector_signature TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, inspection_date, shift)
);

-- 3. DVIR Reports Table (Driver Vehicle Inspection Report)
CREATE TABLE public.dvir_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip', 'roadside')),
  inspection_date DATE NOT NULL,
  inspection_time TIME NOT NULL,
  odometer_reading INTEGER,
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  driver_name TEXT NOT NULL,
  
  -- Vehicle Systems Checks
  brakes_ok BOOLEAN NOT NULL,
  lights_ok BOOLEAN NOT NULL,
  tires_ok BOOLEAN NOT NULL,
  mirrors_ok BOOLEAN NOT NULL,
  horn_ok BOOLEAN NOT NULL,
  windshield_ok BOOLEAN NOT NULL,
  wipers_ok BOOLEAN NOT NULL,
  steering_ok BOOLEAN NOT NULL,
  emergency_equipment_ok BOOLEAN NOT NULL,
  fluid_levels_ok BOOLEAN NOT NULL,
  exhaust_ok BOOLEAN NOT NULL,
  coupling_devices_ok BOOLEAN,
  cargo_securement_ok BOOLEAN,
  
  -- Defects
  defects_found BOOLEAN NOT NULL DEFAULT false,
  defects_description TEXT,
  defect_photos TEXT[],
  
  -- Status
  vehicle_safe_to_operate BOOLEAN NOT NULL,
  mechanic_review_required BOOLEAN DEFAULT false,
  mechanic_reviewed_by UUID REFERENCES auth.users(id),
  mechanic_review_date TIMESTAMPTZ,
  mechanic_notes TEXT,
  repairs_completed BOOLEAN,
  repairs_description TEXT,
  
  driver_signature TEXT NOT NULL,
  mechanic_signature TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Safety Documents Table
CREATE TABLE public.safety_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('sds', 'policy', 'procedure', 'training_material', 'inspection_form', 'permit', 'certification', 'manual', 'emergency_plan', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- SDS-specific fields
  chemical_name TEXT,
  manufacturer TEXT,
  hazard_classification TEXT[],
  storage_location TEXT,
  
  -- Versioning
  version TEXT DEFAULT '1.0',
  revision_date DATE,
  effective_date DATE,
  expiry_date DATE,
  
  -- Access control
  is_active BOOLEAN DEFAULT true,
  requires_acknowledgment BOOLEAN DEFAULT false,
  department TEXT,
  
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Lift/Hoist Inspections Table
CREATE TABLE public.lift_hoist_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id),
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('two_post_lift', 'four_post_lift', 'scissor_lift', 'in_ground_lift', 'mobile_column', 'engine_hoist', 'transmission_jack', 'other')),
  serial_number TEXT,
  location TEXT,
  
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  inspection_date DATE NOT NULL,
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  inspector_name TEXT NOT NULL,
  
  -- Inspection Items
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  structural_integrity_ok BOOLEAN,
  hydraulic_system_ok BOOLEAN,
  safety_locks_ok BOOLEAN,
  controls_ok BOOLEAN,
  cables_chains_ok BOOLEAN,
  capacity_label_visible BOOLEAN,
  floor_anchors_ok BOOLEAN,
  lubrication_ok BOOLEAN,
  
  -- Results
  safe_for_use BOOLEAN NOT NULL,
  deficiencies_found TEXT[],
  corrective_actions TEXT,
  next_inspection_date DATE,
  
  -- Lockout/Tagout
  locked_out BOOLEAN DEFAULT false,
  lockout_reason TEXT,
  lockout_date DATE,
  lockout_by UUID REFERENCES auth.users(id),
  
  inspector_signature TEXT,
  photos TEXT[],
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_safety_incidents_shop_date ON public.safety_incidents(shop_id, incident_date DESC);
CREATE INDEX idx_safety_incidents_status ON public.safety_incidents(investigation_status);
CREATE INDEX idx_safety_incidents_severity ON public.safety_incidents(severity);
CREATE INDEX idx_daily_shop_inspections_shop_date ON public.daily_shop_inspections(shop_id, inspection_date DESC);
CREATE INDEX idx_dvir_reports_shop_vehicle ON public.dvir_reports(shop_id, vehicle_id);
CREATE INDEX idx_dvir_reports_date ON public.dvir_reports(inspection_date DESC);
CREATE INDEX idx_safety_documents_shop_type ON public.safety_documents(shop_id, document_type);
CREATE INDEX idx_lift_inspections_shop ON public.lift_hoist_inspections(shop_id, inspection_date DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Safety Incidents RLS
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety incidents for their shop"
ON public.safety_incidents FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create safety incidents for their shop"
ON public.safety_incidents FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update safety incidents for their shop"
ON public.safety_incidents FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Daily Shop Inspections RLS
ALTER TABLE public.daily_shop_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspections for their shop"
ON public.daily_shop_inspections FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create inspections for their shop"
ON public.daily_shop_inspections FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update inspections for their shop"
ON public.daily_shop_inspections FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- DVIR Reports RLS
ALTER TABLE public.dvir_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DVIR reports for their shop"
ON public.dvir_reports FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create DVIR reports for their shop"
ON public.dvir_reports FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update DVIR reports for their shop"
ON public.dvir_reports FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Safety Documents RLS
ALTER TABLE public.safety_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety documents for their shop"
ON public.safety_documents FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create safety documents for their shop"
ON public.safety_documents FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update safety documents for their shop"
ON public.safety_documents FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete safety documents for their shop"
ON public.safety_documents FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Lift/Hoist Inspections RLS
ALTER TABLE public.lift_hoist_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lift inspections for their shop"
ON public.lift_hoist_inspections FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create lift inspections for their shop"
ON public.lift_hoist_inspections FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update lift inspections for their shop"
ON public.lift_hoist_inspections FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_safety_incidents_updated_at
  BEFORE UPDATE ON public.safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_shop_inspections_updated_at
  BEFORE UPDATE ON public.daily_shop_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dvir_reports_updated_at
  BEFORE UPDATE ON public.dvir_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_documents_updated_at
  BEFORE UPDATE ON public.safety_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lift_hoist_inspections_updated_at
  BEFORE UPDATE ON public.lift_hoist_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();