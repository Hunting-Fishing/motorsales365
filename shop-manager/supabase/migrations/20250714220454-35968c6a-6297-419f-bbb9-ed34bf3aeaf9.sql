-- Create customer notifications table
CREATE TABLE public.customer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  link TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order tracking table
CREATE TABLE public.order_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wishlist shares table
CREATE TABLE public.wishlist_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shared_with_user_id)
);

-- Create price drop alerts table
CREATE TABLE public.price_drop_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support ticket messages table
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff_response BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer notifications
CREATE POLICY "Users can view their own notifications" ON public.customer_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.customer_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.customer_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for order tracking
CREATE POLICY "Users can view their order tracking" ON public.order_tracking
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_tracking.order_id AND orders.customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Staff can manage order tracking" ON public.order_tracking
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'staff'])
  ));

-- Create RLS policies for wishlist shares
CREATE POLICY "Users can manage their wishlist shares" ON public.wishlist_shares
  FOR ALL USING (user_id = auth.uid() OR shared_with_user_id = auth.uid());

-- Create RLS policies for price drop alerts
CREATE POLICY "Users can manage their price alerts" ON public.price_drop_alerts
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for support tickets
CREATE POLICY "Users can view their support tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid() OR assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'staff'])
  ));

CREATE POLICY "Users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their support tickets" ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid() OR assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'staff'])
  ));

-- Create RLS policies for support ticket messages
CREATE POLICY "Users can view ticket messages for their tickets" ON public.support_ticket_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'staff'])
    ))
  ));

CREATE POLICY "Users can create messages for their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'staff'])
    ))
  ));

-- Create indexes for performance
CREATE INDEX idx_customer_notifications_user_id ON public.customer_notifications(user_id);
CREATE INDEX idx_customer_notifications_timestamp ON public.customer_notifications(timestamp);
CREATE INDEX idx_order_tracking_order_id ON public.order_tracking(order_id);
CREATE INDEX idx_wishlist_shares_user_id ON public.wishlist_shares(user_id);
CREATE INDEX idx_price_drop_alerts_user_id ON public.price_drop_alerts(user_id);
CREATE INDEX idx_price_drop_alerts_product_id ON public.price_drop_alerts(product_id);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- Enable realtime for live updates
ALTER TABLE public.customer_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.order_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;