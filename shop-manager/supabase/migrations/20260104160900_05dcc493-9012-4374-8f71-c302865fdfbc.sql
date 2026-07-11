-- Equipment/Assets for fuel delivery operations (pumps, meters, hoses, etc.)
CREATE TABLE public.fuel_delivery_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(100) NOT NULL, -- pump, meter, hose, nozzle, filter_housing, etc.
  serial_number VARCHAR(100),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  purchase_date DATE,
  installation_date DATE,
  purchase_price DECIMAL(12,2),
  location VARCHAR(255), -- which truck, tank, or facility
  location_type VARCHAR(50), -- truck, tank, facility
  location_id UUID, -- reference to truck/tank
  status VARCHAR(50) DEFAULT 'active', -- active, maintenance, retired
  notes TEXT,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Filters and consumables tracking for equipment
CREATE TABLE public.fuel_delivery_equipment_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.fuel_delivery_equipment(id) ON DELETE CASCADE,
  filter_type VARCHAR(100) NOT NULL, -- fuel_filter, water_separator, air_filter, etc.
  filter_name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  manufacturer VARCHAR(100),
  installation_date DATE NOT NULL,
  installation_hours DECIMAL(10,2) DEFAULT 0, -- hours at install
  installation_liters DECIMAL(12,2) DEFAULT 0, -- liters at install
  current_hours DECIMAL(10,2) DEFAULT 0,
  current_liters DECIMAL(12,2) DEFAULT 0,
  max_hours DECIMAL(10,2), -- service interval by hours
  max_liters DECIMAL(12,2), -- service interval by liters
  replacement_date DATE, -- when replaced
  replaced_by UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'active', -- active, due, overdue, replaced
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Usage logs for equipment (hours, liters processed)
CREATE TABLE public.fuel_delivery_equipment_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.fuel_delivery_equipment(id) ON DELETE CASCADE,
  filter_id UUID REFERENCES public.fuel_delivery_equipment_filters(id) ON DELETE SET NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_reading DECIMAL(10,2),
  liters_reading DECIMAL(12,2),
  hours_used DECIMAL(10,2), -- delta from previous reading
  liters_used DECIMAL(12,2), -- delta from previous reading
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_equipment_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_equipment_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment
CREATE POLICY "Users can view fuel delivery equipment" 
  ON public.fuel_delivery_equipment FOR SELECT 
  USING (true);

CREATE POLICY "Users can create fuel delivery equipment" 
  ON public.fuel_delivery_equipment FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery equipment" 
  ON public.fuel_delivery_equipment FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete fuel delivery equipment" 
  ON public.fuel_delivery_equipment FOR DELETE 
  USING (true);

-- RLS policies for filters
CREATE POLICY "Users can view fuel delivery equipment filters" 
  ON public.fuel_delivery_equipment_filters FOR SELECT 
  USING (true);

CREATE POLICY "Users can create fuel delivery equipment filters" 
  ON public.fuel_delivery_equipment_filters FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery equipment filters" 
  ON public.fuel_delivery_equipment_filters FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete fuel delivery equipment filters" 
  ON public.fuel_delivery_equipment_filters FOR DELETE 
  USING (true);

-- RLS policies for usage
CREATE POLICY "Users can view fuel delivery equipment usage" 
  ON public.fuel_delivery_equipment_usage FOR SELECT 
  USING (true);

CREATE POLICY "Users can create fuel delivery equipment usage" 
  ON public.fuel_delivery_equipment_usage FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery equipment usage" 
  ON public.fuel_delivery_equipment_usage FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete fuel delivery equipment usage" 
  ON public.fuel_delivery_equipment_usage FOR DELETE 
  USING (true);

-- Indexes
CREATE INDEX idx_fuel_delivery_equipment_shop ON public.fuel_delivery_equipment(shop_id);
CREATE INDEX idx_fuel_delivery_equipment_type ON public.fuel_delivery_equipment(equipment_type);
CREATE INDEX idx_fuel_delivery_equipment_status ON public.fuel_delivery_equipment(status);
CREATE INDEX idx_fuel_delivery_equipment_filters_equipment ON public.fuel_delivery_equipment_filters(equipment_id);
CREATE INDEX idx_fuel_delivery_equipment_filters_status ON public.fuel_delivery_equipment_filters(status);
CREATE INDEX idx_fuel_delivery_equipment_usage_equipment ON public.fuel_delivery_equipment_usage(equipment_id);
CREATE INDEX idx_fuel_delivery_equipment_usage_date ON public.fuel_delivery_equipment_usage(usage_date);

-- Triggers for updated_at
CREATE TRIGGER update_fuel_delivery_equipment_updated_at
  BEFORE UPDATE ON public.fuel_delivery_equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_delivery_equipment_filters_updated_at
  BEFORE UPDATE ON public.fuel_delivery_equipment_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();