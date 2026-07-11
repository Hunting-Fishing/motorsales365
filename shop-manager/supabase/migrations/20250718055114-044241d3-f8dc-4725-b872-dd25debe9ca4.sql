-- Add tax settings functionality to company_settings table
-- This allows companies to configure labor and parts tax rates

-- Insert default tax settings for existing shops
INSERT INTO public.company_settings (shop_id, settings_key, settings_value)
SELECT 
  s.id as shop_id,
  'tax_settings' as settings_key,
  jsonb_build_object(
    'labor_tax_rate', 0.0,
    'parts_tax_rate', 0.0,
    'tax_calculation_method', 'separate',
    'tax_display_method', 'exclusive',
    'tax_exempt_customers', '[]'::jsonb,
    'apply_tax_to_labor', true,
    'apply_tax_to_parts', true,
    'tax_description', 'Tax'
  ) as settings_value
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings cs 
  WHERE cs.shop_id = s.id AND cs.settings_key = 'tax_settings'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_settings_tax 
ON public.company_settings(shop_id, settings_key) 
WHERE settings_key = 'tax_settings';