-- Create scheduling conflicts table
CREATE TABLE IF NOT EXISTS public.scheduling_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('double_booking', 'overlapping_shift', 'time_off_conflict', 'accommodation_conflict', 'overtime', 'understaffed')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_assignment_id UUID REFERENCES public.work_schedule_assignments(id) ON DELETE CASCADE,
  conflicting_assignment_id UUID REFERENCES public.work_schedule_assignments(id) ON DELETE SET NULL,
  time_off_request_id UUID REFERENCES public.time_off_requests(id) ON DELETE SET NULL,
  conflict_date DATE NOT NULL,
  conflict_start_time TIME,
  conflict_end_time TIME,
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create scheduling statistics table for caching
CREATE TABLE IF NOT EXISTS public.scheduling_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_scheduled_hours DECIMAL(10, 2) DEFAULT 0,
  total_employees_scheduled INTEGER DEFAULT 0,
  total_shifts INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5, 2) DEFAULT 0,
  active_conflicts INTEGER DEFAULT 0,
  critical_conflicts INTEGER DEFAULT 0,
  understaffed_shifts INTEGER DEFAULT 0,
  overstaffed_shifts INTEGER DEFAULT 0,
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  labor_cost_estimate DECIMAL(12, 2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, stat_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduling_conflicts_shop_date ON public.scheduling_conflicts(shop_id, conflict_date);
CREATE INDEX IF NOT EXISTS idx_scheduling_conflicts_employee ON public.scheduling_conflicts(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_conflicts_unresolved ON public.scheduling_conflicts(shop_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_scheduling_statistics_shop_date ON public.scheduling_statistics(shop_id, stat_date);

-- Enable RLS
ALTER TABLE public.scheduling_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduling_conflicts
CREATE POLICY "Users can view conflicts in their shop"
  ON public.scheduling_conflicts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_conflicts.shop_id
    )
  );

CREATE POLICY "Users can create conflicts in their shop"
  ON public.scheduling_conflicts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_conflicts.shop_id
    )
  );

CREATE POLICY "Users can update conflicts in their shop"
  ON public.scheduling_conflicts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_conflicts.shop_id
    )
  );

CREATE POLICY "Users can delete conflicts in their shop"
  ON public.scheduling_conflicts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_conflicts.shop_id
    )
  );

-- RLS Policies for scheduling_statistics
CREATE POLICY "Users can view statistics in their shop"
  ON public.scheduling_statistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_statistics.shop_id
    )
  );

CREATE POLICY "Users can insert statistics in their shop"
  ON public.scheduling_statistics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_statistics.shop_id
    )
  );

CREATE POLICY "Users can update statistics in their shop"
  ON public.scheduling_statistics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.shop_id = scheduling_statistics.shop_id
    )
  );

