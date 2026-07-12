CREATE OR REPLACE FUNCTION public.mark_message_notifications_read(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_notifications
     SET read_at = COALESCE(read_at, now())
   WHERE user_id = auth.uid()
     AND category = 'messages'
     AND entity_type = 'message'
     AND entity_id = ANY(p_message_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_notifications_read(uuid[]) TO authenticated;