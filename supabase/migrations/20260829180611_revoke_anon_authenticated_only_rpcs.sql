-- Remove anonymous RPC exposure from operations that require an authenticated
-- actor by design. Keep authenticated/service-role grants unchanged.

revoke execute on function public.admin_pending_counts() from anon, public;
revoke execute on function public.create_group_chat(text, uuid[]) from anon, public;
revoke execute on function public.ensure_business_team_thread(uuid) from anon, public;
revoke execute on function public.generate_invoice_number() from anon, public;
revoke execute on function public.invite_to_thread(uuid, uuid[]) from anon, public;
revoke execute on function public.leave_thread(uuid) from anon, public;
revoke execute on function public.mark_conversation_unread(uuid, uuid) from anon, public;
revoke execute on function public.mark_message_notifications_read(uuid[]) from anon, public;
revoke execute on function public.mark_message_notifications_unread(uuid[]) from anon, public;
revoke execute on function public.mark_thread_read(uuid) from anon, public;
revoke execute on function public.mark_thread_unread(uuid) from anon, public;
revoke execute on function public.respond_to_thread_invite(uuid, boolean) from anon, public;
revoke execute on function public.recompute_signup_intent(uuid) from anon, public;
revoke execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) from anon, public;
revoke execute on function public.recompute_seller_rating(uuid) from anon, public;
revoke execute on function public.match_listing_to_parts_wanted(uuid) from anon, public;
revoke execute on function public.derive_signup_intent(uuid) from anon, public;

grant execute on function public.admin_pending_counts() to authenticated, service_role;
grant execute on function public.create_group_chat(text, uuid[]) to authenticated, service_role;
grant execute on function public.ensure_business_team_thread(uuid) to authenticated, service_role;
grant execute on function public.generate_invoice_number() to authenticated, service_role;
grant execute on function public.invite_to_thread(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.leave_thread(uuid) to authenticated, service_role;
grant execute on function public.mark_conversation_unread(uuid, uuid) to authenticated, service_role;
grant execute on function public.mark_message_notifications_read(uuid[]) to authenticated, service_role;
grant execute on function public.mark_message_notifications_unread(uuid[]) to authenticated, service_role;
grant execute on function public.mark_thread_read(uuid) to authenticated, service_role;
grant execute on function public.mark_thread_unread(uuid) to authenticated, service_role;
grant execute on function public.respond_to_thread_invite(uuid, boolean) to authenticated, service_role;
grant execute on function public.recompute_signup_intent(uuid) to authenticated, service_role;
grant execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.recompute_seller_rating(uuid) to authenticated, service_role;
grant execute on function public.match_listing_to_parts_wanted(uuid) to authenticated, service_role;
grant execute on function public.derive_signup_intent(uuid) to authenticated, service_role;
