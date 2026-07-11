-- Create history table for tracking compartment level changes
CREATE TABLE public.fuel_delivery_compartment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  compartment_id UUID NOT NULL REFERENCES public.fuel_delivery_truck_compartments(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL,
  previous_level_gallons NUMERIC NOT NULL DEFAULT 0,
  new_level_gallons NUMERIC NOT NULL DEFAULT 0,
  change_amount_gallons NUMERIC NOT NULL DEFAULT 0,
  change_type TEXT NOT NULL, -- 'fill', 'delivery', 'adjustment', 'manual'
  reference_id UUID, -- Links to delivery completion, tank fill, etc.
  reference_type TEXT, -- 'delivery_completion', 'tank_fill', 'manual_adjustment'
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_compartment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view compartment history for their shop" 
ON public.fuel_delivery_compartment_history 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert compartment history" 
ON public.fuel_delivery_compartment_history 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_compartment_history_compartment ON public.fuel_delivery_compartment_history(compartment_id);
CREATE INDEX idx_compartment_history_truck ON public.fuel_delivery_compartment_history(truck_id);
CREATE INDEX idx_compartment_history_created_at ON public.fuel_delivery_compartment_history(created_at DESC);