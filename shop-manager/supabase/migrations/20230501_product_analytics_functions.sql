
-- Function to get product interactions by category
CREATE OR REPLACE FUNCTION public.get_product_interactions_by_category()
RETURNS TABLE (
  name TEXT,
  views BIGINT,
  clicks BIGINT,
  saves BIGINT,
  shares BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.category as name,
    COUNT(CASE WHEN pa.interaction_type = 'view' THEN 1 END) as views,
    COUNT(CASE WHEN pa.interaction_type = 'click' THEN 1 END) as clicks,
    COUNT(CASE WHEN pa.interaction_type = 'save' THEN 1 END) as saves,
    COUNT(CASE WHEN pa.interaction_type = 'share' THEN 1 END) as shares
  FROM 
    public.product_analytics pa
  GROUP BY 
    pa.category
  ORDER BY 
    views DESC;
END;
$$;
