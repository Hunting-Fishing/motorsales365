-- Phase 5: Advanced Analytics, Payroll & Compliance

-- Labor cost analytics table
CREATE TABLE IF NOT EXISTS labor_cost_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_labor_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  regular_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_shifts INTEGER NOT NULL DEFAULT 0,
  average_hourly_rate NUMERIC(10,2),
  labor_cost_percentage NUMERIC(5,2),
  revenue NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time card entries table
CREATE TABLE IF NOT EXISTS time_card_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_hours NUMERIC(10,2),
  regular_hours NUMERIC(10,2),
  overtime_hours NUMERIC(10,2),
  break_duration_minutes INTEGER,
  hourly_rate NUMERIC(10,2),
  total_pay NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'approved', 'disputed')),
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pay periods table
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed', 'paid')),
  total_hours NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  employee_count INTEGER,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, start_date, end_date)
);

-- Compliance violations table
CREATE TABLE IF NOT EXISTS compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id),
  violation_type TEXT NOT NULL,
  violation_date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  schedule_assignment_id UUID REFERENCES work_schedule_assignments(id),
  time_card_id UUID REFERENCES time_card_entries(id),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Schedule optimization metrics table
CREATE TABLE IF NOT EXISTS schedule_optimization_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  coverage_score NUMERIC(5,2),
  efficiency_score NUMERIC(5,2),
  cost_score NUMERIC(5,2),
  employee_satisfaction_score NUMERIC(5,2),
  understaffed_hours INTEGER,
  overstaffed_hours INTEGER,
  optimal_hours INTEGER,
  total_gaps INTEGER,
  total_overlaps INTEGER,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, metric_date)
);

-- Schedule forecasts table
CREATE TABLE IF NOT EXISTS schedule_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('demand', 'labor_cost', 'coverage')),
  predicted_value NUMERIC(10,2) NOT NULL,
  confidence_level NUMERIC(5,2),
  actual_value NUMERIC(10,2),
  variance NUMERIC(10,2),
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Overtime tracking table
CREATE TABLE IF NOT EXISTS overtime_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  regular_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_limit NUMERIC(5,2) NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'approaching_limit', 'over_limit')),
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, employee_id, week_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labor_cost_analytics_shop_period ON labor_cost_analytics(shop_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_time_card_entries_employee ON time_card_entries(employee_id, clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_card_entries_status ON time_card_entries(status);
CREATE INDEX IF NOT EXISTS idx_pay_periods_shop_status ON pay_periods(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_employee ON compliance_violations(employee_id, resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_schedule_optimization_shop_date ON schedule_optimization_metrics(shop_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_forecasts_shop_date ON schedule_forecasts(shop_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_overtime_tracking_employee_week ON overtime_tracking(employee_id, week_start_date);

-- RLS Policies
ALTER TABLE labor_cost_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_card_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_optimization_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_tracking ENABLE ROW LEVEL SECURITY;

-- Labor cost analytics policies (managers/admins)
CREATE POLICY "Managers can view labor analytics" ON labor_cost_analytics FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Time card policies (employees can view their own, managers can view all)
CREATE POLICY "Employees can view their own time cards" ON time_card_entries FOR SELECT USING (
  employee_id = auth.uid()
);

CREATE POLICY "Managers can view all time cards" ON time_card_entries FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Employees can create their own time cards" ON time_card_entries FOR INSERT WITH CHECK (
  employee_id = auth.uid()
  AND shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Employees can update their own time cards" ON time_card_entries FOR UPDATE USING (
  employee_id = auth.uid() AND status = 'active'
);

CREATE POLICY "Managers can manage time cards" ON time_card_entries FOR ALL USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Pay periods policies (managers only)
CREATE POLICY "Managers can manage pay periods" ON pay_periods FOR ALL USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Compliance violations policies
CREATE POLICY "Managers can view compliance violations" ON compliance_violations FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Managers can manage compliance violations" ON compliance_violations FOR ALL USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Schedule optimization policies (managers/admins)
CREATE POLICY "Managers can view optimization metrics" ON schedule_optimization_metrics FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Schedule forecasts policies (managers/admins)
CREATE POLICY "Managers can view forecasts" ON schedule_forecasts FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Overtime tracking policies
CREATE POLICY "Employees can view their own overtime" ON overtime_tracking FOR SELECT USING (
  employee_id = auth.uid()
);

CREATE POLICY "Managers can view all overtime" ON overtime_tracking FOR SELECT USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager')
  )
);

-- Updated at triggers
CREATE TRIGGER set_updated_at_labor_cost_analytics
  BEFORE UPDATE ON labor_cost_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_time_card_entries
  BEFORE UPDATE ON time_card_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pay_periods
  BEFORE UPDATE ON pay_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_compliance_violations
  BEFORE UPDATE ON compliance_violations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_schedule_forecasts
  BEFORE UPDATE ON schedule_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_overtime_tracking
  BEFORE UPDATE ON overtime_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();