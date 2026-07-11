-- Create water_delivery_truck_tanks table for tracking multiple tanks per truck
CREATE TABLE public.water_delivery_truck_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES public.water_delivery_trucks(id) ON DELETE CASCADE,
  tank_number INTEGER NOT NULL DEFAULT 1,
  tank_name VARCHAR(100),
  capacity_gallons NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_level_gallons NUMERIC(12,2) NOT NULL DEFAULT 0,
  material VARCHAR(50),
  is_potable_certified BOOLEAN DEFAULT true,
  last_sanitized_date DATE,
  next_sanitization_due DATE,
  last_fill_date TIMESTAMP WITH TIME ZONE,
  last_fill_source VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(truck_id, tank_number)
);

-- Enable RLS
ALTER TABLE public.water_delivery_truck_tanks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tanks for their shop"
ON public.water_delivery_truck_tanks
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create tanks for their shop"
ON public.water_delivery_truck_tanks
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update tanks for their shop"
ON public.water_delivery_truck_tanks
FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete tanks for their shop"
ON public.water_delivery_truck_tanks
FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_water_truck_tanks_truck_id ON public.water_delivery_truck_tanks(truck_id);
CREATE INDEX idx_water_truck_tanks_shop_id ON public.water_delivery_truck_tanks(shop_id);

-- Create trigger for updated_at
CREATE TRIGGER update_water_truck_tanks_updated_at
BEFORE UPDATE ON public.water_delivery_truck_tanks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();