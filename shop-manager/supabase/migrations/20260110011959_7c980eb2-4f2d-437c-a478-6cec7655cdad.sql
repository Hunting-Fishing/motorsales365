-- Create fuel delivery settings table
CREATE TABLE public.fuel_delivery_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  
  -- Unit preferences
  unit_system TEXT NOT NULL DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),
  volume_unit TEXT NOT NULL DEFAULT 'gallons' CHECK (volume_unit IN ('gallons', 'litres')),
  
  -- Business location
  business_address TEXT,
  business_latitude DOUBLE PRECISION,
  business_longitude DOUBLE PRECISION,
  
  -- Notification settings
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  low_fuel_alerts BOOLEAN DEFAULT true,
  delivery_reminders BOOLEAN DEFAULT true,
  
  -- Default settings
  default_fuel_type TEXT DEFAULT 'diesel',
  default_tank_capacity NUMERIC DEFAULT 500,
  low_fuel_threshold INTEGER DEFAULT 25,
  default_delivery_window TEXT DEFAULT 'morning',
  
  -- Pricing settings
  base_price_per_unit NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  rush_delivery_fee NUMERIC(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fuel_delivery_settings_shop_id_unique UNIQUE (shop_id)
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view fuel delivery settings" 
ON public.fuel_delivery_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert fuel delivery settings" 
ON public.fuel_delivery_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update fuel delivery settings" 
ON public.fuel_delivery_settings 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fuel_delivery_settings_updated_at
BEFORE UPDATE ON public.fuel_delivery_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();