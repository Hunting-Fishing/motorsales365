-- Fix incomplete migration: Drop existing notification_preferences and recreate all tables properly
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Phase 1: Create notification preferences table and enhanced customer experience tables (corrected)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  price_alerts BOOLEAN NOT NULL DEFAULT true,
  marketing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create wishlist shares table for enhanced wishlist features
CREATE TABLE IF NOT EXISTS public.wishlist_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_owner_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order tracking table for detailed tracking
CREATE TABLE IF NOT EXISTS public.order_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wishlist_shares
CREATE POLICY "Users can view their wishlist shares"
ON public.wishlist_shares FOR SELECT
USING (auth.uid() = wishlist_owner_id);

CREATE POLICY "Users can manage their wishlist shares"
ON public.wishlist_shares FOR ALL
USING (auth.uid() = wishlist_owner_id);

-- RLS Policies for order_tracking (corrected to use user_id)
CREATE POLICY "Users can view order tracking for their orders"
ON public.order_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_tracking.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage all order tracking"
ON public.order_tracking FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner', 'staff')
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_owner_id ON public.wishlist_shares(wishlist_owner_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_token ON public.wishlist_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON public.order_tracking(order_id);

-- Enable realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;