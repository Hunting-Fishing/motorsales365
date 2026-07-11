-- Create shopping_carts table for database persistence
CREATE TABLE IF NOT EXISTS public.shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cart_items table that references shopping_carts
ALTER TABLE public.cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;

ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_cart_id_fkey 
FOREIGN KEY (cart_id) REFERENCES public.shopping_carts(id) ON DELETE CASCADE;

-- Enable RLS on shopping_carts
ALTER TABLE public.shopping_carts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shopping_carts
CREATE POLICY "Users can view their own shopping carts" ON public.shopping_carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping carts" ON public.shopping_carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping carts" ON public.shopping_carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping carts" ON public.shopping_carts
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for shopping_carts updated_at
CREATE OR REPLACE FUNCTION update_shopping_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopping_carts_updated_at
  BEFORE UPDATE ON public.shopping_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_cart_timestamp();

-- Create orders table for checkout functionality
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  billing_address JSONB,
  order_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on orders and order_items
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for order_items
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Create trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || 
         lpad(nextval('order_number_seq')::text, 4, '0')
  INTO new_number;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;