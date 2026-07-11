-- Create forklift inspection status enum
CREATE TYPE forklift_item_status AS ENUM ('good', 'attention', 'bad');

-- Create forklift inspections table
CREATE TABLE public.forklift_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id),
  inspector_name TEXT NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_hours NUMERIC NOT NULL,
  
  -- Inspection items with tri-state status
  seat_status forklift_item_status NOT NULL DEFAULT 'good',
  seat_notes TEXT,
  seatbelt_status forklift_item_status NOT NULL DEFAULT 'good',
  seatbelt_notes TEXT,
  steering_status forklift_item_status NOT NULL DEFAULT 'good',
  steering_notes TEXT,
  horn_status forklift_item_status NOT NULL DEFAULT 'good',
  horn_notes TEXT,
  lights_status forklift_item_status NOT NULL DEFAULT 'good',
  lights_notes TEXT,
  backup_alarm_status forklift_item_status NOT NULL DEFAULT 'good',
  backup_alarm_notes TEXT,
  mirrors_status forklift_item_status NOT NULL DEFAULT 'good',
  mirrors_notes TEXT,
  forks_status forklift_item_status NOT NULL DEFAULT 'good',
  forks_notes TEXT,
  mast_status forklift_item_status NOT NULL DEFAULT 'good',
  mast_notes TEXT,
  chains_status forklift_item_status NOT NULL DEFAULT 'good',
  chains_notes TEXT,
  hydraulic_leaks_status forklift_item_status NOT NULL DEFAULT 'good',
  hydraulic_leaks_notes TEXT,
  tires_status forklift_item_status NOT NULL DEFAULT 'good',
  tires_notes TEXT,
  brakes_status forklift_item_status NOT NULL DEFAULT 'good',
  brakes_notes TEXT,
  parking_brake_status forklift_item_status NOT NULL DEFAULT 'good',
  parking_brake_notes TEXT,
  battery_status forklift_item_status NOT NULL DEFAULT 'good',
  battery_notes TEXT,
  propane_tank_status forklift_item_status NOT NULL DEFAULT 'good',
  propane_tank_notes TEXT,
  engine_oil_status forklift_item_status NOT NULL DEFAULT 'good',
  engine_oil_notes TEXT,
  coolant_status forklift_item_status NOT NULL DEFAULT 'good',
  coolant_notes TEXT,
  air_filter_status forklift_item_status NOT NULL DEFAULT 'good',
  air_filter_notes TEXT,
  fire_extinguisher_status forklift_item_status NOT NULL DEFAULT 'good',
  fire_extinguisher_notes TEXT,
  
  -- Overall assessment
  overall_status TEXT NOT NULL DEFAULT 'pass' CHECK (overall_status IN ('pass', 'pass_with_concerns', 'fail')),
  safe_to_operate BOOLEAN NOT NULL DEFAULT true,
  general_notes TEXT,
  signature_data TEXT,
  
  -- Concern routing
  has_concerns BOOLEAN NOT NULL DEFAULT false,
  concern_routed_to UUID REFERENCES auth.users(id),
  concern_acknowledged BOOLEAN DEFAULT false,
  concern_acknowledged_at TIMESTAMPTZ,
  concern_resolution TEXT,
  concern_resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create inspection concern roles table (for manager settings)
CREATE TABLE public.inspection_concern_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  role_description TEXT,
  assigned_user_id UUID REFERENCES auth.users(id),
  equipment_types TEXT[] DEFAULT '{}',
  priority_level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, role_name)
);

-- Enable RLS
ALTER TABLE public.forklift_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_concern_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for forklift_inspections
CREATE POLICY "Users can view forklift inspections for their shop"
ON public.forklift_inspections FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can create forklift inspections for their shop"
ON public.forklift_inspections FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can update forklift inspections for their shop"
ON public.forklift_inspections FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

-- RLS policies for inspection_concern_roles
CREATE POLICY "Users can view concern roles for their shop"
ON public.inspection_concern_roles FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Managers can manage concern roles for their shop"
ON public.inspection_concern_roles FOR ALL
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX idx_forklift_inspections_equipment ON public.forklift_inspections(equipment_id);
CREATE INDEX idx_forklift_inspections_date ON public.forklift_inspections(inspection_date DESC);
CREATE INDEX idx_forklift_inspections_concerns ON public.forklift_inspections(has_concerns, concern_acknowledged) WHERE has_concerns = true;

-- Trigger for updated_at
CREATE TRIGGER update_forklift_inspections_updated_at
BEFORE UPDATE ON public.forklift_inspections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();