-- Create fuel_entries table for tracking fuel consumption
CREATE TABLE IF NOT EXISTS public.fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  equipment_id UUID REFERENCES public.equipment_assets(id),
  entry_date TIMESTAMPTZ DEFAULT now(),
  fuel_amount DECIMAL(10,2) NOT NULL,
  fuel_unit TEXT DEFAULT 'gallons',
  cost DECIMAL(10,2),
  odometer_reading DECIMAL(12,2),
  hours_reading DECIMAL(10,2),
  location TEXT,
  notes TEXT,
  entered_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trip_logs table for tracking trips
CREATE TABLE IF NOT EXISTS public.trip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  equipment_id UUID REFERENCES public.equipment_assets(id),
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_reading DECIMAL(12,2),
  end_reading DECIMAL(12,2),
  reading_type TEXT DEFAULT 'miles',
  driver_name TEXT,
  purpose TEXT,
  destination TEXT,
  notes TEXT,
  entered_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create maintenance_logs table for quick maintenance performed entries
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  equipment_id UUID REFERENCES public.equipment_assets(id),
  log_date TIMESTAMPTZ DEFAULT now(),
  maintenance_type TEXT NOT NULL,
  description TEXT,
  parts_used TEXT,
  labor_hours DECIMAL(5,2),
  cost DECIMAL(10,2),
  odometer_reading DECIMAL(12,2),
  hours_reading DECIMAL(10,2),
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for fuel_entries
CREATE POLICY "Users can view fuel entries from their shop"
ON public.fuel_entries FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert fuel entries for their shop"
ON public.fuel_entries FOR INSERT
TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update fuel entries from their shop"
ON public.fuel_entries FOR UPDATE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete fuel entries from their shop"
ON public.fuel_entries FOR DELETE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- RLS policies for trip_logs
CREATE POLICY "Users can view trip logs from their shop"
ON public.trip_logs FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert trip logs for their shop"
ON public.trip_logs FOR INSERT
TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update trip logs from their shop"
ON public.trip_logs FOR UPDATE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete trip logs from their shop"
ON public.trip_logs FOR DELETE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- RLS policies for maintenance_logs
CREATE POLICY "Users can view maintenance logs from their shop"
ON public.maintenance_logs FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can insert maintenance logs for their shop"
ON public.maintenance_logs FOR INSERT
TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can update maintenance logs from their shop"
ON public.maintenance_logs FOR UPDATE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

CREATE POLICY "Users can delete maintenance logs from their shop"
ON public.maintenance_logs FOR DELETE
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()));

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_daily_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fuel_entries_updated_at
BEFORE UPDATE ON public.fuel_entries
FOR EACH ROW EXECUTE FUNCTION public.update_daily_logs_updated_at();

CREATE TRIGGER update_trip_logs_updated_at
BEFORE UPDATE ON public.trip_logs
FOR EACH ROW EXECUTE FUNCTION public.update_daily_logs_updated_at();

CREATE TRIGGER update_maintenance_logs_updated_at
BEFORE UPDATE ON public.maintenance_logs
FOR EACH ROW EXECUTE FUNCTION public.update_daily_logs_updated_at();