-- Create equipment_tasks table for general tasks associated with equipment
CREATE TABLE public.equipment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'general' CHECK (task_type IN ('general', 'cleaning', 'inspection', 'preparation', 'maintenance_prep')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_to_name TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  estimated_hours NUMERIC(6,2),
  actual_hours NUMERIC(6,2),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  shop_id UUID REFERENCES public.shops(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment_supply_orders table for supply/consumable orders
CREATE TABLE public.equipment_supply_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'partial', 'received', 'cancelled')),
  requested_by UUID REFERENCES public.profiles(id),
  requested_by_name TEXT,
  supplier TEXT,
  order_date TIMESTAMPTZ DEFAULT now(),
  expected_delivery DATE,
  total_estimated_cost NUMERIC(12,2),
  notes TEXT,
  shop_id UUID REFERENCES public.shops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment_supply_order_items table for individual items in orders
CREATE TABLE public.equipment_supply_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.equipment_supply_orders(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT DEFAULT 'other' CHECK (item_category IN ('tools', 'consumables', 'safety', 'cleaning', 'fittings', 'parts', 'ppe', 'other')),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2),
  sku TEXT,
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  received_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_equipment_tasks_equipment_id ON public.equipment_tasks(equipment_id);
CREATE INDEX idx_equipment_tasks_shop_id ON public.equipment_tasks(shop_id);
CREATE INDEX idx_equipment_tasks_status ON public.equipment_tasks(status);
CREATE INDEX idx_equipment_tasks_assigned_to ON public.equipment_tasks(assigned_to);
CREATE INDEX idx_equipment_supply_orders_equipment_id ON public.equipment_supply_orders(equipment_id);
CREATE INDEX idx_equipment_supply_orders_shop_id ON public.equipment_supply_orders(shop_id);
CREATE INDEX idx_equipment_supply_orders_status ON public.equipment_supply_orders(status);
CREATE INDEX idx_equipment_supply_order_items_order_id ON public.equipment_supply_order_items(order_id);

-- Enable RLS
ALTER TABLE public.equipment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_supply_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_tasks
CREATE POLICY "Users can view equipment tasks in their shop"
  ON public.equipment_tasks FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create equipment tasks in their shop"
  ON public.equipment_tasks FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update equipment tasks in their shop"
  ON public.equipment_tasks FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete equipment tasks in their shop"
  ON public.equipment_tasks FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for equipment_supply_orders
CREATE POLICY "Users can view supply orders in their shop"
  ON public.equipment_supply_orders FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create supply orders in their shop"
  ON public.equipment_supply_orders FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update supply orders in their shop"
  ON public.equipment_supply_orders FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete supply orders in their shop"
  ON public.equipment_supply_orders FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for equipment_supply_order_items (inherit from parent order)
CREATE POLICY "Users can view order items for orders in their shop"
  ON public.equipment_supply_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.equipment_supply_orders o 
    WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can create order items for orders in their shop"
  ON public.equipment_supply_order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.equipment_supply_orders o 
    WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can update order items for orders in their shop"
  ON public.equipment_supply_order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.equipment_supply_orders o 
    WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can delete order items for orders in their shop"
  ON public.equipment_supply_order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.equipment_supply_orders o 
    WHERE o.id = order_id AND o.shop_id = public.get_current_user_shop_id()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_tasks_updated_at
  BEFORE UPDATE ON public.equipment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_equipment_manuals_updated_at();

CREATE TRIGGER update_equipment_supply_orders_updated_at
  BEFORE UPDATE ON public.equipment_supply_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_equipment_manuals_updated_at();

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_equipment_order_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
  order_number TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number ~ '^EO-[0-9]+$' 
      THEN SUBSTRING(order_number FROM 4)::INTEGER 
      ELSE 0 
    END
  ), 1000) + 1
  INTO next_num
  FROM public.equipment_supply_orders
  WHERE shop_id = p_shop_id;
  
  order_number := 'EO-' || next_num::TEXT;
  RETURN order_number;
END;
$$;