-- Create power washing inventory vendors table
CREATE TABLE public.power_washing_inventory_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  account_number TEXT,
  notes TEXT,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create power washing inventory table
CREATE TABLE public.power_washing_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('chemicals', 'parts', 'safety_gear', 'accessories')),
  subcategory TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL DEFAULT 'each',
  reorder_point NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  vendor_id UUID REFERENCES public.power_washing_inventory_vendors(id) ON DELETE SET NULL,
  vendor_sku TEXT,
  location TEXT,
  expiration_date DATE,
  sds_url TEXT,
  dilution_ratio TEXT,
  compatible_equipment TEXT[],
  notes TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create power washing inventory transactions table
CREATE TABLE public.power_washing_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.power_washing_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('received', 'used', 'adjusted', 'transferred')),
  quantity_change NUMERIC NOT NULL,
  job_id UUID,
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_pw_inventory_shop_id ON public.power_washing_inventory(shop_id);
CREATE INDEX idx_pw_inventory_category ON public.power_washing_inventory(category);
CREATE INDEX idx_pw_inventory_vendor_id ON public.power_washing_inventory(vendor_id);
CREATE INDEX idx_pw_inventory_transactions_item_id ON public.power_washing_inventory_transactions(inventory_item_id);
CREATE INDEX idx_pw_inventory_vendors_shop_id ON public.power_washing_inventory_vendors(shop_id);

-- Enable RLS
ALTER TABLE public.power_washing_inventory_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_washing_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view their shop's inventory vendors"
  ON public.power_washing_inventory_vendors FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their shop's inventory vendors"
  ON public.power_washing_inventory_vendors FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their shop's inventory vendors"
  ON public.power_washing_inventory_vendors FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their shop's inventory vendors"
  ON public.power_washing_inventory_vendors FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for inventory
CREATE POLICY "Users can view their shop's inventory"
  ON public.power_washing_inventory FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their shop's inventory"
  ON public.power_washing_inventory FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their shop's inventory"
  ON public.power_washing_inventory FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their shop's inventory"
  ON public.power_washing_inventory FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for transactions
CREATE POLICY "Users can view their inventory transactions"
  ON public.power_washing_inventory_transactions FOR SELECT
  USING (inventory_item_id IN (
    SELECT id FROM public.power_washing_inventory 
    WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert their inventory transactions"
  ON public.power_washing_inventory_transactions FOR INSERT
  WITH CHECK (inventory_item_id IN (
    SELECT id FROM public.power_washing_inventory 
    WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  ));

-- Create updated_at triggers
CREATE TRIGGER update_pw_inventory_updated_at
  BEFORE UPDATE ON public.power_washing_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pw_inventory_vendors_updated_at
  BEFORE UPDATE ON public.power_washing_inventory_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();