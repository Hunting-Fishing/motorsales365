-- Phase 7.2: Fix Database Function Type Issues and Add Missing Functions

-- Drop and recreate get_popular_products with correct return type
DROP FUNCTION IF EXISTS public.get_popular_products(integer, integer);

-- Fixed function to get popular products based on analytics with correct UUID return type
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
    pa.product_id::UUID,
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

-- Add function to get product interactions by category for better analytics
CREATE OR REPLACE FUNCTION public.get_product_interactions_by_category()
RETURNS TABLE (
  category TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  total_cart_adds BIGINT,
  total_saves BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pa.category, 'Uncategorized') as category,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END), 0) as total_views,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'click' THEN 1 ELSE 0 END), 0) as total_clicks,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'add_to_cart' THEN 1 ELSE 0 END), 0) as total_cart_adds,
    COALESCE(SUM(CASE WHEN pa.interaction_type = 'save' THEN 1 ELSE 0 END), 0) as total_saves
  FROM public.product_analytics pa
  GROUP BY pa.category
  ORDER BY total_views DESC;
END;
$$;

-- Add function to get recently viewed products for a user/session
CREATE OR REPLACE FUNCTION public.get_recently_viewed_products(
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (pa.product_id)
    pa.product_id::UUID,
    pa.product_name,
    pa.category,
    pa.created_at as viewed_at
  FROM public.product_analytics pa
  WHERE 
    pa.interaction_type = 'view' AND
    (
      (p_user_id IS NOT NULL AND pa.user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND pa.session_id = p_session_id)
    )
  ORDER BY pa.product_id, pa.created_at DESC
  LIMIT result_limit;
END;
$$;