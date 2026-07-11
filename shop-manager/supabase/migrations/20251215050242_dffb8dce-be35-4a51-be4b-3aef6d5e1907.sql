-- Feature Request Notifications table for tracking notification history
CREATE TABLE IF NOT EXISTS public.feature_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'new_request', 'status_change', 'comment_added', 'vote_milestone'
  recipient_type TEXT NOT NULL, -- 'admin', 'submitter', 'voter'
  recipient_email TEXT,
  notification_data JSONB DEFAULT '{}',
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE
);

-- Webhook Logs table for tracking webhook deliveries
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'slack', 'discord', 'custom'
  webhook_url TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feature_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_request_notifications
CREATE POLICY "Users can view notifications for their shop"
ON public.feature_request_notifications
FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert notifications for their shop"
ON public.feature_request_notifications
FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update notifications for their shop"
ON public.feature_request_notifications
FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for webhook_logs
CREATE POLICY "Users can view webhook logs for their shop"
ON public.webhook_logs
FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert webhook logs for their shop"
ON public.webhook_logs
FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_request_notifications_shop_id ON public.feature_request_notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_notifications_sent ON public.feature_request_notifications(sent) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_shop_id ON public.webhook_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);