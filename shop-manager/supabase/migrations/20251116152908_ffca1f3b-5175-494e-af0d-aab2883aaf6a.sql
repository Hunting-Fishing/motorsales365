-- Create timesheet entries table
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  break_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (COALESCE(break_minutes, 0) / 60.0)
      ELSE 0
    END
  ) STORED,
  
  -- Work assignment
  work_location_type TEXT NOT NULL CHECK (work_location_type IN ('vessel', 'yard', 'shop', 'office', 'field')),
  vessel_id UUID REFERENCES equipment_assets(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  
  -- Work details
  work_description TEXT NOT NULL,
  job_code TEXT,
  is_overtime BOOLEAN DEFAULT false,
  is_billable BOOLEAN DEFAULT true,
  
  -- Status and approval
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure logical time entries
  CONSTRAINT valid_times CHECK (end_time IS NULL OR end_time > start_time),
  CONSTRAINT valid_break CHECK (break_minutes >= 0 AND break_minutes < 480)
);

-- Create indexes for performance
CREATE INDEX idx_timesheet_employee ON timesheet_entries(employee_id);
CREATE INDEX idx_timesheet_date ON timesheet_entries(work_date);
CREATE INDEX idx_timesheet_status ON timesheet_entries(status);
CREATE INDEX idx_timesheet_vessel ON timesheet_entries(vessel_id) WHERE vessel_id IS NOT NULL;
CREATE INDEX idx_timesheet_work_order ON timesheet_entries(work_order_id) WHERE work_order_id IS NOT NULL;

-- Create timesheet periods table for pay period tracking
CREATE TABLE IF NOT EXISTS timesheet_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'processed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_period CHECK (end_date > start_date)
);

CREATE INDEX idx_timesheet_periods_dates ON timesheet_periods(start_date, end_date);

-- Update timestamp trigger for timesheet entries
CREATE OR REPLACE FUNCTION update_timesheet_entries_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_timesheet_entries_timestamp
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_entries_timestamp();

-- Function to auto-submit timesheets on end_time update
CREATE OR REPLACE FUNCTION auto_submit_timesheet()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If end_time is being set and status is draft, change to submitted
  IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL AND NEW.status = 'draft' THEN
    NEW.status = 'submitted';
    NEW.submitted_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_submit_timesheet
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_submit_timesheet();

-- Create view for timesheet summary
CREATE OR REPLACE VIEW timesheet_summary AS
SELECT 
  te.employee_id,
  p.first_name,
  p.last_name,
  p.email,
  te.work_date,
  DATE_TRUNC('week', te.work_date)::DATE as week_start,
  COUNT(*) as entry_count,
  SUM(te.total_hours) as total_hours,
  SUM(CASE WHEN te.is_overtime THEN te.total_hours ELSE 0 END) as overtime_hours,
  SUM(CASE WHEN te.is_billable THEN te.total_hours ELSE 0 END) as billable_hours,
  COUNT(CASE WHEN te.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN te.status = 'submitted' THEN 1 END) as pending_count,
  COUNT(CASE WHEN te.status = 'draft' THEN 1 END) as draft_count
FROM timesheet_entries te
JOIN profiles p ON p.id = te.employee_id
GROUP BY te.employee_id, p.first_name, p.last_name, p.email, te.work_date;

-- Enable RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheet entries
-- Employees can view their own entries
CREATE POLICY "Employees can view their own timesheet entries"
  ON timesheet_entries FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager', 'operations_manager', 'captain')
    )
  );

-- Employees can insert their own entries
CREATE POLICY "Employees can create their own timesheet entries"
  ON timesheet_entries FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Employees can update their own draft/submitted entries
CREATE POLICY "Employees can update their own entries"
  ON timesheet_entries FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid() AND status IN ('draft', 'submitted')
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager', 'operations_manager', 'captain')
    )
  );

-- Employees can delete their own draft entries
CREATE POLICY "Employees can delete their draft entries"
  ON timesheet_entries FOR DELETE
  TO authenticated
  USING (
    employee_id = auth.uid() AND status = 'draft'
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

-- RLS for timesheet periods
CREATE POLICY "Everyone can view timesheet periods"
  ON timesheet_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage timesheet periods"
  ON timesheet_periods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager', 'operations_manager')
    )
  );