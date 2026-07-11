-- Create project milestone notifications table
CREATE TABLE public.project_milestone_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('approaching_7d', 'approaching_3d', 'approaching_1d', 'overdue', 'completed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phase_id, notification_type)
);

-- Add notification columns to project_phases
ALTER TABLE public.project_phases 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT '{7,3,1}';

-- Create project notification preferences table
CREATE TABLE public.project_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  in_app_notifications BOOLEAN DEFAULT true,
  reminder_days INTEGER[] DEFAULT '{7,3,1}',
  notify_on_overdue BOOLEAN DEFAULT true,
  notify_on_completion BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_milestone_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_milestone_notifications
CREATE POLICY "Users can view milestone notifications for their shop"
ON public.project_milestone_notifications FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert milestone notifications for their shop"
ON public.project_milestone_notifications FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update milestone notifications for their shop"
ON public.project_milestone_notifications FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete milestone notifications for their shop"
ON public.project_milestone_notifications FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for project_notification_preferences
CREATE POLICY "Users can view notification preferences for their shop"
ON public.project_notification_preferences FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert notification preferences for their shop"
ON public.project_notification_preferences FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update notification preferences for their shop"
ON public.project_notification_preferences FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete notification preferences for their shop"
ON public.project_notification_preferences FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- Create indexes
CREATE INDEX idx_milestone_notifications_shop ON public.project_milestone_notifications(shop_id);
CREATE INDEX idx_milestone_notifications_phase ON public.project_milestone_notifications(phase_id);
CREATE INDEX idx_milestone_notifications_scheduled ON public.project_milestone_notifications(scheduled_for) WHERE sent = false;
CREATE INDEX idx_notification_preferences_user ON public.project_notification_preferences(user_id);