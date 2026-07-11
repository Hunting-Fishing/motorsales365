-- Create maintenance_interval_tracking table for smart countdown
CREATE TABLE IF NOT EXISTS public.maintenance_interval_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  interval_type TEXT NOT NULL, -- 'oil_change', 'filter_change', 'belt_inspection', etc.
  interval_name TEXT NOT NULL, -- Display name like "Oil Change"
  interval_hours NUMERIC(10,2), -- Service interval in hours (e.g., 250)
  last_service_hours NUMERIC(10,2) DEFAULT 0, -- Hours at last service
  last_service_date DATE,
  next_service_hours NUMERIC(10,2), -- Calculated: last_service_hours + interval_hours
  average_daily_hours NUMERIC(10,2) DEFAULT 0, -- Calculated from usage logs
  predicted_next_service_date DATE, -- Calculated based on daily usage
  parts_needed JSONB DEFAULT '[]'::jsonb, -- [{"name": "Oil 15W-40", "qty": 4, "unit": "L"}]
  is_active BOOLEAN DEFAULT true,
  shop_id UUID REFERENCES public.shops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_interval_equipment ON public.maintenance_interval_tracking(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_interval_shop ON public.maintenance_interval_tracking(shop_id);

-- Enable RLS
ALTER TABLE public.maintenance_interval_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view maintenance intervals for their shop" ON public.maintenance_interval_tracking
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert maintenance intervals for their shop" ON public.maintenance_interval_tracking
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update maintenance intervals for their shop" ON public.maintenance_interval_tracking
  FOR UPDATE USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete maintenance intervals for their shop" ON public.maintenance_interval_tracking
  FOR DELETE USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Add parent_equipment_id to equipment_assets if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equipment_assets' AND column_name = 'parent_equipment_id'
  ) THEN
    ALTER TABLE public.equipment_assets ADD COLUMN parent_equipment_id UUID REFERENCES public.equipment_assets(id);
  END IF;
END $$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_maintenance_interval_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_maintenance_interval_tracking_timestamp ON public.maintenance_interval_tracking;
CREATE TRIGGER update_maintenance_interval_tracking_timestamp
  BEFORE UPDATE ON public.maintenance_interval_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_maintenance_interval_tracking_updated_at();

-- Function to calculate average daily hours for equipment
CREATE OR REPLACE FUNCTION public.calculate_equipment_average_daily_hours(p_equipment_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_hours NUMERIC;
BEGIN
  SELECT AVG(daily_usage) INTO avg_hours
  FROM (
    SELECT 
      (reading_value - LAG(reading_value) OVER (ORDER BY reading_date)) / 
      NULLIF(EXTRACT(EPOCH FROM (reading_date - LAG(reading_date) OVER (ORDER BY reading_date))) / 86400, 0) as daily_usage
    FROM public.equipment_usage_logs
    WHERE equipment_id = p_equipment_id
      AND reading_type = 'hours'
    ORDER BY reading_date DESC
    LIMIT 30
  ) recent_usage
  WHERE daily_usage > 0 AND daily_usage < 24; -- Sanity check
  
  RETURN COALESCE(avg_hours, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update maintenance countdown when hours are logged
CREATE OR REPLACE FUNCTION public.update_maintenance_countdown()
RETURNS TRIGGER AS $$
DECLARE
  current_hours NUMERIC;
  avg_daily NUMERIC;
  rec RECORD;
BEGIN
  IF NEW.reading_type = 'hours' THEN
    current_hours := NEW.reading_value;
    avg_daily := public.calculate_equipment_average_daily_hours(NEW.equipment_id);
    
    -- Update all active maintenance intervals for this equipment
    FOR rec IN 
      SELECT id, next_service_hours 
      FROM public.maintenance_interval_tracking 
      WHERE equipment_id = NEW.equipment_id AND is_active = true
    LOOP
      UPDATE public.maintenance_interval_tracking
      SET 
        average_daily_hours = avg_daily,
        predicted_next_service_date = CASE 
          WHEN avg_daily > 0 THEN 
            CURRENT_DATE + ((rec.next_service_hours - current_hours) / avg_daily)::INTEGER
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = rec.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_maintenance_countdown ON public.equipment_usage_logs;
CREATE TRIGGER trigger_update_maintenance_countdown
  AFTER INSERT ON public.equipment_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_maintenance_countdown();