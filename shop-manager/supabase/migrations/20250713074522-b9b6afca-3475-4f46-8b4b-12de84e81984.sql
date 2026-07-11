-- Phase 14: Create Missing Tables and Database Fixes

-- Create recently_viewed table for tracking product views
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on recently_viewed
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recently_viewed
CREATE POLICY "Users can view their own recently viewed products" ON public.recently_viewed
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recently viewed products" ON public.recently_viewed
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recently viewed products" ON public.recently_viewed
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recently viewed products" ON public.recently_viewed
FOR DELETE USING (user_id = auth.uid());

-- Add missing reviewer_name column to product_reviews
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Add name column to products table (populate from title)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing products to have name from title
UPDATE public.products 
SET name = title 
WHERE name IS NULL AND title IS NOT NULL;

-- Update products that don't have title either
UPDATE public.products 
SET name = 'Unnamed Product'
WHERE name IS NULL;

-- Make name not null going forward
ALTER TABLE public.products 
ALTER COLUMN name SET NOT NULL;

-- Fix order_items relationships and add proper product data storage
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_image_url TEXT,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed 
ON public.recently_viewed(user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON public.orders(user_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON public.order_items(order_id, product_id);

CREATE INDEX IF NOT EXISTS idx_products_active_price 
ON public.products(is_active, price) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved 
ON public.product_reviews(product_id, is_approved) WHERE is_approved = true;