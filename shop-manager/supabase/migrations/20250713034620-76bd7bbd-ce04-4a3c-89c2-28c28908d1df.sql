-- Phase 7: Shopping Page Enhancement Database Functions (Fixed with drops)

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_popular_products(integer, integer);

-- Function to track product interactions with enhanced analytics
CREATE OR REPLACE FUNCTION public.track_product_interaction(
  p_product_id UUID,
  p_product_name TEXT,
  p_category TEXT,
  p_interaction_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.product_analytics (
    product_id,
    product_name,
    category,
    interaction_type,
    user_id,
    session_id,
    metadata
  ) VALUES (
    p_product_id,
    p_product_name,
    p_category,
    p_interaction_type,
    COALESCE(p_user_id, auth.uid()),
    p_session_id,
    p_metadata
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to get comprehensive product statistics  
CREATE OR REPLACE FUNCTION public.get_product_stats(p_product_id UUID)
RETURNS TABLE (
  total_views BIGINT,
  total_clicks BIGINT,
  total_cart_adds BIGINT,
  total_saves BIGINT,
  avg_rating NUMERIC(3,2),
  review_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END), 0) as total_views,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'click' THEN 1 ELSE 0 END), 0) as total_clicks,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'add_to_cart' THEN 1 ELSE 0 END), 0) as total_cart_adds,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'save' THEN 1 ELSE 0 END), 0) as total_saves,
    COALESCE(p.average_rating, 0) as avg_rating,
    COALESCE(p.review_count, 0)::BIGINT as review_count
  FROM public.products p
  LEFT JOIN public.product_analytics pa ON pa.product_id = p.id
  WHERE p.id = p_product_id
  GROUP BY p.average_rating, p.review_count;
END;
$$;

-- Function to get popular products based on analytics
CREATE OR REPLACE FUNCTION public.get_popular_products(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  total_interactions BIGINT,
  score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.product_id,
    pa.product_name,
    COUNT(*) as total_interactions,
    -- Weighted scoring: views=1, clicks=2, cart_adds=5, saves=3
    SUM(
      CASE pa.interaction_type
        WHEN 'view' THEN 1
        WHEN 'click' THEN 2
        WHEN 'add_to_cart' THEN 5
        WHEN 'save' THEN 3
        ELSE 1
      END
    )::NUMERIC as score
  FROM public.product_analytics pa
  WHERE pa.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back)
  GROUP BY pa.product_id, pa.product_name
  ORDER BY score DESC, total_interactions DESC
  LIMIT result_limit;
END;
$$;

-- Function to check product inventory availability
CREATE OR REPLACE FUNCTION public.check_product_inventory(p_product_id UUID)
RETURNS TABLE (
  in_stock BOOLEAN,
  quantity INTEGER,
  low_stock_threshold INTEGER,
  is_low_stock BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stock_qty INTEGER;
  threshold INTEGER := 10; -- Default low stock threshold
BEGIN
  SELECT stock_quantity INTO stock_qty
  FROM public.products
  WHERE id = p_product_id;
  
  IF stock_qty IS NULL THEN
    stock_qty := 0;
  END IF;
  
  RETURN QUERY
  SELECT 
    (stock_qty > 0) as in_stock,
    stock_qty as quantity,
    threshold as low_stock_threshold,
    (stock_qty > 0 AND stock_qty <= threshold) as is_low_stock;
END;
$$;