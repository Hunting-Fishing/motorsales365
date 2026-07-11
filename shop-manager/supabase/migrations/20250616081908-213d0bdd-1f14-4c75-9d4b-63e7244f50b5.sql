
-- Create audit history table for work order job lines
CREATE TABLE IF NOT EXISTS public.work_order_job_line_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_line_id UUID NOT NULL REFERENCES work_order_job_lines(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit history table for work order parts
CREATE TABLE IF NOT EXISTS public.work_order_part_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES work_order_parts(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to log job line changes
CREATE OR REPLACE FUNCTION log_job_line_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_job_line_history (
      job_line_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'status', OLD.status, NEW.status,
      'System', now()
    );
  END IF;
  
  -- Log other important field changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO work_order_job_line_history (
      job_line_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'name', OLD.name, NEW.name,
      'System', now()
    );
  END IF;
  
  IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
    INSERT INTO work_order_job_line_history (
      job_line_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'estimated_hours', OLD.estimated_hours::text, NEW.estimated_hours::text,
      'System', now()
    );
  END IF;
  
  IF OLD.labor_rate IS DISTINCT FROM NEW.labor_rate THEN
    INSERT INTO work_order_job_line_history (
      job_line_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'labor_rate', OLD.labor_rate::text, NEW.labor_rate::text,
      'System', now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log part changes
CREATE OR REPLACE FUNCTION log_part_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_part_history (
      part_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'status', OLD.status, NEW.status,
      'System', now()
    );
  END IF;
  
  -- Log quantity changes
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    INSERT INTO work_order_part_history (
      part_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'quantity', OLD.quantity::text, NEW.quantity::text,
      'System', now()
    );
  END IF;
  
  -- Log price changes
  IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
    INSERT INTO work_order_part_history (
      part_id, field_name, old_value, new_value, 
      changed_by_name, changed_at
    ) VALUES (
      NEW.id, 'unit_price', OLD.unit_price::text, NEW.unit_price::text,
      'System', now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS job_line_audit_trigger ON work_order_job_lines;
CREATE TRIGGER job_line_audit_trigger
  AFTER UPDATE ON work_order_job_lines
  FOR EACH ROW
  EXECUTE FUNCTION log_job_line_changes();

DROP TRIGGER IF EXISTS part_audit_trigger ON work_order_parts;
CREATE TRIGGER part_audit_trigger
  AFTER UPDATE ON work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION log_part_changes();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_line_history_job_line_id ON work_order_job_line_history(job_line_id);
CREATE INDEX IF NOT EXISTS idx_job_line_history_changed_at ON work_order_job_line_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_part_history_part_id ON work_order_part_history(part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_changed_at ON work_order_part_history(changed_at DESC);

-- Add RLS policies for audit history tables
ALTER TABLE work_order_job_line_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_part_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view history
CREATE POLICY "Allow authenticated users to view job line history" ON work_order_job_line_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view part history" ON work_order_part_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow system to insert history records
CREATE POLICY "Allow system to insert job line history" ON work_order_job_line_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow system to insert part history" ON work_order_part_history
  FOR INSERT WITH CHECK (true);
