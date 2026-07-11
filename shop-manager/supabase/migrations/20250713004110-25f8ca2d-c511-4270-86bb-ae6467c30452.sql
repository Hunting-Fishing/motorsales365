-- Create function for getting popular products
CREATE OR REPLACE FUNCTION get_popular_products(days_back integer DEFAULT 7, result_limit integer DEFAULT 10)
RETURNS TABLE(
  product_id text,
  product_name text,
  category text,
  interaction_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.product_id::text,
    pa.product_name,
    COALESCE(pa.category, 'Uncategorized') as category,
    COUNT(*) as interaction_count
  FROM 
    public.product_analytics pa
  WHERE 
    pa.interaction_type = 'view' AND
    pa.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY 
    pa.product_id, pa.product_name, pa.category
  ORDER BY 
    interaction_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function for analytics by category  
CREATE OR REPLACE FUNCTION get_product_interactions_by_category()
RETURNS TABLE(
  name text,
  views bigint,
  clicks bigint,
  saves bigint,
  shares bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pa.category, 'Uncategorized') as name,
    COUNT(CASE WHEN pa.interaction_type = 'view' THEN 1 END) as views,
    COUNT(CASE WHEN pa.interaction_type = 'click' THEN 1 END) as clicks,
    COUNT(CASE WHEN pa.interaction_type = 'save' THEN 1 END) as saves,
    COUNT(CASE WHEN pa.interaction_type = 'share' THEN 1 END) as shares
  FROM 
    public.product_analytics pa
  WHERE 
    pa.category IS NOT NULL
  GROUP BY 
    pa.category
  ORDER BY 
    views DESC;
END;
$$ LANGUAGE plpgsql;