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

-- RLS policies for product_price_history - allow authenticated users to view and insert
CREATE POLICY "Authenticated users can view product price history" 
ON public.product_price_history FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert product price history" 
ON public.product_price_history FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);