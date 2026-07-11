-- Create a function to get business constants since types aren't generated yet
CREATE OR REPLACE FUNCTION public.get_business_constants()
RETURNS TABLE(
  category TEXT,
  key TEXT,
  label TEXT,
  value TEXT,
  description TEXT,
  sort_order INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    category,
    key,
    label,
    value,
    description,
    sort_order
  FROM public.business_constants
  WHERE is_active = true
  ORDER BY category, sort_order;
$$;