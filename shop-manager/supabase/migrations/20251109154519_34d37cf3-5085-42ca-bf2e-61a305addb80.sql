-- Create asset_work_orders table for maintenance work orders
CREATE TABLE IF NOT EXISTS public.asset_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL,
  service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  transferred_by TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for asset_work_orders
CREATE POLICY "Users can view all asset work orders"
ON public.asset_work_orders
FOR SELECT
USING (true);

CREATE POLICY "Users can create asset work orders"
ON public.asset_work_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update asset work orders"
ON public.asset_work_orders
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete asset work orders"
ON public.asset_work_orders
FOR DELETE
USING (true);

-- Create RLS policies for stock_transfers
CREATE POLICY "Users can view all stock transfers"
ON public.stock_transfers
FOR SELECT
USING (true);

CREATE POLICY "Users can create stock transfers"
ON public.stock_transfers
FOR INSERT
WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_work_orders_updated_at
BEFORE UPDATE ON public.asset_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_asset_work_orders_asset_id ON public.asset_work_orders(asset_id);
CREATE INDEX idx_asset_work_orders_status ON public.asset_work_orders(status);
CREATE INDEX idx_asset_work_orders_scheduled_date ON public.asset_work_orders(scheduled_date);
CREATE INDEX idx_stock_transfers_inventory_item_id ON public.stock_transfers(inventory_item_id);
CREATE INDEX idx_stock_transfers_transferred_at ON public.stock_transfers(transferred_at);