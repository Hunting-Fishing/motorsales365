-- Create quotes table for fuel delivery
CREATE TABLE public.fuel_delivery_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.fuel_delivery_customers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.fuel_delivery_locations(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  converted_to_order_id UUID REFERENCES public.fuel_delivery_orders(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote line items
CREATE TABLE public.fuel_delivery_quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.fuel_delivery_quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.fuel_delivery_products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'gallons',
  unit_price DECIMAL(12,4) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_delivery_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_delivery_quote_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotes
CREATE POLICY "Users can view quotes" ON public.fuel_delivery_quotes FOR SELECT USING (true);
CREATE POLICY "Users can create quotes" ON public.fuel_delivery_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update quotes" ON public.fuel_delivery_quotes FOR UPDATE USING (true);
CREATE POLICY "Users can delete quotes" ON public.fuel_delivery_quotes FOR DELETE USING (true);

-- RLS policies for quote lines
CREATE POLICY "Users can view quote lines" ON public.fuel_delivery_quote_lines FOR SELECT USING (true);
CREATE POLICY "Users can create quote lines" ON public.fuel_delivery_quote_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update quote lines" ON public.fuel_delivery_quote_lines FOR UPDATE USING (true);
CREATE POLICY "Users can delete quote lines" ON public.fuel_delivery_quote_lines FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_fuel_delivery_quotes_shop ON public.fuel_delivery_quotes(shop_id);
CREATE INDEX idx_fuel_delivery_quotes_customer ON public.fuel_delivery_quotes(customer_id);
CREATE INDEX idx_fuel_delivery_quotes_status ON public.fuel_delivery_quotes(status);
CREATE INDEX idx_fuel_delivery_quote_lines_quote ON public.fuel_delivery_quote_lines(quote_id);