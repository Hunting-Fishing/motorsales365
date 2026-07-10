
-- 1. Club membership roster: drop broad public read policy.
-- Public UI now shows only the aggregate member_count from the clubs row.
DROP POLICY IF EXISTS "Public reads members of active clubs" ON public.club_members;

-- 2. Franchise: replace spoofable JWT-email match with a verified auth.users email join.
CREATE OR REPLACE FUNCTION public.current_user_owns_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(coalesce(_email, ''))
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owns_email(text) TO authenticated;

DROP POLICY IF EXISTS "Owners view their own applications" ON public.franchise_applications;
CREATE POLICY "Owners view their own applications"
ON public.franchise_applications
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR public.current_user_owns_email(contact_email)
  )
);

DROP POLICY IF EXISTS "Applicants and admins view messages" ON public.franchise_application_messages;
CREATE POLICY "Applicants and admins view messages"
ON public.franchise_application_messages
FOR SELECT
TO authenticated
USING (
  (
    NOT is_internal
    AND EXISTS (
      SELECT 1
      FROM public.franchise_applications a
      WHERE a.id = franchise_application_messages.application_id
        AND (
          a.user_id = auth.uid()
          OR public.current_user_owns_email(a.contact_email)
        )
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
