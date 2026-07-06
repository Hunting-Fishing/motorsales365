
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next, 'Automatic re-evaluation via database trigger',
         jsonb_build_object('source', 'auto'));
    EXCEPTION WHEN OTHERS THEN
      -- audit failure is non-fatal
      NULL;
    END;
  END IF;
END;
$function$;
