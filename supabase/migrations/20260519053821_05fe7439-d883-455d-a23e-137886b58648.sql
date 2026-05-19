
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_lookup_key text;

UPDATE public.subscription_plans SET stripe_lookup_key = 'bronze_monthly'   WHERE name = 'Bronze';
UPDATE public.subscription_plans SET stripe_lookup_key = 'silver_monthly'   WHERE name = 'Silver';
UPDATE public.subscription_plans SET stripe_lookup_key = 'gold_monthly'     WHERE name = 'Gold';
UPDATE public.subscription_plans SET stripe_lookup_key = 'platinum_monthly' WHERE name = 'Platinum';
UPDATE public.subscription_plans SET stripe_lookup_key = 'business_monthly' WHERE name = 'Business';

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_stripe_lookup_key_uidx
  ON public.subscription_plans (stripe_lookup_key) WHERE stripe_lookup_key IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx
  ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
