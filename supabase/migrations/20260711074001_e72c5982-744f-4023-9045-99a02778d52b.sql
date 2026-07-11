CREATE OR REPLACE FUNCTION public.mark_thread_unread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT max(created_at) INTO v_prev
    FROM public.chat_thread_messages
    WHERE thread_id = p_thread_id
      AND sender_id <> auth.uid();
  UPDATE public.chat_thread_members
    SET last_read_at = CASE
      WHEN v_prev IS NULL THEN NULL
      ELSE v_prev - interval '1 millisecond'
    END
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_thread_unread(uuid) TO authenticated;