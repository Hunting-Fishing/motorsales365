
-- Fix category group assignments for categories that ended up in "Other"
UPDATE public.export_product_categories SET group_name = 'Food & Agriculture' WHERE slug IN ('spices', 'agriculture');
UPDATE public.export_product_categories SET group_name = 'Industrial' WHERE slug IN ('minerals', 'machinery', 'electronics', 'packaging');
UPDATE public.export_product_categories SET group_name = 'Consumer Goods' WHERE slug IN ('textiles', 'handicrafts', 'pharma');
