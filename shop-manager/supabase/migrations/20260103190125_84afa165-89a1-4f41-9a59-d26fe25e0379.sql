-- Phase 5: Customer Portal, Weather & Advanced Analytics

-- Customer portal sessions (for magic link auth)
CREATE TABLE public.power_washing_portal_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id UUID REFERENCES public.power_washing_customer_portal(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer quote requests (from portal)
CREATE TABLE public.power_washing_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  property_address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  services_requested JSONB DEFAULT '[]',
  preferred_date DATE,
  preferred_time_slot TEXT,
  additional_notes TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'accepted', 'declined')),
  assigned_to UUID REFERENCES auth.users(id),
  quote_id UUID REFERENCES public.power_washing_quotes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weather forecasts for job scheduling
CREATE TABLE public.power_washing_weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  temperature_high NUMERIC(5,2),
  temperature_low NUMERIC(5,2),
  precipitation_chance INTEGER,
  precipitation_amount NUMERIC(5,2),
  wind_speed NUMERIC(5,2),
  humidity INTEGER,
  conditions TEXT,
  icon TEXT,
  is_suitable_for_work BOOLEAN DEFAULT true,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, location, forecast_date)
);

-- Business performance metrics (daily aggregates)
CREATE TABLE public.power_washing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  jobs_completed INTEGER DEFAULT 0,
  jobs_scheduled INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  material_cost NUMERIC(12,2) DEFAULT 0,
  profit_margin NUMERIC(5,2),
  average_job_duration INTEGER,
  customer_satisfaction NUMERIC(3,2),
  quotes_sent INTEGER DEFAULT 0,
  quotes_accepted INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2),
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, metric_date)
);

-- Price book / service catalog
CREATE TABLE public.power_washing_price_book (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('sqft', 'linear_ft', 'hour', 'flat', 'each')),
  base_price NUMERIC(10,2) NOT NULL,
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  estimated_duration_minutes INTEGER,
  includes_materials BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_washing_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_price_book ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Portal sessions access" ON public.power_washing_portal_sessions
  FOR ALL USING (
    portal_id IN (
      SELECT id FROM public.power_washing_customer_portal 
      WHERE customer_id IN (SELECT id FROM public.customers WHERE shop_id = public.get_current_user_shop_id())
    )
  );

CREATE POLICY "Users can manage quote requests for their shop" ON public.power_washing_quote_requests
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage weather data for their shop" ON public.power_washing_weather_data
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage metrics for their shop" ON public.power_washing_metrics
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can manage price book for their shop" ON public.power_washing_price_book
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- Indexes
CREATE INDEX idx_pw_quote_requests_shop ON public.power_washing_quote_requests(shop_id);
CREATE INDEX idx_pw_quote_requests_status ON public.power_washing_quote_requests(status);
CREATE INDEX idx_pw_weather_date ON public.power_washing_weather_data(forecast_date);
CREATE INDEX idx_pw_metrics_date ON public.power_washing_metrics(metric_date);
CREATE INDEX idx_pw_price_book_category ON public.power_washing_price_book(category);

-- Triggers
CREATE TRIGGER update_pw_quote_requests_updated_at BEFORE UPDATE ON public.power_washing_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();

CREATE TRIGGER update_pw_price_book_updated_at BEFORE UPDATE ON public.power_washing_price_book
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_tables_updated_at();