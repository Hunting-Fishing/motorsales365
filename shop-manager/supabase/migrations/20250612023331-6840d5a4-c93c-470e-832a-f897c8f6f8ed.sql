
-- Enable RLS on work_order_notifications table if not already enabled
ALTER TABLE public.work_order_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for work_order_notifications table
-- Allow authenticated users to view notifications where they are the recipient
CREATE POLICY "Users can view their own notifications" 
  ON public.work_order_notifications 
  FOR SELECT 
  USING (
    auth.uid()::text = recipient_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (job_title = 'admin' OR job_title = 'manager')
    )
  );

-- Allow system and staff to insert notifications
CREATE POLICY "System and staff can create notifications" 
  ON public.work_order_notifications 
  FOR INSERT 
  WITH CHECK (
    -- Allow if current user is staff/admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (job_title = 'admin' OR job_title = 'manager' OR job_title = 'technician')
    ) OR
    -- Allow system operations (when auth.uid() is null during trigger execution)
    auth.uid() IS NULL
  );

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
  ON public.work_order_notifications 
  FOR UPDATE 
  USING (
    auth.uid()::text = recipient_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (job_title = 'admin' OR job_title = 'manager')
    )
  );

-- Allow staff to delete notifications
CREATE POLICY "Staff can delete notifications" 
  ON public.work_order_notifications 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (job_title = 'admin' OR job_title = 'manager')
    )
  );

-- Update the trigger function to use SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_work_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Insert notification for customer (bypass RLS with SECURITY DEFINER)
  INSERT INTO work_order_notifications (
    work_order_id,
    notification_type,
    title,
    message,
    recipient_type,
    recipient_id,
    status
  )
  SELECT
    NEW.id,
    CASE NEW.status
      WHEN 'in-progress' THEN 'status_update'
      WHEN 'completed' THEN 'completion'
      WHEN 'cancelled' THEN 'cancellation'
      ELSE 'status_update'
    END,
    'Work Order ' || NEW.status,
    'Work Order #' || COALESCE(NEW.work_order_number, NEW.id::text) || ' has been marked as ' || NEW.status,
    'customer',
    NEW.customer_id::text,
    'pending'
  WHERE NEW.customer_id IS NOT NULL;

  -- Insert notification for technician if assigned (bypass RLS with SECURITY DEFINER)
  IF NEW.technician_id IS NOT NULL THEN
    INSERT INTO work_order_notifications (
      work_order_id,
      notification_type,
      title,
      message,
      recipient_type,
      recipient_id,
      status
    )
    VALUES (
      NEW.id,
      'assignment',
      'Work Order Assignment',
      'You have been assigned to Work Order #' || COALESCE(NEW.work_order_number, NEW.id::text),
      'technician',
      NEW.technician_id::text,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the work_order_activities table has proper RLS policies
-- Allow authenticated users to view activities
CREATE POLICY "Users can view work order activities" 
  ON public.work_order_activities 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow staff to insert activities
CREATE POLICY "Staff can create work order activities" 
  ON public.work_order_activities 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (job_title = 'admin' OR job_title = 'manager' OR job_title = 'technician')
    )
  );

-- Create a SECURITY DEFINER function to record work order status changes
CREATE OR REPLACE FUNCTION public.record_status_change_activity(
  p_work_order_id uuid,
  p_old_status text,
  p_new_status text,
  p_user_id text,
  p_user_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.work_order_activities (
    work_order_id,
    action,
    user_id,
    user_name
  ) VALUES (
    p_work_order_id,
    'Status changed from ' || p_old_status || ' to ' || p_new_status,
    p_user_id,
    p_user_name
  );
END;
$function$;