-- Function to detect scheduling conflicts
CREATE OR REPLACE FUNCTION public.detect_schedule_conflicts(p_shop_id UUID, p_date_range_start DATE, p_date_range_end DATE)
RETURNS TABLE(
  conflict_id UUID,
  conflict_type TEXT,
  severity TEXT,
  employee_id UUID,
  employee_name TEXT,
  conflict_date DATE,
  description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing unresolved conflicts for the date range
  DELETE FROM public.scheduling_conflicts
  WHERE shop_id = p_shop_id
    AND conflict_date BETWEEN p_date_range_start AND p_date_range_end
    AND is_resolved = false;

  -- Detect double bookings (same employee, overlapping times, same day)
  INSERT INTO public.scheduling_conflicts (
    shop_id, conflict_type, severity, employee_id, 
    schedule_assignment_id, conflicting_assignment_id,
    conflict_date, conflict_start_time, conflict_end_time, description
  )
  SELECT 
    p_shop_id,
    'double_booking',
    'high',
    s1.employee_id,
    s1.id,
    s2.id,
    p_date_range_start + (s1.day_of_week || ' days')::INTERVAL,
    GREATEST(s1.shift_start::TIME, s2.shift_start::TIME),
    LEAST(s1.shift_end::TIME, s2.shift_end::TIME),
    'Employee scheduled for overlapping shifts on the same day'
  FROM public.work_schedule_assignments s1
  JOIN public.work_schedule_assignments s2 ON s1.employee_id = s2.employee_id
  WHERE s1.shop_id = p_shop_id
    AND s1.id < s2.id
    AND s1.day_of_week = s2.day_of_week
    AND s1.shift_start::TIME < s2.shift_end::TIME
    AND s1.shift_end::TIME > s2.shift_start::TIME
    AND p_date_range_start + (s1.day_of_week || ' days')::INTERVAL BETWEEN p_date_range_start AND p_date_range_end;

  -- Detect time off conflicts
  INSERT INTO public.scheduling_conflicts (
    shop_id, conflict_type, severity, employee_id,
    schedule_assignment_id, time_off_request_id,
    conflict_date, description
  )
  SELECT DISTINCT
    p_shop_id,
    'time_off_conflict',
    'critical',
    s.employee_id,
    s.id,
    t.id,
    date_series.date,
    'Employee is scheduled during approved time off'
  FROM public.work_schedule_assignments s
  JOIN public.time_off_requests t ON s.employee_id = t.employee_id
  CROSS JOIN LATERAL generate_series(
    GREATEST(t.start_date::DATE, p_date_range_start),
    LEAST(t.end_date::DATE, p_date_range_end),
    '1 day'::INTERVAL
  ) AS date_series(date)
  WHERE s.shop_id = p_shop_id
    AND t.status = 'approved'
    AND EXTRACT(DOW FROM date_series.date) = s.day_of_week;

  RETURN QUERY
  SELECT 
    c.id,
    c.conflict_type,
    c.severity,
    c.employee_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as employee_name,
    c.conflict_date,
    c.description
  FROM public.scheduling_conflicts c
  LEFT JOIN public.profiles p ON p.id = c.employee_id
  WHERE c.shop_id = p_shop_id
    AND c.conflict_date BETWEEN p_date_range_start AND p_date_range_end
    AND c.is_resolved = false
  ORDER BY c.severity DESC, c.conflict_date;
END;
$$;

-- Function to calculate scheduling statistics
CREATE OR REPLACE FUNCTION public.calculate_scheduling_statistics(p_shop_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_hours DECIMAL(10, 2);
  v_total_employees INTEGER;
  v_total_shifts INTEGER;
  v_active_conflicts INTEGER;
  v_critical_conflicts INTEGER;
BEGIN
  -- Calculate total scheduled hours for the date
  SELECT 
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (shift_end::TIME - shift_start::TIME)) / 3600
    ), 0),
    COUNT(DISTINCT employee_id),
    COUNT(*)
  INTO v_total_hours, v_total_employees, v_total_shifts
  FROM public.work_schedule_assignments
  WHERE shop_id = p_shop_id
    AND day_of_week = EXTRACT(DOW FROM p_date)
    AND effective_from <= p_date
    AND (effective_until IS NULL OR effective_until >= p_date);

  -- Count conflicts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE severity = 'critical')
  INTO v_active_conflicts, v_critical_conflicts
  FROM public.scheduling_conflicts
  WHERE shop_id = p_shop_id
    AND conflict_date = p_date
    AND is_resolved = false;

  -- Insert or update statistics
  INSERT INTO public.scheduling_statistics (
    shop_id, stat_date, total_scheduled_hours, total_employees_scheduled,
    total_shifts, active_conflicts, critical_conflicts
  )
  VALUES (
    p_shop_id, p_date, v_total_hours, v_total_employees,
    v_total_shifts, v_active_conflicts, v_critical_conflicts
  )
  ON CONFLICT (shop_id, stat_date) 
  DO UPDATE SET
    total_scheduled_hours = v_total_hours,
    total_employees_scheduled = v_total_employees,
    total_shifts = v_total_shifts,
    active_conflicts = v_active_conflicts,
    critical_conflicts = v_critical_conflicts,
    updated_at = now();
END;
$$;

-- Trigger to update statistics when schedules change
CREATE OR REPLACE FUNCTION public.update_scheduling_stats_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate stats for affected dates
  PERFORM public.calculate_scheduling_statistics(
    COALESCE(NEW.shop_id, OLD.shop_id),
    CURRENT_DATE + (COALESCE(NEW.day_of_week, OLD.day_of_week) || ' days')::INTERVAL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_scheduling_stats
AFTER INSERT OR UPDATE OR DELETE ON public.work_schedule_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduling_stats_trigger();

-- Update timestamps trigger
CREATE TRIGGER update_scheduling_conflicts_updated_at
BEFORE UPDATE ON public.scheduling_conflicts
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduling_tables_updated_at();

CREATE TRIGGER update_scheduling_statistics_updated_at
BEFORE UPDATE ON public.scheduling_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduling_tables_updated_at();