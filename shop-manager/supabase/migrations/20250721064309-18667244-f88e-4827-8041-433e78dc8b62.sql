-- Create business_locations table for multi-location support
CREATE TABLE public.business_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  manager_email TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  location_type TEXT DEFAULT 'branch', -- 'headquarters', 'branch', 'warehouse', 'service_center'
  parent_location_id UUID REFERENCES public.business_locations(id),
  operating_status TEXT DEFAULT 'operational', -- 'operational', 'temporarily_closed', 'under_renovation'
  square_footage INTEGER,
  employee_count INTEGER,
  specializations TEXT[], -- ['oil_change', 'tires', 'diagnostics', etc.]
  coordinates POINT, -- For mapping and distance calculations
  timezone TEXT DEFAULT 'UTC',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on business_locations
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_locations
CREATE POLICY "Users can view locations from their shop" 
ON public.business_locations FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert locations for their shop" 
ON public.business_locations FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update locations in their shop" 
ON public.business_locations FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete locations from their shop" 
ON public.business_locations FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Create location_business_hours table for location-specific hours
CREATE TABLE public.location_business_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(location_id, day_of_week)
);

-- Enable RLS on location_business_hours
ALTER TABLE public.location_business_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for location_business_hours
CREATE POLICY "Users can manage location hours for their shop" 
ON public.location_business_hours FOR ALL 
USING (location_id IN (
  SELECT bl.id 
  FROM business_locations bl
  JOIN profiles p ON p.shop_id = bl.shop_id
  WHERE p.id = auth.uid()
));

-- Create location_services table for location-specific services
CREATE TABLE public.location_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_description TEXT,
  base_price NUMERIC(10,2),
  estimated_duration INTEGER, -- in minutes
  is_available BOOLEAN DEFAULT true,
  equipment_required TEXT[],
  skill_level_required TEXT DEFAULT 'basic', -- 'basic', 'intermediate', 'advanced', 'expert'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on location_services
ALTER TABLE public.location_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for location_services
CREATE POLICY "Users can manage location services for their shop" 
ON public.location_services FOR ALL 
USING (location_id IN (
  SELECT bl.id 
  FROM business_locations bl
  JOIN profiles p ON p.shop_id = bl.shop_id
  WHERE p.id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_business_locations_shop_id ON public.business_locations(shop_id);
CREATE INDEX idx_business_locations_parent ON public.business_locations(parent_location_id);
CREATE INDEX idx_location_business_hours_location ON public.location_business_hours(location_id);
CREATE INDEX idx_location_services_location ON public.location_services(location_id);

-- Create updated_at triggers
CREATE TRIGGER update_business_locations_updated_at
  BEFORE UPDATE ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_business_hours_updated_at
  BEFORE UPDATE ON public.location_business_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_services_updated_at
  BEFORE UPDATE ON public.location_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();