-- Fuel Delivery Hours of Operation (module-specific)
CREATE TABLE fuel_delivery_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL DEFAULT '08:00:00',
  close_time time NOT NULL DEFAULT '17:00:00',
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, day_of_week)
);

-- Fuel Delivery Zones (distance-based pricing)
CREATE TABLE fuel_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  min_distance_miles numeric DEFAULT 0,
  max_distance_miles numeric,
  delivery_fee numeric NOT NULL DEFAULT 0,
  per_mile_rate numeric DEFAULT 0,
  minimum_order numeric,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fuel Delivery Special Rates (after-hours, weekends, holidays)
CREATE TABLE fuel_delivery_special_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_type text NOT NULL CHECK (rate_type IN ('flat', 'percentage', 'per_gallon')),
  rate_value numeric NOT NULL,
  applies_to text[] DEFAULT '{}',
  start_time time,
  end_time time,
  days_of_week integer[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fuel Delivery Labor Rates
CREATE TABLE fuel_delivery_labor_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  hourly_rate numeric NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE fuel_delivery_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_delivery_special_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_delivery_labor_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fuel_delivery_hours (matching existing patterns)
CREATE POLICY "Users can view fuel delivery hours"
ON fuel_delivery_hours FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel delivery hours"
ON fuel_delivery_hours FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery hours"
ON fuel_delivery_hours FOR UPDATE USING (true);

CREATE POLICY "Users can delete fuel delivery hours"
ON fuel_delivery_hours FOR DELETE USING (true);

-- RLS Policies for fuel_delivery_zones
CREATE POLICY "Users can view fuel delivery zones"
ON fuel_delivery_zones FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel delivery zones"
ON fuel_delivery_zones FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery zones"
ON fuel_delivery_zones FOR UPDATE USING (true);

CREATE POLICY "Users can delete fuel delivery zones"
ON fuel_delivery_zones FOR DELETE USING (true);

-- RLS Policies for fuel_delivery_special_rates
CREATE POLICY "Users can view fuel delivery special rates"
ON fuel_delivery_special_rates FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel delivery special rates"
ON fuel_delivery_special_rates FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery special rates"
ON fuel_delivery_special_rates FOR UPDATE USING (true);

CREATE POLICY "Users can delete fuel delivery special rates"
ON fuel_delivery_special_rates FOR DELETE USING (true);

-- RLS Policies for fuel_delivery_labor_rates
CREATE POLICY "Users can view fuel delivery labor rates"
ON fuel_delivery_labor_rates FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel delivery labor rates"
ON fuel_delivery_labor_rates FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery labor rates"
ON fuel_delivery_labor_rates FOR UPDATE USING (true);

CREATE POLICY "Users can delete fuel delivery labor rates"
ON fuel_delivery_labor_rates FOR DELETE USING (true);

-- Add indexes for performance
CREATE INDEX idx_fuel_delivery_hours_shop ON fuel_delivery_hours(shop_id);
CREATE INDEX idx_fuel_delivery_zones_shop ON fuel_delivery_zones(shop_id);
CREATE INDEX idx_fuel_delivery_special_rates_shop ON fuel_delivery_special_rates(shop_id);
CREATE INDEX idx_fuel_delivery_labor_rates_shop ON fuel_delivery_labor_rates(shop_id);

-- Add comments
COMMENT ON TABLE fuel_delivery_hours IS 'Module-specific hours of operation for fuel delivery service';
COMMENT ON TABLE fuel_delivery_zones IS 'Delivery zones with distance-based pricing for fuel delivery';
COMMENT ON TABLE fuel_delivery_special_rates IS 'Special rates like after-hours, weekend, holiday surcharges';
COMMENT ON TABLE fuel_delivery_labor_rates IS 'Hourly labor rates for fuel delivery services';