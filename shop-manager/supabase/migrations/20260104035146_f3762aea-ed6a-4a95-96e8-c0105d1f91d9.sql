-- 1. Stock Movement Tracking
CREATE TABLE public.gunsmith_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  part_id UUID REFERENCES public.gunsmith_parts(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('adjustment', 'job_usage', 'purchase', 'return', 'transfer', 'damage', 'count')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  job_id UUID REFERENCES public.gunsmith_jobs(id) ON DELETE SET NULL,
  purchase_order_id UUID,
  reason TEXT,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Job Parts Usage (link parts to jobs)
CREATE TABLE public.gunsmith_job_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  job_id UUID REFERENCES public.gunsmith_jobs(id) ON DELETE CASCADE NOT NULL,
  part_id UUID REFERENCES public.gunsmith_parts(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  is_deducted BOOLEAN DEFAULT false,
  deducted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Purchase Orders
CREATE TABLE public.gunsmith_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  po_number TEXT NOT NULL,
  supplier TEXT,
  supplier_contact TEXT,
  supplier_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled')),
  order_date TIMESTAMPTZ,
  expected_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Purchase Order Line Items
CREATE TABLE public.gunsmith_po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.gunsmith_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  part_id UUID REFERENCES public.gunsmith_parts(id) ON DELETE SET NULL,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  received_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Serial Number Tracking
CREATE TABLE public.gunsmith_serialized_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  part_id UUID REFERENCES public.gunsmith_parts(id) ON DELETE CASCADE NOT NULL,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'used_in_job', 'returned', 'damaged')),
  job_id UUID REFERENCES public.gunsmith_jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  acquisition_date TIMESTAMPTZ,
  acquisition_source TEXT,
  disposition_date TIMESTAMPTZ,
  disposition_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, serial_number)
);

-- Enable RLS on all new tables
ALTER TABLE public.gunsmith_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunsmith_serialized_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage stock movements in their shop" ON public.gunsmith_stock_movements
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage job parts in their shop" ON public.gunsmith_job_parts
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage purchase orders in their shop" ON public.gunsmith_purchase_orders
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage PO items" ON public.gunsmith_po_items
  FOR ALL USING (
    purchase_order_id IN (
      SELECT id FROM public.gunsmith_purchase_orders 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage serialized items in their shop" ON public.gunsmith_serialized_items
  FOR ALL USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Add foreign key for stock movements to PO
ALTER TABLE public.gunsmith_stock_movements 
  ADD CONSTRAINT gunsmith_stock_movements_po_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES public.gunsmith_purchase_orders(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_stock_movements_part ON public.gunsmith_stock_movements(part_id);
CREATE INDEX idx_stock_movements_job ON public.gunsmith_stock_movements(job_id);
CREATE INDEX idx_job_parts_job ON public.gunsmith_job_parts(job_id);
CREATE INDEX idx_job_parts_part ON public.gunsmith_job_parts(part_id);
CREATE INDEX idx_po_items_po ON public.gunsmith_po_items(purchase_order_id);
CREATE INDEX idx_serialized_part ON public.gunsmith_serialized_items(part_id);
CREATE INDEX idx_serialized_serial ON public.gunsmith_serialized_items(serial_number);