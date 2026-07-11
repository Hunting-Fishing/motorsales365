-- Phase 4: Power Washing Advanced Features

-- Customer Portal access tokens
CREATE TABLE public.power_washing_customer_portal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job notifications/reminders
CREATE TABLE public.power_washing_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'confirmation', 'completion', 'reschedule', 'follow_up')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Route optimization / job routes
CREATE TABLE public.power_washing_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,
  route_name TEXT,
  assigned_crew JSONB DEFAULT '[]',
  total_jobs INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  total_distance_miles NUMERIC(10,2),
  start_location TEXT,
  end_location TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  optimization_score NUMERIC(5,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Route stops (jobs in a route)
CREATE TABLE public.power_washing_route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.power_washing_routes(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  estimated_departure TIMESTAMP WITH TIME ZONE,
  actual_departure TIMESTAMP WITH TIME ZONE,
  distance_from_previous_miles NUMERIC(10,2),
  drive_time_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'in_progress', 'completed', 'skipped')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, stop_order)
);

-- Customer feedback/reviews
CREATE TABLE public.power_washing_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.power_washing_jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  would_recommend BOOLEAN,
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  timeliness INTEGER CHECK (timeliness >= 1 AND timeliness <= 5),
  professionalism INTEGER CHECK (professionalism >= 1 AND professionalism <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  is_public BOOLEAN DEFAULT false,
  response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_customer_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage customer portal for their shop" ON public.power_washing_customer_portal
  FOR ALL USING (
    customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can manage notifications for their shop" ON public.power_washing_notifications
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage routes for their shop" ON public.power_washing_routes
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage route stops" ON public.power_washing_route_stops
  FOR ALL USING (
    route_id IN (SELECT id FROM public.power_washing_routes WHERE shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can manage reviews for their shop" ON public.power_washing_reviews
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- Indexes
CREATE INDEX idx_pw_notifications_job ON public.power_washing_notifications(job_id);
CREATE INDEX idx_pw_notifications_scheduled ON public.power_washing_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_pw_routes_date ON public.power_washing_routes(route_date);
CREATE INDEX idx_pw_route_stops_route ON public.power_washing_route_stops(route_id);
CREATE INDEX idx_pw_reviews_job ON public.power_washing_reviews(job_id);

-- Triggers
CREATE TRIGGER update_pw_routes_updated_at BEFORE UPDATE ON public.power_washing_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

CREATE TRIGGER update_pw_customer_portal_updated_at BEFORE UPDATE ON public.power_washing_customer_portal
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();