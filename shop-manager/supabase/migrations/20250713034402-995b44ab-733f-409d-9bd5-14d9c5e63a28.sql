-- Phase 7: Shopping Page Enhancement Database Functions

-- Function to track product interactions with enhanced analytics
CREATE OR REPLACE FUNCTION public.track_product_interaction(
  p_product_id UUID,
  p_product_name TEXT,
  p_category TEXT DEFAULT NULL,
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
  WHERE pa.created_at >= (CURRENT_TIMESTAMP - INTERVAL '%s days', days_back)
  GROUP BY pa.product_id, pa.product_name
  ORDER BY score DESC, total_interactions DESC
  LIMIT result_limit;
END;
$$;

-- Function to get product analytics by category
CREATE OR REPLACE FUNCTION public.get_product_interactions_by_category()
RETURNS TABLE (
  category TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  total_cart_adds BIGINT,
  avg_engagement_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.category,
    SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END) as total_views,
    SUM(CASE WHEN pa.interaction_type = 'click' THEN 1 ELSE 0 END) as total_clicks,
    SUM(CASE WHEN pa.interaction_type = 'add_to_cart' THEN 1 ELSE 0 END) as total_cart_adds,
    CASE 
      WHEN SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END) > 0 THEN
        (SUM(CASE WHEN pa.interaction_type != 'view' THEN 1 ELSE 0 END)::NUMERIC / 
         SUM(CASE WHEN pa.interaction_type = 'view' THEN 1 ELSE 0 END)::NUMERIC) * 100
      ELSE 0
    END as avg_engagement_rate
  FROM public.product_analytics pa
  WHERE pa.category IS NOT NULL
  GROUP BY pa.category
  ORDER BY total_views DESC;
END;
$$;

-- Function to search products with analytics integration
CREATE OR REPLACE FUNCTION public.search_products_enhanced(
  p_search_term TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_manufacturer TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  category_id UUID,
  manufacturer TEXT,
  average_rating NUMERIC,
  review_count INTEGER,
  stock_quantity INTEGER,
  is_featured BOOLEAN,
  is_bestseller BOOLEAN,
  popularity_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category_id,
    p.manufacturer,
    p.average_rating,
    p.review_count,
    p.stock_quantity,
    p.is_featured,
    p.is_bestseller,
    COALESCE(
      (SELECT SUM(
        CASE pa.interaction_type
          WHEN 'view' THEN 1
          WHEN 'click' THEN 2
          WHEN 'add_to_cart' THEN 5
          WHEN 'save' THEN 3
          ELSE 1
        END
      ) FROM public.product_analytics pa 
       WHERE pa.product_id = p.id 
       AND pa.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'), 0
    )::NUMERIC as popularity_score
  FROM public.products p
  WHERE 
    p.is_approved = true
    AND (p_search_term IS NULL OR 
         p.name ILIKE '%' || p_search_term || '%' OR
         p.description ILIKE '%' || p_search_term || '%' OR
         p.manufacturer ILIKE '%' || p_search_term || '%')
    AND (p_category IS NULL OR 
         EXISTS(SELECT 1 FROM public.product_categories pc 
                WHERE pc.id = p.category_id AND pc.name = p_category))
    AND (p_manufacturer IS NULL OR p.manufacturer ILIKE '%' || p_manufacturer || '%')
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_min_rating IS NULL OR p.average_rating >= p_min_rating)
  ORDER BY 
    popularity_score DESC,
    p.is_featured DESC,
    p.is_bestseller DESC,
    p.average_rating DESC,
    p.name ASC
  LIMIT p_limit
  OFFSET p_offset;
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

-- Function to get product recommendations based on user behavior
CREATE OR REPLACE FUNCTION public.get_product_recommendations(
  p_user_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  reason TEXT,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  RETURN QUERY
  -- Collaborative filtering: products viewed by users with similar interests
  WITH user_interests AS (
    SELECT DISTINCT pa1.product_id, pa1.category
    FROM public.product_analytics pa1
    WHERE pa1.user_id = user_id_val
    AND pa1.interaction_type IN ('view', 'click', 'add_to_cart', 'save')
    AND pa1.created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
  ),
  similar_users AS (
    SELECT pa2.user_id, COUNT(*) as common_interests
    FROM public.product_analytics pa2
    JOIN user_interests ui ON pa2.product_id = ui.product_id
    WHERE pa2.user_id != user_id_val
    AND pa2.interaction_type IN ('view', 'click', 'add_to_cart', 'save')
    GROUP BY pa2.user_id
    HAVING COUNT(*) >= 2
    ORDER BY common_interests DESC
    LIMIT 10
  ),
  recommendations AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      'Users with similar interests also viewed this' as reason,
      (COUNT(*) * 0.8)::NUMERIC as confidence_score
    FROM public.products p
    JOIN public.product_analytics pa3 ON pa3.product_id = p.id
    JOIN similar_users su ON su.user_id = pa3.user_id
    WHERE p.id NOT IN (SELECT product_id FROM user_interests)
    AND p.is_approved = true
    AND p.stock_quantity > 0
    GROUP BY p.id, p.name
    
    UNION ALL
    
    -- Category-based recommendations
    SELECT 
      p2.id as product_id,
      p2.name as product_name,
      'Related to your browsing history' as reason,
      0.6::NUMERIC as confidence_score
    FROM public.products p2
    JOIN user_interests ui2 ON p2.category_id IN (
      SELECT pc.id FROM public.product_categories pc WHERE pc.name = ui2.category
    )
    WHERE p2.id NOT IN (SELECT product_id FROM user_interests)
    AND p2.id != COALESCE(p_product_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND p2.is_approved = true
    AND p2.stock_quantity > 0
    AND p2.is_featured = true
  )
  SELECT r.product_id, r.product_name, r.reason, r.confidence_score
  FROM recommendations r
  ORDER BY r.confidence_score DESC, random()
  LIMIT p_limit;
END;
$$;