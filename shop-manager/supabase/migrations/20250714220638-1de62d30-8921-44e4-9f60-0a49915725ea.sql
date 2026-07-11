-- Create only the missing tables that don't exist yet

-- Create customer notifications table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_notifications') THEN
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
        
        ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own notifications" ON public.customer_notifications
          FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "System can create notifications" ON public.customer_notifications
          FOR INSERT WITH CHECK (true);
        CREATE POLICY "Users can update their own notifications" ON public.customer_notifications
          FOR UPDATE USING (user_id = auth.uid());
          
        CREATE INDEX idx_customer_notifications_user_id ON public.customer_notifications(user_id);
        CREATE INDEX idx_customer_notifications_timestamp ON public.customer_notifications(timestamp);
        
        ALTER TABLE public.customer_notifications REPLICA IDENTITY FULL;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
    END IF;
END $$;

-- Create order tracking table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_tracking') THEN
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
        
        ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
        
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
          
        CREATE INDEX idx_order_tracking_order_id ON public.order_tracking(order_id);
        
        ALTER TABLE public.order_tracking REPLICA IDENTITY FULL;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking;
    END IF;
END $$;

-- Create wishlist shares table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wishlist_shares') THEN
        CREATE TABLE public.wishlist_shares (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          permission TEXT NOT NULL DEFAULT 'view',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(user_id, shared_with_user_id)
        );
        
        ALTER TABLE public.wishlist_shares ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage their wishlist shares" ON public.wishlist_shares
          FOR ALL USING (user_id = auth.uid() OR shared_with_user_id = auth.uid());
          
        CREATE INDEX idx_wishlist_shares_user_id ON public.wishlist_shares(user_id);
    END IF;
END $$;

-- Create price drop alerts table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'price_drop_alerts') THEN
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
        
        ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage their price alerts" ON public.price_drop_alerts
          FOR ALL USING (user_id = auth.uid());
          
        CREATE INDEX idx_price_drop_alerts_user_id ON public.price_drop_alerts(user_id);
        CREATE INDEX idx_price_drop_alerts_product_id ON public.price_drop_alerts(product_id);
    END IF;
END $$;