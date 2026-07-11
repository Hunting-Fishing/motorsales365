-- Create fuel_delivery_purchases table for BOL/inbound fuel tracking
CREATE TABLE public.fuel_delivery_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  
  -- Supplier/Vendor info
  vendor_name TEXT NOT NULL,
  vendor_account_number TEXT,
  
  -- BOL (Bill of Lading) info
  bol_number TEXT NOT NULL,
  po_number TEXT,
  
  -- Purchase details
  product_id UUID REFERENCES public.fuel_delivery_products(id),
  quantity_gallons NUMERIC NOT NULL,
  price_per_gallon NUMERIC NOT NULL,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity_gallons * price_per_gallon) STORED,
  taxes NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  total_cost NUMERIC,
  
  -- Receiving details
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date TIMESTAMP WITH TIME ZONE,
  received_by UUID REFERENCES public.profiles(id),
  truck_id UUID REFERENCES public.fuel_delivery_trucks(id),
  compartment_id UUID REFERENCES public.fuel_delivery_truck_compartments(id),
  
  -- Meter readings (for reconciliation)
  meter_start_reading NUMERIC,
  meter_end_reading NUMERIC,
  actual_gallons_received NUMERIC,
  variance_gallons NUMERIC GENERATED ALWAYS AS (actual_gallons_received - quantity_gallons) STORED,
  
  -- Terminal/pickup info
  terminal_name TEXT,
  terminal_location TEXT,
  rack_price NUMERIC,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'reconciled', 'disputed')),
  
  -- Documents
  bol_document_url TEXT,
  invoice_document_url TEXT,
  
  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_due_date DATE,
  payment_date DATE,
  payment_reference TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create indexes
CREATE INDEX idx_fuel_purchases_shop ON public.fuel_delivery_purchases(shop_id);
CREATE INDEX idx_fuel_purchases_bol ON public.fuel_delivery_purchases(bol_number);
CREATE INDEX idx_fuel_purchases_vendor ON public.fuel_delivery_purchases(vendor_name);
CREATE INDEX idx_fuel_purchases_date ON public.fuel_delivery_purchases(purchase_date);
CREATE INDEX idx_fuel_purchases_status ON public.fuel_delivery_purchases(status);

-- Enable RLS
ALTER TABLE public.fuel_delivery_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view purchases for their shop"
  ON public.fuel_delivery_purchases
  FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create purchases for their shop"
  ON public.fuel_delivery_purchases
  FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update purchases for their shop"
  ON public.fuel_delivery_purchases
  FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete purchases for their shop"
  ON public.fuel_delivery_purchases
  FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_fuel_purchases_updated_at
  BEFORE UPDATE ON public.fuel_delivery_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.fuel_delivery_purchases IS 'Tracks inbound fuel purchases/BOLs from suppliers';
COMMENT ON COLUMN public.fuel_delivery_purchases.bol_number IS 'Bill of Lading number from supplier';
COMMENT ON COLUMN public.fuel_delivery_purchases.rack_price IS 'Terminal rack price at time of purchase';
COMMENT ON COLUMN public.fuel_delivery_purchases.variance_gallons IS 'Difference between ordered and actual received gallons';