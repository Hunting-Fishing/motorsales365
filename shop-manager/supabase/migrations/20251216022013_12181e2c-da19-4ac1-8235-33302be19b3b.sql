-- Create PPE inventory table
CREATE TABLE public.ppe_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model_number TEXT,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 5,
  unit_cost DECIMAL(10,2),
  expiry_tracking BOOLEAN DEFAULT false,
  inspection_frequency_days INTEGER,
  certification_required BOOLEAN DEFAULT false,
  storage_location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create PPE assignments table
CREATE TABLE public.ppe_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  ppe_item_id UUID NOT NULL REFERENCES public.ppe_inventory(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  serial_number TEXT,
  condition TEXT DEFAULT 'new',
  expiry_date DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  returned_date DATE,
  return_condition TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id)
);

-- Create PPE inspection records table
CREATE TABLE public.ppe_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  assignment_id UUID NOT NULL REFERENCES public.ppe_assignments(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id UUID REFERENCES public.profiles(id),
  inspector_name TEXT NOT NULL,
  condition_rating TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  findings TEXT,
  action_required TEXT,
  action_taken TEXT,
  next_inspection_date DATE,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ppe_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ppe_inventory
CREATE POLICY "Users can view PPE inventory in their shop" ON public.ppe_inventory
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create PPE inventory in their shop" ON public.ppe_inventory
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update PPE inventory in their shop" ON public.ppe_inventory
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete PPE inventory in their shop" ON public.ppe_inventory
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for ppe_assignments
CREATE POLICY "Users can view PPE assignments in their shop" ON public.ppe_assignments
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create PPE assignments in their shop" ON public.ppe_assignments
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update PPE assignments in their shop" ON public.ppe_assignments
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete PPE assignments in their shop" ON public.ppe_assignments
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for ppe_inspections
CREATE POLICY "Users can view PPE inspections in their shop" ON public.ppe_inspections
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create PPE inspections in their shop" ON public.ppe_inspections
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update PPE inspections in their shop" ON public.ppe_inspections
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

-- Create indexes
CREATE INDEX idx_ppe_inventory_shop ON public.ppe_inventory(shop_id);
CREATE INDEX idx_ppe_assignments_shop ON public.ppe_assignments(shop_id);
CREATE INDEX idx_ppe_assignments_employee ON public.ppe_assignments(employee_id);
CREATE INDEX idx_ppe_inspections_shop ON public.ppe_inspections(shop_id);
CREATE INDEX idx_ppe_inspections_assignment ON public.ppe_inspections(assignment_id);