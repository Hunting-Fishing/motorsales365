DROP POLICY IF EXISTS "Applicants and admins post messages" ON public.franchise_application_messages;

CREATE POLICY "Applicants and admins post messages"
  ON public.franchise_application_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.franchise_applications a
          WHERE a.id = application_id
            AND (
              a.user_id = auth.uid()
              OR public.current_user_owns_email(a.contact_email)
            )
        )
      )
    )
  );