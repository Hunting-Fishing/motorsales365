-- Usage Tracking Configuration
-- Define how different assets track usage (hours, mileage, time-based)
CREATE TABLE public.asset_usage_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  asset_type TEXT NOT NULL, -- 'vehicle', 'equipment', etc.
  usage_metric TEXT NOT NULL, -- 'engine_hours', 'mileage', 'days', 'weeks', 'months', 'years'
  current_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_reading_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  average_usage_per_day DECIMAL(10,2), -- calculated average
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service Package Templates
-- Define reusable service packages (e.g., "Oil Change Service")
CREATE TABLE public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'maintenance', 'repair', 'inspection'
  interval_value DECIMAL(10,2) NOT NULL, -- e.g., 250
  interval_metric TEXT NOT NULL, -- 'engine_hours', 'mileage', 'days', 'weeks', 'months', 'years'
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service Package Items (Parts required for each service)
CREATE TABLE public.service_package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  part_number TEXT,
  part_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each', -- 'each', 'litres', 'gallons', 'kg', etc.
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Consumption Rates
-- Track how quickly parts are consumed based on usage
CREATE TABLE public.inventory_consumption_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  usage_metric TEXT NOT NULL, -- 'engine_hours', 'mileage', 'days', etc.
  consumption_per_unit DECIMAL(10,4) NOT NULL, -- e.g., 0.004 filters per hour
  average_consumption DECIMAL(10,4), -- rolling average
  variance_percentage DECIMAL(5,2), -- +/- % variance
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Historical Consumption Data
CREATE TABLE public.inventory_consumption_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_consumed DECIMAL(10,2) NOT NULL,
  usage_metric TEXT NOT NULL,
  usage_value DECIMAL(10,2) NOT NULL, -- e.g., 250 hours
  service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Inventory Forecasting
CREATE TABLE public.inventory_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL, -- 'usage_based', 'time_based', 'seasonal'
  predicted_runout_date DATE,
  predicted_runout_usage DECIMAL(10,2), -- predicted usage value when stock runs out
  current_stock DECIMAL(10,2) NOT NULL,
  average_consumption_rate DECIMAL(10,4) NOT NULL,
  confidence_level DECIMAL(5,2), -- 0-100 confidence percentage
  recommended_reorder_date DATE,
  recommended_reorder_quantity DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seasonal Adjustment Factors
CREATE TABLE public.inventory_seasonal_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  category TEXT, -- can apply to whole category
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  adjustment_factor DECIMAL(5,2) NOT NULL DEFAULT 1.0, -- e.g., 1.2 = 20% increase
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_usage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_seasonal_factors ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their org's asset usage config"
  ON public.asset_usage_config FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their org's asset usage config"
  ON public.asset_usage_config FOR ALL
  USING (true);

CREATE POLICY "Users can view service packages"
  ON public.service_packages FOR SELECT
  USING (true);

CREATE POLICY "Users can manage service packages"
  ON public.service_packages FOR ALL
  USING (true);

CREATE POLICY "Users can view service package items"
  ON public.service_package_items FOR SELECT
  USING (true);

CREATE POLICY "Users can manage service package items"
  ON public.service_package_items FOR ALL
  USING (true);

CREATE POLICY "Users can view consumption rates"
  ON public.inventory_consumption_rates FOR SELECT
  USING (true);

CREATE POLICY "Users can manage consumption rates"
  ON public.inventory_consumption_rates FOR ALL
  USING (true);

CREATE POLICY "Users can view consumption history"
  ON public.inventory_consumption_history FOR SELECT
  USING (true);

CREATE POLICY "Users can manage consumption history"
  ON public.inventory_consumption_history FOR ALL
  USING (true);

CREATE POLICY "Users can view forecasts"
  ON public.inventory_forecasts FOR SELECT
  USING (true);

CREATE POLICY "Users can manage forecasts"
  ON public.inventory_forecasts FOR ALL
  USING (true);

CREATE POLICY "Users can view seasonal factors"
  ON public.inventory_seasonal_factors FOR SELECT
  USING (true);

CREATE POLICY "Users can manage seasonal factors"
  ON public.inventory_seasonal_factors FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX idx_asset_usage_config_asset ON public.asset_usage_config(asset_id, asset_type);
CREATE INDEX idx_service_package_items_package ON public.service_package_items(service_package_id);
CREATE INDEX idx_service_package_items_inventory ON public.service_package_items(inventory_item_id);
CREATE INDEX idx_consumption_rates_inventory ON public.inventory_consumption_rates(inventory_item_id);
CREATE INDEX idx_consumption_history_inventory ON public.inventory_consumption_history(inventory_item_id);
CREATE INDEX idx_consumption_history_date ON public.inventory_consumption_history(consumed_at);
CREATE INDEX idx_forecasts_inventory ON public.inventory_forecasts(inventory_item_id);
CREATE INDEX idx_forecasts_runout_date ON public.inventory_forecasts(predicted_runout_date);
CREATE INDEX idx_seasonal_factors_month ON public.inventory_seasonal_factors(month);

-- Triggers for updated_at
CREATE TRIGGER update_asset_usage_config_updated_at
  BEFORE UPDATE ON public.asset_usage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consumption_rates_updated_at
  BEFORE UPDATE ON public.inventory_consumption_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forecasts_updated_at
  BEFORE UPDATE ON public.inventory_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();