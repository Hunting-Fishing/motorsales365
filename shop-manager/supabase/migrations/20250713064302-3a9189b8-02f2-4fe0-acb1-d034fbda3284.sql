-- Drop existing functions that conflict and recreate them
DROP FUNCTION IF EXISTS public.get_popular_products(integer, integer);
DROP FUNCTION IF EXISTS public.get_product_stats(text);
DROP FUNCTION IF EXISTS public.track_product_interaction(text, text, text, text, uuid, text, jsonb);

-- Function to add recently viewed products
CREATE OR REPLACE FUNCTION public.add_recently_viewed_product(
  p_product_id TEXT,
  p_product_name TEXT,
  p_product_image_url TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  user_id_val UUID;
  session_id_val TEXT;
BEGIN
  -- Get current user or use session-based tracking
  user_id_val := auth.uid();
  
  -- Generate session ID for anonymous users
  IF user_id_val IS NULL THEN
    session_id_val := gen_random_uuid()::text;
  END IF;
  
  -- Remove existing entry for this product and user/session to avoid duplicates
  DELETE FROM public.recently_viewed_products 
  WHERE product_id = p_product_id 
    AND (
      (user_id_val IS NOT NULL AND user_id = user_id_val) OR
      (user_id_val IS NULL AND session_id = session_id_val)
    );
  
  -- Insert new entry
  INSERT INTO public.recently_viewed_products (
    user_id, session_id, product_id, product_name, 
    product_image_url, category, viewed_at
  ) VALUES (
    user_id_val, session_id_val, p_product_id, p_product_name,
    p_product_image_url, p_category, NOW()
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to track product interactions with real data
CREATE OR REPLACE FUNCTION public.track_product_interaction(
  p_product_id TEXT,
  p_product_name TEXT,
  p_category TEXT DEFAULT NULL,
  p_interaction_type TEXT DEFAULT 'view',
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  final_user_id UUID;
  final_session_id TEXT;
BEGIN
  -- Use current auth user if no user_id provided
  final_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Generate session ID if none provided and no user
  IF final_user_id IS NULL AND p_session_id IS NULL THEN
    final_session_id := gen_random_uuid()::text;
  ELSE
    final_session_id := p_session_id;
  END IF;
  
  -- Insert interaction record
  INSERT INTO public.product_analytics (
    product_id, product_name, category, interaction_type,
    user_id, session_id, metadata, created_at
  ) VALUES (
    p_product_id, p_product_name, p_category, p_interaction_type,
    final_user_id, final_session_id, p_metadata, NOW()
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to get popular products based on real data
CREATE OR REPLACE FUNCTION public.get_popular_products(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  interaction_count BIGINT,
  view_count BIGINT,
  cart_add_count BIGINT,
  purchase_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.product_id,
    pa.product_name,
    COUNT(*) as interaction_count,
    COUNT(*) FILTER (WHERE pa.interaction_type = 'view') as view_count,
    COUNT(*) FILTER (WHERE pa.interaction_type = 'add_to_cart') as cart_add_count,
    COUNT(*) FILTER (WHERE pa.interaction_type = 'purchase') as purchase_count
  FROM public.product_analytics pa
  WHERE pa.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY pa.product_id, pa.product_name
  ORDER BY interaction_count DESC, view_count DESC
  LIMIT result_limit;
END;
$$;

-- Function to get product stats with real data
CREATE OR REPLACE FUNCTION public.get_product_stats(
  p_product_id TEXT
)
RETURNS TABLE (
  total_views BIGINT,
  total_clicks BIGINT,
  total_cart_adds BIGINT,
  total_saves BIGINT,
  avg_rating NUMERIC,
  review_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(analytics_stats.views, 0) as total_views,
    COALESCE(analytics_stats.clicks, 0) as total_clicks,
    COALESCE(analytics_stats.cart_adds, 0) as total_cart_adds,
    COALESCE(analytics_stats.saves, 0) as total_saves,
    COALESCE(review_stats.avg_rating, 0) as avg_rating,
    COALESCE(review_stats.review_count, 0) as review_count
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE interaction_type = 'view') as views,
      COUNT(*) FILTER (WHERE interaction_type = 'click') as clicks,
      COUNT(*) FILTER (WHERE interaction_type = 'add_to_cart') as cart_adds,
      COUNT(*) FILTER (WHERE interaction_type = 'save') as saves
    FROM public.product_analytics 
    WHERE product_id = p_product_id
  ) analytics_stats
  CROSS JOIN (
    SELECT 
      AVG(rating) as avg_rating,
      COUNT(*) as review_count
    FROM public.product_reviews 
    WHERE product_id = p_product_id AND is_approved = true
  ) review_stats;
END;
$$;

-- Function to track search analytics
CREATE OR REPLACE FUNCTION public.track_search_analytics(
  p_query TEXT,
  p_results_count INTEGER,
  p_filters_used JSONB DEFAULT '{}',
  p_search_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.ai_search_analytics (
    query, user_id, results_count, filters_used, 
    search_time_ms, created_at
  ) VALUES (
    p_query, auth.uid(), p_results_count, p_filters_used,
    p_search_time_ms, NOW()
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to check if user purchased a product (for verified reviews)
CREATE OR REPLACE FUNCTION public.check_verified_purchase(
  p_user_id UUID,
  p_product_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has purchased this product
  RETURN EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    WHERE o.user_id = p_user_id 
      AND oi.product_id = p_product_id
      AND o.status = 'completed'
  );
END;
$$;