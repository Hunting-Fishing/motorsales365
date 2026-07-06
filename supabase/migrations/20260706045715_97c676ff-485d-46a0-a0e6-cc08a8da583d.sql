
-- Extend recompute_signup_intent to accept trigger-source context and record it in the audit metadata.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(
  _user_id uuid,
  _trigger_source text DEFAULT NULL,
  _trigger_field text DEFAULT NULL,
  _trigger_old text DEFAULT NULL,
  _trigger_new text DEFAULT NULL,
  _trigger_entity_type text DEFAULT NULL,
  _trigger_entity_id text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next text;
  _prev text;
  _meta jsonb;
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

    _meta := jsonb_build_object('source', 'auto');
    IF _trigger_source IS NOT NULL THEN
      _meta := _meta || jsonb_build_object('trigger', _trigger_source);
    END IF;
    IF _trigger_field IS NOT NULL THEN
      _meta := _meta || jsonb_build_object(
        'changed_field', _trigger_field,
        'changed_old', _trigger_old,
        'changed_new', _trigger_new
      );
    END IF;

    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note,
         entity_type, entity_id, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next,
         COALESCE(
           'Automatic re-evaluation via database trigger (' || _trigger_source || ')',
           'Automatic re-evaluation via database trigger'),
         _trigger_entity_type, _trigger_entity_id, _meta);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$function$;

-- Profile seller_type change: capture old/new seller_type.
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'profile_insert',
      'seller_type', NULL, NEW.seller_type,
      'profile', NEW.id::text
    );
  ELSIF NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'seller_type_changed',
      'seller_type', OLD.seller_type, NEW.seller_type,
      'profile', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Business ownership changes: capture which business drove it.
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.owner_id,
      'business_added',
      'owns_business', 'false', 'true',
      'business', NEW.id::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(
      OLD.owner_id,
      'business_removed',
      'owns_business', 'true', 'false',
      'business', OLD.id::text
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(
        OLD.owner_id,
        'business_owner_changed',
        'owns_business', 'true', 'false',
        'business', OLD.id::text
      );
      PERFORM public.recompute_signup_intent(
        NEW.owner_id,
        'business_owner_changed',
        'owns_business', 'false', 'true',
        'business', NEW.id::text
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Partner program referral changes: capture the referral code that drove it.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _uid uuid;
  _src text;
  _old_code text;
  _new_code text;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    _src := 'partner_added';
    _old_code := NULL;
    _new_code := NEW.referral_code;
  ELSIF TG_OP = 'DELETE' THEN
    _src := 'partner_removed';
    _old_code := OLD.referral_code;
    _new_code := NULL;
  ELSE
    _src := 'partner_updated';
    _old_code := OLD.referral_code;
    _new_code := NEW.referral_code;
  END IF;

  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(
      _uid,
      _src,
      'referral_code', _old_code, _new_code,
      'partner_program_partner', COALESCE(NEW.id, OLD.id)::text
    );
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
