-- Phase 14: Create Missing Tables and RPC Functions

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

-- Update name column in products (it already exists but may be null)
UPDATE public.products 
SET name = title 
WHERE name IS NULL AND title IS NOT NULL;

UPDATE public.products 
SET name = 'Unnamed Product'
WHERE name IS NULL;

ALTER TABLE public.products 
ALTER COLUMN name SET NOT NULL;

-- Add missing reviewer_name column to product_reviews
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Fix order_items relationships and add proper product data storage
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_image_url TEXT,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Create missing RPC functions for recently viewed products
CREATE OR REPLACE FUNCTION public.get_recently_viewed_products(user_id_param uuid, limit_count integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  name text,
  title text,
  price numeric,
  image_url text,
  average_rating numeric,
  viewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.title,
    p.price,
    p.image_url,
    p.average_rating,
    rv.viewed_at
  FROM public.recently_viewed rv
  JOIN public.products p ON p.id = rv.product_id
  WHERE rv.user_id = user_id_param
  ORDER BY rv.viewed_at DESC
  LIMIT limit_count;
END;
$$;

-- Create function for popular products based on views and orders
CREATE OR REPLACE FUNCTION public.get_popular_products(limit_count integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  name text,
  title text,
  price numeric,
  image_url text,
  average_rating numeric,
  view_count bigint,
  order_count bigint,
  popularity_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.title,
    p.price,
    p.image_url,
    p.average_rating,
    COALESCE(view_counts.view_count, 0) as view_count,
    COALESCE(order_counts.order_count, 0) as order_count,
    (COALESCE(view_counts.view_count, 0) * 0.3 + COALESCE(order_counts.order_count, 0) * 0.7) as popularity_score
  FROM public.products p
  LEFT JOIN (
    SELECT product_id, COUNT(*) as view_count
    FROM public.recently_viewed
    WHERE viewed_at > NOW() - INTERVAL '30 days'
    GROUP BY product_id
  ) view_counts ON p.id = view_counts.product_id
  LEFT JOIN (
    SELECT product_id, COUNT(*) as order_count
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.created_at > NOW() - INTERVAL '30 days'
    GROUP BY product_id
  ) order_counts ON p.id = order_counts.product_id
  WHERE p.is_available = true
  ORDER BY popularity_score DESC
  LIMIT limit_count;
END;
$$;

-- Create function to record product views
CREATE OR REPLACE FUNCTION public.record_product_view(product_id_param uuid, user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.recently_viewed (product_id, user_id, viewed_at)
  VALUES (product_id_param, user_id_param, NOW())
  ON CONFLICT (product_id, user_id) 
  DO UPDATE SET viewed_at = NOW();
END;
$$;

-- Create function to update order status with history
CREATE OR REPLACE FUNCTION public.update_order_status(
  order_id_param uuid, 
  new_status text, 
  notes_param text DEFAULT NULL,
  updated_by_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the order status
  UPDATE public.orders 
  SET status = new_status, updated_at = NOW()
  WHERE id = order_id_param;
  
  -- Insert status history
  INSERT INTO public.order_status_history (
    order_id, status, notes, changed_by, changed_at
  ) VALUES (
    order_id_param, new_status, notes_param, updated_by_param, NOW()
  );
END;
$$;

-- Create function to get order with items
CREATE OR REPLACE FUNCTION public.get_order_with_items(order_id_param uuid)
RETURNS TABLE(
  order_id uuid,
  order_number text,
  status text,
  total_amount numeric,
  user_id uuid,
  created_at timestamp with time zone,
  item_id uuid,
  product_id uuid,
  product_name text,
  quantity integer,
  unit_price numeric,
  total_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.order_number,
    o.status,
    o.total_amount,
    o.user_id,
    o.created_at,
    oi.id as item_id,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) as total_price
  FROM public.orders o
  LEFT JOIN public.order_items oi ON o.id = oi.order_id
  WHERE o.id = order_id_param;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed 
ON public.recently_viewed(user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON public.orders(user_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON public.order_items(order_id, product_id);

CREATE INDEX IF NOT EXISTS idx_products_available_price 
ON public.products(is_available, price) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved 
ON public.product_reviews(product_id, is_approved) WHERE is_approved = true;