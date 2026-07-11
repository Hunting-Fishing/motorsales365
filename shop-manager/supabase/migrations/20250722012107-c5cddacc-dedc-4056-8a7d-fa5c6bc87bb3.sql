
-- Create notification preferences table for admins
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  slack_webhook_url TEXT,
  discord_webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feature request notifications table
CREATE TABLE public.feature_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_request', 'status_change', 'priority_change', 'comment_added')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'submitter', 'developer')),
  recipient_id UUID,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create webhook logs table for tracking integrations
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Feature request notifications policies
CREATE POLICY "Admins can view all notifications"
ON public.feature_request_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view their own notifications"
ON public.feature_request_notifications
FOR SELECT
USING (recipient_id = auth.uid());

-- Webhook logs policies (admin only)
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  )
);

-- Create function to notify on new feature requests
CREATE OR REPLACE FUNCTION public.notify_new_feature_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for admins
  INSERT INTO public.feature_request_notifications (
    feature_request_id,
    notification_type,
    recipient_type,
    notification_data
  ) VALUES (
    NEW.id,
    'new_request',
    'admin',
    jsonb_build_object(
      'title', NEW.title,
      'category', NEW.category,
      'priority', NEW.priority,
      'submitter_name', NEW.submitter_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new feature requests
CREATE TRIGGER trigger_notify_new_feature_request
AFTER INSERT ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_feature_request();

-- Create function to notify on status changes
CREATE OR REPLACE FUNCTION public.notify_feature_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify admins
    INSERT INTO public.feature_request_notifications (
      feature_request_id,
      notification_type,
      recipient_type,
      notification_data
    ) VALUES (
      NEW.id,
      'status_change',
      'admin',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'title', NEW.title
      )
    );
    
    -- Notify submitter if they have an email
    IF NEW.submitter_email IS NOT NULL THEN
      INSERT INTO public.feature_request_notifications (
        feature_request_id,
        notification_type,
        recipient_type,
        notification_data
      ) VALUES (
        NEW.id,
        'status_change',
        'submitter',
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'title', NEW.title,
          'submitter_email', NEW.submitter_email
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
CREATE TRIGGER trigger_notify_feature_request_status_change
AFTER UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_feature_request_status_change();

-- Add updated_at trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
