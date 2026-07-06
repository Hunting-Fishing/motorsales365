-- Deterministic derivation shared by triggers + admin recompute UI.
CREATE OR REPLACE FUNCTION public.derive_signup_intent(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_type text;
  _owns_business boolean;
BEGIN
  SELECT seller_type INTO _seller_type FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id)
    INTO _owns_business;

  IF lower(coalesce(_seller_type, '')) = 'repair_shop' THEN
    RETURN 'service_provider';
  ELSIF lower(coalesce(_seller_type, '')) IN ('dealer', 'insurance') THEN
    RETURN 'business';
  ELSIF _owns_business THEN
    RETURN 'business';
  ELSE
    RETURN 'buyer';
  END IF;
END;
$$;

-- Writes the derived value only when it actually differs.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next text;
  _prev text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;
  END IF;
END;
$$;

-- 1) Profile seller_type / seller_type_confirmed_at changes
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.seller_type IS DISTINCT FROM OLD.seller_type) THEN
    PERFORM public.recompute_signup_intent(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_recompute_intent ON public.profiles;
CREATE TRIGGER profiles_recompute_intent
AFTER INSERT OR UPDATE OF seller_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_recompute_intent();

-- 2) Business ownership add/remove/move
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(NEW.owner_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(OLD.owner_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(OLD.owner_id);
      PERFORM public.recompute_signup_intent(NEW.owner_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS businesses_recompute_intent ON public.businesses;
CREATE TRIGGER businesses_recompute_intent
AFTER INSERT OR UPDATE OF owner_id OR DELETE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.trg_businesses_recompute_intent();

-- 3) Partner Program accreditation add/activate/revoke — recompute anyone
--    currently credited to that referral code so intent stays fresh even if
--    future derivation logic ever gates on accreditation.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _uid uuid;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS partners_recompute_intent ON public.partner_program_partners;
CREATE TRIGGER partners_recompute_intent
AFTER INSERT OR UPDATE OF active, referral_code OR DELETE
ON public.partner_program_partners
FOR EACH ROW EXECUTE FUNCTION public.trg_partners_recompute_intent();

-- Backfill: recompute every profile once so existing badges match the derived value.
DO $$
DECLARE
  _uid uuid;
BEGIN
  FOR _uid IN SELECT id FROM public.profiles LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
END $$;