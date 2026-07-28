
-- 1. Application fields
ALTER TABLE public.partner_program_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS school_or_company text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wants_shop_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_early_release boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_early_release_at timestamptz;

-- 2. Partner settings
ALTER TABLE public.partner_program_partners
  ADD COLUMN IF NOT EXISTS shop_manager_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS signup_bounty_php numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS business_bounty_php numeric NOT NULL DEFAULT 10;

-- 3. Allow bounty event types
ALTER TABLE public.partner_program_commission_events
  DROP CONSTRAINT IF EXISTS partner_program_commission_events_event_type_check;
ALTER TABLE public.partner_program_commission_events
  ADD CONSTRAINT partner_program_commission_events_event_type_check
  CHECK (event_type = ANY (ARRAY['seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','user_signup','business_signup','other']));

-- Idempotency for automated bounties
CREATE UNIQUE INDEX IF NOT EXISTS pp_commission_events_source_uniq
  ON public.partner_program_commission_events (partner_id, event_type, source_ref)
  WHERE source_ref IS NOT NULL;

-- 4. Bounty award helper
CREATE OR REPLACE FUNCTION public.pp_award_bounty(_code text, _event_type text, _source_ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  amt numeric;
BEGIN
  IF _code IS NULL OR btrim(_code) = '' THEN RETURN; END IF;
  SELECT id, signup_bounty_php, business_bounty_php INTO p
  FROM public.partner_program_partners
  WHERE lower(referral_code) = lower(btrim(_code)) AND active = true
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  amt := CASE WHEN _event_type = 'business_signup' THEN p.business_bounty_php ELSE p.signup_bounty_php END;
  IF amt IS NULL OR amt <= 0 THEN RETURN; END IF;
  INSERT INTO public.partner_program_commission_events
    (partner_id, event_type, amount_php, commission_php, status, source_ref, notes)
  VALUES (p.id, _event_type, 0, amt, 'pending', _source_ref,
          CASE WHEN _event_type = 'business_signup' THEN 'Business sign-up bounty' ELSE 'User sign-up bounty' END)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 5. Trigger: user signup bounty
CREATE OR REPLACE FUNCTION public.pp_user_signup_bounty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credited_referral_code IS NOT NULL THEN
    PERFORM public.pp_award_bounty(NEW.credited_referral_code, 'user_signup', 'signup:' || NEW.user_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pp_user_signup_bounty ON public.user_referrals;
CREATE TRIGGER trg_pp_user_signup_bounty
AFTER INSERT OR UPDATE OF credited_referral_code ON public.user_referrals
FOR EACH ROW EXECUTE FUNCTION public.pp_user_signup_bounty();

-- 6. Trigger: business signup bounty
CREATE OR REPLACE FUNCTION public.pp_business_signup_bounty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  SELECT credited_referral_code INTO code FROM public.user_referrals WHERE user_id = NEW.owner_id LIMIT 1;
  IF code IS NOT NULL THEN
    PERFORM public.pp_award_bounty(code, 'business_signup', 'business:' || NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pp_business_signup_bounty ON public.businesses;
CREATE TRIGGER trg_pp_business_signup_bounty
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.pp_business_signup_bounty();

-- 7. Applicants can read their own application
DROP POLICY IF EXISTS "Applicants read own partner application" ON public.partner_program_applications;
CREATE POLICY "Applicants read own partner application"
ON public.partner_program_applications
FOR SELECT TO authenticated
USING (user_id = auth.uid());
