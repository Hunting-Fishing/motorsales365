-- Create product_price_history table for tracking price changes
CREATE TABLE public.product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS on product_price_history
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_price_history
CREATE POLICY "Users can view product price history from their shop" 
ON public.product_price_history FOR SELECT 
USING (product_id IN (
  SELECT products.id 
  FROM products 
  WHERE products.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can insert product price history for their shop" 
ON public.product_price_history FOR INSERT 
WITH CHECK (product_id IN (
  SELECT products.id 
  FROM products 
  WHERE products.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));