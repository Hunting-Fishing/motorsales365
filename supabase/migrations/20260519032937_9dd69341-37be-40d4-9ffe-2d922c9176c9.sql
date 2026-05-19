ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS previous_plan_price_php numeric,
  ADD COLUMN IF NOT EXISTS credit_calculated_at timestamptz;