-- Equipment types and management
CREATE TYPE equipment_type AS ENUM ('marine', 'forklift', 'semi', 'small_engine', 'other');
CREATE TYPE equipment_status AS ENUM ('operational', 'maintenance', 'down', 'retired');
CREATE TYPE maintenance_request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Equipment table with detailed tracking
CREATE TABLE equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  equipment_type equipment_type NOT NULL,
  asset_number TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  year INTEGER,
  
  -- Type-specific fields (JSON for flexibility)
  specifications JSONB DEFAULT '{}'::jsonb,
  
  -- Location and assignment
  location TEXT,
  assigned_to UUID REFERENCES profiles(id),
  department TEXT,
  
  -- Tracking
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  current_hours NUMERIC(10,2) DEFAULT 0,
  current_mileage NUMERIC(10,2) DEFAULT 0,
  
  -- Status
  status equipment_status DEFAULT 'operational',
  last_service_date DATE,
  next_service_date DATE,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  notes TEXT,
  
  UNIQUE(shop_id, asset_number)
);

-- Maintenance requests
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  
  -- Request details
  request_number TEXT NOT NULL,
  request_type TEXT NOT NULL, -- 'breakdown', 'preventive', 'routine_check', 'inspection'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  issues_found JSONB DEFAULT '[]'::jsonb,
  
  -- Requester info
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_by_name TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  assigned_to_name TEXT,
  
  -- Status and tracking
  status maintenance_request_status DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Completion
  work_order_id UUID REFERENCES work_orders(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  completed_by_name TEXT,
  
  -- Parts tracking
  parts_requested JSONB DEFAULT '[]'::jsonb,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Metrics
  estimated_hours NUMERIC(10,2),
  actual_hours NUMERIC(10,2),
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(shop_id, request_number)
);

-- Equipment reports (daily/weekly)
CREATE TABLE equipment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  
  -- Report details
  report_number TEXT NOT NULL,
  report_type report_type NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT,
  
  -- Usage tracking
  hours_used NUMERIC(10,2),
  starting_hours NUMERIC(10,2),
  ending_hours NUMERIC(10,2),
  mileage_used NUMERIC(10,2),
  starting_mileage NUMERIC(10,2),
  ending_mileage NUMERIC(10,2),
  
  -- Operator info
  operator_id UUID NOT NULL REFERENCES profiles(id),
  operator_name TEXT NOT NULL,
  
  -- Condition and issues
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  issues_found JSONB DEFAULT '[]'::jsonb,
  maintenance_needed BOOLEAN DEFAULT false,
  
  -- Safety checks
  safety_checks JSONB DEFAULT '{}'::jsonb,
  safety_issues JSONB DEFAULT '[]'::jsonb,
  
  -- Fuel and fluids
  fuel_level TEXT,
  fuel_added NUMERIC(10,2),
  fluids_checked BOOLEAN DEFAULT false,
  fluids_added JSONB DEFAULT '[]'::jsonb,
  
  -- Approvals
  approval_status approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Notes and attachments
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(shop_id, report_number)
);

