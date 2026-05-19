ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_price_php numeric,
  ADD COLUMN IF NOT EXISTS boost_amount_php numeric,
  ADD COLUMN IF NOT EXISTS addons_amount_php numeric,
  ADD COLUMN IF NOT EXISTS addons_description text;