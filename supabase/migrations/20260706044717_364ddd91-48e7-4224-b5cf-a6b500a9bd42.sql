ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intent_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intent_evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;