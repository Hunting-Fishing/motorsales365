
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_seller_type seller_type := CASE
    WHEN v_intent IN ('business','service_provider') THEN 'dealer'::seller_type
    ELSE 'private'::seller_type
  END;
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN
    v_full := NEW.email;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone,
    signup_intent, signup_city,
    business_name, business_address, business_region, business_province, business_city,
    seller_type
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone,
    v_intent, v_city,
    v_business_name, v_business_address, v_region, v_province, v_city,
    v_seller_type
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $function$;
