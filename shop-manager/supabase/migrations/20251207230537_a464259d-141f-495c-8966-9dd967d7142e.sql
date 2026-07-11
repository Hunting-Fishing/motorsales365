-- Create voyage_logs table for Transport Canada compliance
CREATE TABLE public.voyage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES public.equipment_assets(id),
  voyage_number TEXT NOT NULL,
  
  -- Voyage timing
  departure_datetime TIMESTAMPTZ NOT NULL,
  arrival_datetime TIMESTAMPTZ,
  voyage_status TEXT DEFAULT 'in_progress' CHECK (voyage_status IN ('in_progress', 'completed', 'cancelled')),
  
  -- Locations
  origin_location TEXT NOT NULL,
  destination_location TEXT NOT NULL,
  waypoints JSONB DEFAULT '[]'::jsonb,
  
  -- Personnel
  master_name TEXT NOT NULL,
  crew_members JSONB DEFAULT '[]'::jsonb,
  
  -- Cargo/Tow details
  voyage_type TEXT CHECK (voyage_type IN ('barge_move', 'tow', 'patrol', 'transit', 'charter', 'maintenance', 'other')),
  cargo_description TEXT,
  barge_name TEXT,
  cargo_weight DECIMAL(10,2),
  cargo_weight_unit TEXT DEFAULT 'tonnes',
  
  -- Equipment readings
  engine_hours_start DECIMAL(10,2),
  engine_hours_end DECIMAL(10,2),
  fuel_start DECIMAL(10,2),
  fuel_end DECIMAL(10,2),
  fuel_unit TEXT DEFAULT 'litres',
  
  -- Weather conditions
  weather_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Activity log (timestamped events during voyage)
  activity_log JSONB DEFAULT '[]'::jsonb,
  
  -- Incidents/Problems
  incidents JSONB DEFAULT '[]'::jsonb,
  has_incidents BOOLEAN DEFAULT false,
  
  -- Pre-departure checklist
  pre_departure_completed BOOLEAN DEFAULT false,
  pre_departure_checklist JSONB DEFAULT '{}'::jsonb,
  
  -- Compliance
  master_signature TEXT,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Audit
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create voyage_communication_logs for VTS/radio communications
CREATE TABLE public.voyage_communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id UUID REFERENCES public.voyage_logs(id) ON DELETE CASCADE NOT NULL,
  communication_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT,
  contact_station TEXT,
  call_type TEXT CHECK (call_type IN ('check_in', 'position_report', 'traffic_advisory', 'security_call', 'pan_pan', 'mayday', 'weather_update', 'other')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  message_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voyage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voyage_communication_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for voyage_logs
CREATE POLICY "Users can view voyage logs in their shop"
  ON public.voyage_logs FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create voyage logs in their shop"
  ON public.voyage_logs FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update voyage logs in their shop"
  ON public.voyage_logs FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete voyage logs in their shop"
  ON public.voyage_logs FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for voyage_communication_logs
CREATE POLICY "Users can view voyage communications in their shop"
  ON public.voyage_communication_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.voyage_logs vl 
    WHERE vl.id = voyage_id AND vl.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can create voyage communications in their shop"
  ON public.voyage_communication_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.voyage_logs vl 
    WHERE vl.id = voyage_id AND vl.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can update voyage communications in their shop"
  ON public.voyage_communication_logs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.voyage_logs vl 
    WHERE vl.id = voyage_id AND vl.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can delete voyage communications in their shop"
  ON public.voyage_communication_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.voyage_logs vl 
    WHERE vl.id = voyage_id AND vl.shop_id = public.get_current_user_shop_id()
  ));

-- Indexes
CREATE INDEX idx_voyage_logs_shop_id ON public.voyage_logs(shop_id);
CREATE INDEX idx_voyage_logs_vessel_id ON public.voyage_logs(vessel_id);
CREATE INDEX idx_voyage_logs_departure ON public.voyage_logs(departure_datetime);
CREATE INDEX idx_voyage_logs_status ON public.voyage_logs(voyage_status);
CREATE INDEX idx_voyage_communication_logs_voyage_id ON public.voyage_communication_logs(voyage_id);

-- Updated_at trigger
CREATE TRIGGER update_voyage_logs_updated_at
  BEFORE UPDATE ON public.voyage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_logs_updated_at();