-- Create employee_availability table
CREATE TABLE IF NOT EXISTS public.employee_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  available_start TIME NOT NULL,
  available_end TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  recurring BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (available_end > available_start)
);

-- Create shift_swap_requests table
CREATE TABLE IF NOT EXISTS public.shift_swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  requesting_employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_schedule_id UUID NOT NULL REFERENCES public.work_schedule_assignments(id) ON DELETE CASCADE,
  proposed_schedule_id UUID REFERENCES public.work_schedule_assignments(id) ON DELETE SET NULL,
  swap_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schedule_notifications table
CREATE TABLE IF NOT EXISTS public.schedule_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'schedule_created', 'schedule_updated', 'schedule_deleted',
    'shift_swap_requested', 'shift_swap_approved', 'shift_swap_rejected',
    'conflict_detected', 'time_off_approved', 'time_off_rejected'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_availability
CREATE POLICY "Users can view availability for their shop"
  ON public.employee_availability FOR SELECT
  USING (
    shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own availability"
  ON public.employee_availability FOR ALL
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can manage shop availability"
  ON public.employee_availability FOR ALL
  USING (
    shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_permission(auth.uid(), 'scheduling', 'manage')
  );

-- RLS Policies for shift_swap_requests
CREATE POLICY "Users can view swap requests for their shop"
  ON public.shift_swap_requests FOR SELECT
  USING (
    shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Employees can create swap requests"
  ON public.shift_swap_requests FOR INSERT
  WITH CHECK (requesting_employee_id = auth.uid());

CREATE POLICY "Employees can update their own swap requests"
  ON public.shift_swap_requests FOR UPDATE
  USING (
    requesting_employee_id = auth.uid() OR
    target_employee_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'scheduling', 'manage')
  );

-- RLS Policies for schedule_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.schedule_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.schedule_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.schedule_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.schedule_notifications FOR DELETE
  USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_employee_availability_updated_at
  BEFORE UPDATE ON public.employee_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_swap_requests_updated_at
  BEFORE UPDATE ON public.shift_swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_employee_availability_shop_employee ON public.employee_availability(shop_id, employee_id);
CREATE INDEX idx_employee_availability_day ON public.employee_availability(day_of_week);
CREATE INDEX idx_shift_swap_requests_shop ON public.shift_swap_requests(shop_id);
CREATE INDEX idx_shift_swap_requests_status ON public.shift_swap_requests(status);
CREATE INDEX idx_schedule_notifications_user ON public.schedule_notifications(user_id, is_read);
CREATE INDEX idx_schedule_notifications_created ON public.schedule_notifications(created_at DESC);

-- Function to create notification on shift swap request
CREATE OR REPLACE FUNCTION public.notify_shift_swap_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify target employee if specified
  IF NEW.target_employee_id IS NOT NULL THEN
    INSERT INTO public.schedule_notifications (
      shop_id, user_id, notification_type, title, message,
      related_entity_type, related_entity_id, priority
    ) VALUES (
      NEW.shop_id,
      NEW.target_employee_id,
      'shift_swap_requested',
      'New Shift Swap Request',
      'Someone wants to swap shifts with you on ' || NEW.swap_date::TEXT,
      'shift_swap_request',
      NEW.id,
      'high'
    );
  END IF;

  -- Notify managers
  INSERT INTO public.schedule_notifications (
    shop_id, user_id, notification_type, title, message,
    related_entity_type, related_entity_id, priority
  )
  SELECT
    NEW.shop_id,
    p.id,
    'shift_swap_requested',
    'Shift Swap Request Pending',
    'A shift swap request needs review for ' || NEW.swap_date::TEXT,
    'shift_swap_request',
    NEW.id,
    'normal'
  FROM profiles p
  WHERE p.shop_id = NEW.shop_id
    AND public.user_has_permission(p.id, 'scheduling', 'manage');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_shift_swap_request
  AFTER INSERT ON public.shift_swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_shift_swap_request();

-- Function to notify on shift swap status change
CREATE OR REPLACE FUNCTION public.notify_shift_swap_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    -- Notify requesting employee
    INSERT INTO public.schedule_notifications (
      shop_id, user_id, notification_type, title, message,
      related_entity_type, related_entity_id, priority
    ) VALUES (
      NEW.shop_id,
      NEW.requesting_employee_id,
      CASE WHEN NEW.status = 'approved' THEN 'shift_swap_approved' ELSE 'shift_swap_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'Shift Swap Approved' ELSE 'Shift Swap Rejected' END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your shift swap request for ' || NEW.swap_date::TEXT || ' has been approved'
        ELSE 'Your shift swap request for ' || NEW.swap_date::TEXT || ' has been rejected'
      END,
      'shift_swap_request',
      NEW.id,
      'high'
    );

    -- Notify target employee if approved
    IF NEW.status = 'approved' AND NEW.target_employee_id IS NOT NULL THEN
      INSERT INTO public.schedule_notifications (
        shop_id, user_id, notification_type, title, message,
        related_entity_type, related_entity_id, priority
      ) VALUES (
        NEW.shop_id,
        NEW.target_employee_id,
        'shift_swap_approved',
        'Shift Swap Confirmed',
        'A shift swap for ' || NEW.swap_date::TEXT || ' has been confirmed',
        'shift_swap_request',
        NEW.id,
        'high'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_shift_swap_status_change
  AFTER UPDATE ON public.shift_swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_shift_swap_status_change();