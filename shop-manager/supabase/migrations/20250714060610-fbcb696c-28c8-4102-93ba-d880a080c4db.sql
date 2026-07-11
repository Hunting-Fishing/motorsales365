-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_popular_products(integer, integer);
DROP FUNCTION IF EXISTS public.get_popular_products(days_back integer, result_limit integer);

-- Create the get_popular_products RPC function with correct signature
CREATE OR REPLACE FUNCTION public.get_popular_products(days_back integer DEFAULT 7, result_limit integer DEFAULT 10)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  interaction_count bigint,
  view_count bigint,
  cart_add_count bigint,
  save_count bigint,
  click_count bigint,
  average_rating numeric,
  review_count integer,
  image_url text,
  price numeric,
  category text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.title as product_name,
    COALESCE(COUNT(pa.*), 0) as interaction_count,
    COALESCE(COUNT(pa.*) FILTER (WHERE pa.interaction_type = 'view'), 0) as view_count,
    COALESCE(COUNT(pa.*) FILTER (WHERE pa.interaction_type = 'add_to_cart'), 0) as cart_add_count,
    COALESCE(COUNT(pa.*) FILTER (WHERE pa.interaction_type = 'save'), 0) as save_count,
    COALESCE(COUNT(pa.*) FILTER (WHERE pa.interaction_type = 'click'), 0) as click_count,
    COALESCE(p.average_rating, 0) as average_rating,
    COALESCE(p.review_count, 0) as review_count,
    p.image_url,
    p.price,
    COALESCE(pc.name, 'Uncategorized') as category
  FROM products p
  LEFT JOIN product_analytics pa ON p.id::text = pa.product_id 
    AND pa.created_at >= NOW() - INTERVAL '1 day' * days_back
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.is_approved = true
  GROUP BY p.id, p.title, p.average_rating, p.review_count, p.image_url, p.price, pc.name
  ORDER BY interaction_count DESC, view_count DESC
  LIMIT result_limit;
END;
$$;