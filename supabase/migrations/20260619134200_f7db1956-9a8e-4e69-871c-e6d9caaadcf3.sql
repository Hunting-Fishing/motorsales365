
ALTER TABLE IF EXISTS public.share_kit_custom_templates RENAME TO qr_ad_templates;
ALTER TABLE IF EXISTS public.share_kit_builtin_categories RENAME TO qr_ad_builtin_categories;
ALTER TABLE IF EXISTS public.share_kit_hidden_builtins RENAME TO qr_ad_hidden_builtins;
ALTER TABLE IF EXISTS public.share_kit_layouts RENAME TO qr_ad_layouts;

-- Remap top-level categories on both tables
UPDATE public.qr_ad_templates SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

-- Remap subcategories
UPDATE public.qr_ad_templates SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;
