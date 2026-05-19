ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone;

-- Backfill from existing data: set start = created_at where missing
UPDATE public.subscriptions
SET current_period_start = created_at
WHERE current_period_start IS NULL;