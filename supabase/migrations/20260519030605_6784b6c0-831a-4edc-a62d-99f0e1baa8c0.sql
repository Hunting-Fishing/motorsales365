ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gross_amount_php numeric(10,2),
  ADD COLUMN IF NOT EXISTS prorated_credit_php numeric(10,2),
  ADD COLUMN IF NOT EXISTS previous_plan text,
  ADD COLUMN IF NOT EXISTS new_plan text;