
REVOKE EXECUTE ON FUNCTION public.enforce_tow_status_transitions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tow_status_change() FROM PUBLIC, anon, authenticated;
