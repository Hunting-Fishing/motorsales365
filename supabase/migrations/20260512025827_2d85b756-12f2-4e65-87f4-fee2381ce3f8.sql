REVOKE EXECUTE ON FUNCTION public.validate_ad_inquiry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_ad_inquiry_status_transitions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ad_inquiry_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ad_inquiry_reply() FROM PUBLIC, anon, authenticated;