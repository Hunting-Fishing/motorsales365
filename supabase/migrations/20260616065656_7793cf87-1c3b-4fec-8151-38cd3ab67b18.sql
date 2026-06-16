
-- Lock down contact_value columns from broad role-level SELECT.
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon, authenticated, PUBLIC;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon, authenticated, PUBLIC;

-- Re-grant all other columns explicitly to authenticated/anon so existing queries continue to work.
-- (Default table-level SELECT grants remain for all other columns; we only revoked the single column.)

-- Provide a controlled accessor for owners / responders who legitimately need the contact value.
CREATE OR REPLACE FUNCTION public.get_wanted_post_contact(_post_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wp.contact_value
  FROM public.wanted_posts wp
  WHERE wp.id = _post_id
    AND wp.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_wanted_post_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_post_contact(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_wanted_response_contact(_response_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.contact_value
  FROM public.wanted_post_responses r
  LEFT JOIN public.wanted_posts wp ON wp.id = r.wanted_post_id
  WHERE r.id = _response_id
    AND (r.user_id = auth.uid() OR wp.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_wanted_response_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_response_contact(uuid) TO authenticated;
