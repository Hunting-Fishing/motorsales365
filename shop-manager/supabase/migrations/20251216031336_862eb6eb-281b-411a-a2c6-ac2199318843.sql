-- Add lifecycle tracking columns to ppe_assignments
ALTER TABLE public.ppe_assignments
ADD COLUMN IF NOT EXISTS in_service_date DATE,
ADD COLUMN IF NOT EXISTS out_of_service_date DATE,
ADD COLUMN IF NOT EXISTS out_of_service_reason TEXT,
ADD COLUMN IF NOT EXISTS replacement_item_id UUID REFERENCES public.ppe_assignments(id);

-- Create PPE history table for complete audit trail
CREATE TABLE IF NOT EXISTS public.ppe_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  assignment_id UUID REFERENCES public.ppe_assignments(id) ON DELETE CASCADE,
  ppe_item_id UUID REFERENCES public.ppe_inventory(id),
  employee_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL, -- 'assigned', 'put_in_service', 'inspected', 'repaired', 'returned', 'out_of_service', 'expired', 'replaced', 'lost', 'damaged'
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_status TEXT,
  new_status TEXT,
  condition_before TEXT,
  condition_after TEXT,
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  performed_by_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ppe_history_shop_id ON public.ppe_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_ppe_history_assignment_id ON public.ppe_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ppe_history_ppe_item_id ON public.ppe_history(ppe_item_id);
CREATE INDEX IF NOT EXISTS idx_ppe_history_employee_id ON public.ppe_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_ppe_history_event_date ON public.ppe_history(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ppe_history_event_type ON public.ppe_history(event_type);

-- Enable RLS
ALTER TABLE public.ppe_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for ppe_history
CREATE POLICY "Users can view PPE history in their shop"
ON public.ppe_history FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create PPE history in their shop"
ON public.ppe_history FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update PPE history in their shop"
ON public.ppe_history FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete PPE history in their shop"
ON public.ppe_history FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- Create trigger function to auto-log PPE assignment changes
CREATE OR REPLACE FUNCTION public.log_ppe_assignment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  event_type_val TEXT;
BEGIN
  -- Get user name
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO user_name
  FROM profiles WHERE id = auth.uid();

  -- Determine event type based on changes
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'assigned';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      event_type_val := CASE NEW.status
        WHEN 'active' THEN 'put_in_service'
        WHEN 'returned' THEN 'returned'
        WHEN 'expired' THEN 'expired'
        WHEN 'damaged' THEN 'damaged'
        WHEN 'lost' THEN 'lost'
        WHEN 'out_of_service' THEN 'out_of_service'
        ELSE 'status_changed'
      END;
    ELSIF OLD.condition IS DISTINCT FROM NEW.condition THEN
      event_type_val := 'condition_updated';
    ELSIF NEW.out_of_service_date IS NOT NULL AND OLD.out_of_service_date IS NULL THEN
      event_type_val := 'out_of_service';
    ELSIF NEW.in_service_date IS NOT NULL AND OLD.in_service_date IS NULL THEN
      event_type_val := 'put_in_service';
    ELSE
      event_type_val := 'updated';
    END IF;
  END IF;

  -- Insert history record
  INSERT INTO ppe_history (
    shop_id,
    assignment_id,
    ppe_item_id,
    employee_id,
    event_type,
    event_date,
    previous_status,
    new_status,
    condition_before,
    condition_after,
    performed_by,
    performed_by_name,
    metadata
  ) VALUES (
    NEW.shop_id,
    NEW.id,
    NEW.ppe_item_id,
    NEW.employee_id,
    event_type_val,
    now(),
    OLD.status,
    NEW.status,
    OLD.condition,
    NEW.condition,
    auth.uid(),
    user_name,
    jsonb_build_object(
      'expiry_date', NEW.expiry_date,
      'in_service_date', NEW.in_service_date,
      'out_of_service_date', NEW.out_of_service_date,
      'serial_number', NEW.serial_number
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS ppe_assignment_history_trigger ON public.ppe_assignments;
CREATE TRIGGER ppe_assignment_history_trigger
AFTER INSERT OR UPDATE ON public.ppe_assignments
FOR EACH ROW
EXECUTE FUNCTION public.log_ppe_assignment_changes();