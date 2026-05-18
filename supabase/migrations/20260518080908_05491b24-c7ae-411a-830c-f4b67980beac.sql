ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_intent text,
  ADD COLUMN IF NOT EXISTS signup_city text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_signup_intent_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_signup_intent_check
  CHECK (signup_intent IS NULL OR signup_intent IN ('buyer','private_seller','business','service_provider'));