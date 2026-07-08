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
      'seller_type', NULL::text, NEW.seller_type::text,
      'profile', NEW.id::text
    );
  ELSIF NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'seller_type_changed',
      'seller_type', OLD.seller_type::text, NEW.seller_type::text,
      'profile', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;