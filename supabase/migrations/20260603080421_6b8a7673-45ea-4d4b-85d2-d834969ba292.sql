CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags public read"
ON public.feature_flags FOR SELECT
USING (true);

CREATE POLICY "feature_flags admin write"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_feature_flags_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.touch_feature_flags_updated_at();

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('payments.stripe',     true,  'Stripe payment rail (primary, in-house gateway)'),
  ('payments.paymongo',   false, 'PayMongo rail — coming soon, in-house only'),
  ('payments.xendit',     false, 'Xendit rail — coming soon, in-house only'),
  ('boost.escrow',        false, 'Escrowed boost listings'),
  ('subscriptions.annual',true,  'Annual subscription discount plans')
ON CONFLICT (key) DO NOTHING;