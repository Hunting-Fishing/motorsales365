-- Create water delivery parts inventory table
CREATE TABLE public.water_delivery_parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  
  -- Part identification
  part_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'filter', 'pipe_fitting', 'hose', 'chemical', 'seal', 'tool', 'ppe', 'other'
  subcategory TEXT,
  
  -- Stock levels
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'each',
  min_quantity INTEGER DEFAULT 0,
  max_quantity INTEGER,
  
  -- Pricing
  cost_price NUMERIC(10,2),
  retail_price NUMERIC(10,2),
  
  -- Supplier info
  supplier_id UUID REFERENCES public.inventory_suppliers(id),
  supplier_part_number TEXT,
  lead_time_days INTEGER,
  
  -- Location
  storage_location TEXT,
  bin_number TEXT,
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  last_restock_date TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create water delivery parts transactions table for stock movement history
CREATE TABLE public.water_delivery_parts_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.water_delivery_parts_inventory(id) ON DELETE CASCADE,
  
  transaction_type TEXT NOT NULL, -- 'received', 'used', 'adjustment', 'returned', 'damaged'
  quantity INTEGER NOT NULL,
  reference_type TEXT, -- 'purchase_order', 'work_order', 'manual'
  reference_id UUID,
  
  unit_cost NUMERIC(10,2),
  performed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_water_delivery_parts_shop ON public.water_delivery_parts_inventory(shop_id);
CREATE INDEX idx_water_delivery_parts_category ON public.water_delivery_parts_inventory(category);
CREATE INDEX idx_water_delivery_parts_active ON public.water_delivery_parts_inventory(is_active);
CREATE INDEX idx_water_delivery_parts_transactions_shop ON public.water_delivery_parts_transactions(shop_id);
CREATE INDEX idx_water_delivery_parts_transactions_part ON public.water_delivery_parts_transactions(part_id);

-- Enable RLS
ALTER TABLE public.water_delivery_parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_delivery_parts_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for water_delivery_parts_inventory
CREATE POLICY "Users can view parts for their shop"
ON public.water_delivery_parts_inventory
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert parts for their shop"
ON public.water_delivery_parts_inventory
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update parts for their shop"
ON public.water_delivery_parts_inventory
FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete parts for their shop"
ON public.water_delivery_parts_inventory
FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policies for water_delivery_parts_transactions
CREATE POLICY "Users can view transactions for their shop"
ON public.water_delivery_parts_transactions
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert transactions for their shop"
ON public.water_delivery_parts_transactions
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_water_delivery_parts_inventory_updated_at
BEFORE UPDATE ON public.water_delivery_parts_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();