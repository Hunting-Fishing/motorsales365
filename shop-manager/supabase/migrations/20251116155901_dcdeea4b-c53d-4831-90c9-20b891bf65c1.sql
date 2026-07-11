-- Equipment Usage Logs (for recording hours/km at each use)
CREATE TABLE equipment_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  reading_type TEXT NOT NULL CHECK (reading_type IN ('hours', 'kilometers', 'miles')),
  reading_value DECIMAL(10,2) NOT NULL,
  reading_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  operation_type TEXT CHECK (operation_type IN ('pre-trip', 'post-trip', 'maintenance', 'manual')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment Pre-Trip Inspections
CREATE TABLE equipment_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  inspector_id UUID REFERENCES auth.users(id),
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_reading DECIMAL(10,2) NOT NULL,
  reading_type TEXT NOT NULL CHECK (reading_type IN ('hours', 'kilometers', 'miles')),
  
  -- Inspection checklist
  fluid_levels_ok BOOLEAN DEFAULT true,
  fluid_notes TEXT,
  visual_damage_ok BOOLEAN DEFAULT true,
  visual_damage_notes TEXT,
  safety_equipment_ok BOOLEAN DEFAULT true,
  safety_equipment_notes TEXT,
  operational_ok BOOLEAN DEFAULT true,
  operational_notes TEXT,
  
  -- Overall status
  overall_status TEXT NOT NULL CHECK (overall_status IN ('pass', 'pass_with_notes', 'fail')),
  requires_maintenance BOOLEAN DEFAULT false,
  urgent_repair BOOLEAN DEFAULT false,
  
  -- Parts needed
  parts_needed JSONB DEFAULT '[]'::jsonb,
  
  general_notes TEXT,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced Maintenance Schedules with Usage-Based Triggers
CREATE TABLE maintenance_schedules_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  schedule_name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time-based', 'usage-based', 'both')),
  
  -- Time-based triggers
  time_interval_days INTEGER,
  last_service_date DATE,
  next_service_date DATE,
  
  -- Usage-based triggers
  usage_interval DECIMAL(10,2),
  usage_metric TEXT CHECK (usage_metric IN ('hours', 'kilometers', 'miles')),
  last_service_reading DECIMAL(10,2),
  next_service_reading DECIMAL(10,2),
  
  -- Smart scheduling
  average_daily_usage DECIMAL(10,2),
  predicted_service_date DATE,
  locked_service_date DATE,
  
  -- Service details
  estimated_duration_hours DECIMAL(5,2),
  required_parts JSONB DEFAULT '[]'::jsonb,
  assigned_technician UUID REFERENCES auth.users(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  
  status TEXT CHECK (status IN ('scheduled', 'due_soon', 'overdue', 'completed', 'cancelled')) DEFAULT 'scheduled',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maintenance Compliance Tracking (for tracking late maintenance)
CREATE TABLE maintenance_compliance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  schedule_id UUID REFERENCES maintenance_schedules_enhanced(id),
  
  -- Due date tracking
  original_due_date DATE NOT NULL,
  locked_due_date DATE NOT NULL,
  actual_completion_date DATE,
  
  -- Overdue tracking
  days_overdue INTEGER DEFAULT 0,
  late_days_count INTEGER DEFAULT 0,
  was_completed_late BOOLEAN DEFAULT false,
  
  -- Usage at completion
  reading_at_due DECIMAL(10,2),
  reading_at_completion DECIMAL(10,2),
  usage_overrun DECIMAL(10,2),
  
  -- Compliance scoring
  compliance_score DECIMAL(5,2), -- percentage
  impact_level TEXT CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment Parts Requirements (linking equipment to inventory)
CREATE TABLE equipment_parts_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  part_sku TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity_per_service DECIMAL(10,2) DEFAULT 1,
  is_critical BOOLEAN DEFAULT false,
  minimum_stock_level INTEGER,
  reorder_point INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_usage_logs_equipment ON equipment_usage_logs(equipment_id, reading_date DESC);
CREATE INDEX idx_inspections_equipment ON equipment_inspections(equipment_id, inspection_date DESC);
CREATE INDEX idx_maintenance_enhanced_equipment ON maintenance_schedules_enhanced(equipment_id);
CREATE INDEX idx_maintenance_enhanced_status ON maintenance_schedules_enhanced(status, next_service_date);
CREATE INDEX idx_compliance_tracking_equipment ON maintenance_compliance_tracking(equipment_id);
CREATE INDEX idx_parts_requirements_equipment ON equipment_parts_requirements(equipment_id);

-- Enable RLS
ALTER TABLE equipment_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_parts_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view usage logs" ON equipment_usage_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert usage logs" ON equipment_usage_logs FOR INSERT WITH CHECK (auth.uid() = recorded_by);
CREATE POLICY "Users can update own usage logs" ON equipment_usage_logs FOR UPDATE USING (auth.uid() = recorded_by);

CREATE POLICY "Users can view inspections" ON equipment_inspections FOR SELECT USING (true);
CREATE POLICY "Users can insert inspections" ON equipment_inspections FOR INSERT WITH CHECK (auth.uid() = inspector_id);
CREATE POLICY "Users can update own inspections" ON equipment_inspections FOR UPDATE USING (auth.uid() = inspector_id);

CREATE POLICY "Users can view maintenance schedules" ON maintenance_schedules_enhanced FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenance schedules" ON maintenance_schedules_enhanced FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenance schedules" ON maintenance_schedules_enhanced FOR UPDATE USING (true);

CREATE POLICY "Users can view compliance tracking" ON maintenance_compliance_tracking FOR SELECT USING (true);
CREATE POLICY "Users can manage compliance tracking" ON maintenance_compliance_tracking FOR ALL USING (true);

CREATE POLICY "Users can view parts requirements" ON equipment_parts_requirements FOR SELECT USING (true);
CREATE POLICY "Users can manage parts requirements" ON equipment_parts_requirements FOR ALL USING (true);

-- Function to update average daily usage
CREATE OR REPLACE FUNCTION update_equipment_average_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average daily usage based on recent logs
  UPDATE maintenance_schedules_enhanced
  SET average_daily_usage = (
    SELECT AVG(daily_usage)
    FROM (
      SELECT 
        (reading_value - LAG(reading_value) OVER (ORDER BY reading_date)) / 
        NULLIF(EXTRACT(EPOCH FROM (reading_date - LAG(reading_date) OVER (ORDER BY reading_date))) / 86400, 0) as daily_usage
      FROM equipment_usage_logs
      WHERE equipment_id = NEW.equipment_id
        AND reading_type = NEW.reading_type
      ORDER BY reading_date DESC
      LIMIT 10
    ) recent_usage
    WHERE daily_usage > 0
  ),
  updated_at = now()
  WHERE equipment_id = NEW.equipment_id
    AND usage_metric = NEW.reading_type;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_average_usage
AFTER INSERT ON equipment_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_equipment_average_usage();

-- Function to predict and lock maintenance dates
CREATE OR REPLACE FUNCTION predict_maintenance_date()
RETURNS TRIGGER AS $$
DECLARE
  current_reading DECIMAL(10,2);
  remaining_usage DECIMAL(10,2);
  days_until_due INTEGER;
BEGIN
  IF NEW.trigger_type IN ('usage-based', 'both') AND NEW.average_daily_usage > 0 THEN
    -- Get current reading
    SELECT reading_value INTO current_reading
    FROM equipment_usage_logs
    WHERE equipment_id = NEW.equipment_id
      AND reading_type = NEW.usage_metric
    ORDER BY reading_date DESC
    LIMIT 1;
    
    IF current_reading IS NOT NULL THEN
      remaining_usage := NEW.next_service_reading - current_reading;
      
      IF remaining_usage <= 0 THEN
        -- Lock the date and mark as overdue
        NEW.locked_service_date := CURRENT_DATE;
        NEW.status := 'overdue';
      ELSE
        days_until_due := CEIL(remaining_usage / NEW.average_daily_usage);
        NEW.predicted_service_date := CURRENT_DATE + (days_until_due || ' days')::INTERVAL;
        
        -- Lock date when within 3 days or usage remaining is critical
        IF days_until_due <= 3 OR remaining_usage <= (NEW.average_daily_usage * 3) THEN
          NEW.locked_service_date := NEW.predicted_service_date;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_predict_maintenance
BEFORE INSERT OR UPDATE ON maintenance_schedules_enhanced
FOR EACH ROW
EXECUTE FUNCTION predict_maintenance_date();