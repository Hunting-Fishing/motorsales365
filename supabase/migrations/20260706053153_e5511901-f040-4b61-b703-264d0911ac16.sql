
ALTER TABLE public.sales_rep_profiles
  ADD COLUMN IF NOT EXISTS commission_rate_override numeric NULL
  CHECK (commission_rate_override IS NULL OR (commission_rate_override >= 0 AND commission_rate_override <= 1));

INSERT INTO public.site_settings (key, value, label, description)
VALUES (
  'sales_rep_commission_rate',
  '0.10',
  'Sales rep default commission rate',
  'Default commission rate applied to sales-rep-attributed revenue when no per-rep override is set. Value is a decimal fraction (e.g. 0.10 = 10%).'
)
ON CONFLICT (key) DO NOTHING;
