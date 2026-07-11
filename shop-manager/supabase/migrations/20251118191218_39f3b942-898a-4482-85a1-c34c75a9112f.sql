-- Employee Scheduling System Tables

-- Time off types table
CREATE TABLE IF NOT EXISTS time_off_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  max_days_per_year INTEGER,
  color TEXT DEFAULT '#3b82f6',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, code)
);

-- Time off requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  time_off_type_id UUID REFERENCES time_off_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee accommodations table
CREATE TABLE IF NOT EXISTS employee_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  accommodation_type TEXT NOT NULL CHECK (accommodation_type IN ('medical', 'religious', 'personal', 'disability', 'other')),
  description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_permanent BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work schedule assignments table (extends existing team_schedules)
CREATE TABLE IF NOT EXISTS work_schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL,
  effective_until DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PTO balances table
CREATE TABLE IF NOT EXISTS pto_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  time_off_type_id UUID REFERENCES time_off_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_allocated DECIMAL(10,2) DEFAULT 0,
  used_days DECIMAL(10,2) DEFAULT 0,
  pending_days DECIMAL(10,2) DEFAULT 0,
  remaining_days DECIMAL(10,2) GENERATED ALWAYS AS (total_allocated - used_days - pending_days) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, time_off_type_id, year)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_employee_accommodations_employee ON employee_accommodations(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedule_assignments_employee ON work_schedule_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_pto_balances_employee ON pto_balances(employee_id, year);

-- Enable RLS
ALTER TABLE time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_off_types
CREATE POLICY "Users can view time off types in their shop"
  ON time_off_types FOR SELECT
  USING (shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage time off types"
  ON time_off_types FOR ALL
  USING (
    shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid())
    AND is_owner_or_admin(auth.uid())
  );

-- RLS Policies for time_off_requests
CREATE POLICY "Employees can view their own time off requests"
  ON time_off_requests FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR is_owner_or_admin(auth.uid())
  );

CREATE POLICY "Employees can create their own time off requests"
  ON time_off_requests FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their pending requests"
  ON time_off_requests FOR UPDATE
  USING (employee_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can manage all time off requests"
  ON time_off_requests FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- RLS Policies for employee_accommodations
CREATE POLICY "Employees can view their own accommodations"
  ON employee_accommodations FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR is_owner_or_admin(auth.uid())
  );

CREATE POLICY "Admins can manage accommodations"
  ON employee_accommodations FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- RLS Policies for work_schedule_assignments
CREATE POLICY "Users can view schedules in their shop"
  ON work_schedule_assignments FOR SELECT
  USING (
    shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage work schedules"
  ON work_schedule_assignments FOR ALL
  USING (
    shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid())
    AND is_owner_or_admin(auth.uid())
  );

-- RLS Policies for pto_balances
CREATE POLICY "Employees can view their own PTO balances"
  ON pto_balances FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR is_owner_or_admin(auth.uid())
  );

CREATE POLICY "Admins can manage PTO balances"
  ON pto_balances FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_scheduling_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_off_types_updated_at
  BEFORE UPDATE ON time_off_types
  FOR EACH ROW EXECUTE FUNCTION update_scheduling_tables_updated_at();

CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON time_off_requests
  FOR EACH ROW EXECUTE FUNCTION update_scheduling_tables_updated_at();

CREATE TRIGGER update_employee_accommodations_updated_at
  BEFORE UPDATE ON employee_accommodations
  FOR EACH ROW EXECUTE FUNCTION update_scheduling_tables_updated_at();

CREATE TRIGGER update_work_schedule_assignments_updated_at
  BEFORE UPDATE ON work_schedule_assignments
  FOR EACH ROW EXECUTE FUNCTION update_scheduling_tables_updated_at();

CREATE TRIGGER update_pto_balances_updated_at
  BEFORE UPDATE ON pto_balances
  FOR EACH ROW EXECUTE FUNCTION update_scheduling_tables_updated_at();

-- Function to update PTO balance after request approval
CREATE OR REPLACE FUNCTION update_pto_balance_on_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When request is approved, update used_days
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE pto_balances
    SET used_days = used_days + NEW.total_days,
        pending_days = pending_days - NEW.total_days
    WHERE employee_id = NEW.employee_id
      AND time_off_type_id = NEW.time_off_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;

  -- When request goes to pending, add to pending_days
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    UPDATE pto_balances
    SET pending_days = pending_days + NEW.total_days
    WHERE employee_id = NEW.employee_id
      AND time_off_type_id = NEW.time_off_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;

  -- When request is denied or cancelled from pending, remove from pending_days
  IF NEW.status IN ('denied', 'cancelled') AND OLD.status = 'pending' THEN
    UPDATE pto_balances
    SET pending_days = pending_days - NEW.total_days
    WHERE employee_id = NEW.employee_id
      AND time_off_type_id = NEW.time_off_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_pto_balance_trigger
  AFTER INSERT OR UPDATE OF status ON time_off_requests
  FOR EACH ROW EXECUTE FUNCTION update_pto_balance_on_request_status();

-- Insert default time off types
INSERT INTO time_off_types (shop_id, name, code, is_paid, requires_approval, max_days_per_year, color, description)
SELECT 
  s.id,
  'Paid Time Off',
  'PTO',
  true,
  true,
  20,
  '#3b82f6',
  'Standard paid time off'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM time_off_types WHERE shop_id = s.id AND code = 'PTO'
);

INSERT INTO time_off_types (shop_id, name, code, is_paid, requires_approval, max_days_per_year, color, description)
SELECT 
  s.id,
  'Sick Leave',
  'SICK',
  true,
  false,
  10,
  '#ef4444',
  'Sick leave days'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM time_off_types WHERE shop_id = s.id AND code = 'SICK'
);

INSERT INTO time_off_types (shop_id, name, code, is_paid, requires_approval, max_days_per_year, color, description)
SELECT 
  s.id,
  'Unpaid Leave',
  'UNPAID',
  false,
  true,
  NULL,
  '#6b7280',
  'Unpaid leave of absence'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM time_off_types WHERE shop_id = s.id AND code = 'UNPAID'
);