-- Audit trail for all changes
CREATE TABLE equipment_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- What changed
  entity_type TEXT NOT NULL, -- 'equipment', 'maintenance_request', 'report'
  entity_id UUID NOT NULL,
  
  -- Change details
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'approved', 'rejected'
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  change_summary TEXT,
  
  -- Who and when
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_by_name TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Equipment PM schedules
CREATE TABLE equipment_pm_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  
  -- Schedule info
  schedule_name TEXT NOT NULL,
  description TEXT,
  
  -- Frequency
  frequency_type TEXT NOT NULL, -- 'hours', 'mileage', 'days', 'both'
  frequency_hours NUMERIC(10,2),
  frequency_mileage NUMERIC(10,2),
  frequency_days INTEGER,
  
  -- Last and next service
  last_service_date DATE,
  last_service_hours NUMERIC(10,2),
  last_service_mileage NUMERIC(10,2),
  next_service_date DATE,
  next_service_hours NUMERIC(10,2),
  next_service_mileage NUMERIC(10,2),
  
  -- Tasks and checklist
  tasks JSONB DEFAULT '[]'::jsonb,
  parts_needed JSONB DEFAULT '[]'::jsonb,
  estimated_duration NUMERIC(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_overdue BOOLEAN DEFAULT false,
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_equipment_assets_shop ON equipment_assets(shop_id);
CREATE INDEX idx_equipment_assets_type ON equipment_assets(equipment_type);
CREATE INDEX idx_equipment_assets_status ON equipment_assets(status);
CREATE INDEX idx_equipment_assets_assigned ON equipment_assets(assigned_to);

CREATE INDEX idx_maintenance_requests_shop ON maintenance_requests(shop_id);
CREATE INDEX idx_maintenance_requests_equipment ON maintenance_requests(equipment_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_assigned ON maintenance_requests(assigned_to);

CREATE INDEX idx_equipment_reports_shop ON equipment_reports(shop_id);
CREATE INDEX idx_equipment_reports_equipment ON equipment_reports(equipment_id);
CREATE INDEX idx_equipment_reports_date ON equipment_reports(report_date);
CREATE INDEX idx_equipment_reports_operator ON equipment_reports(operator_id);

CREATE INDEX idx_audit_trail_shop ON equipment_audit_trail(shop_id);
CREATE INDEX idx_audit_trail_entity ON equipment_audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_changed_by ON equipment_audit_trail(changed_by);

CREATE INDEX idx_pm_schedules_equipment ON equipment_pm_schedules(equipment_id);
CREATE INDEX idx_pm_schedules_overdue ON equipment_pm_schedules(is_overdue) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_assets_updated_at
  BEFORE UPDATE ON equipment_assets
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER equipment_reports_updated_at
  BEFORE UPDATE ON equipment_reports
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER equipment_pm_schedules_updated_at
  BEFORE UPDATE ON equipment_pm_schedules
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

-- Audit trail trigger function
CREATE OR REPLACE FUNCTION create_equipment_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Get the user's name
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO user_name
  FROM profiles WHERE id = auth.uid();
  
  -- Insert audit record
  INSERT INTO equipment_audit_trail (
    shop_id,
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    changed_by,
    changed_by_name
  ) VALUES (
    COALESCE(NEW.shop_id, OLD.shop_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    user_name
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER equipment_assets_audit
  AFTER INSERT OR UPDATE OR DELETE ON equipment_assets
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

CREATE TRIGGER maintenance_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

CREATE TRIGGER equipment_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON equipment_reports
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

-- RLS Policies
ALTER TABLE equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_pm_schedules ENABLE ROW LEVEL SECURITY;

-- Equipment assets policies
CREATE POLICY "Users can view equipment from their shop"
  ON equipment_assets FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert equipment into their shop"
  ON equipment_assets FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update equipment in their shop"
  ON equipment_assets FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete equipment from their shop"
  ON equipment_assets FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Maintenance requests policies
CREATE POLICY "Users can view maintenance requests from their shop"
  ON maintenance_requests FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update maintenance requests in their shop"
  ON maintenance_requests FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete maintenance requests from their shop"
  ON maintenance_requests FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Equipment reports policies
CREATE POLICY "Users can view reports from their shop"
  ON equipment_reports FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can submit reports"
  ON equipment_reports FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update reports in their shop"
  ON equipment_reports FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete reports from their shop"
  ON equipment_reports FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Audit trail policies
CREATE POLICY "Users can view audit trail from their shop"
  ON equipment_audit_trail FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- PM schedules policies
CREATE POLICY "Users can view PM schedules from their shop"
  ON equipment_pm_schedules FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create PM schedules"
  ON equipment_pm_schedules FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update PM schedules in their shop"
  ON equipment_pm_schedules FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete PM schedules from their shop"
  ON equipment_pm_schedules FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));