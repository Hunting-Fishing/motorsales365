
CREATE OR REPLACE FUNCTION public.get_referrer_contact(_code text)
RETURNS TABLE(full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.full_name, sr.email
  FROM public.staff_referrals sr
  WHERE sr.referral_code = _code
    AND sr.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_contact(text) TO anon, authenticated;
