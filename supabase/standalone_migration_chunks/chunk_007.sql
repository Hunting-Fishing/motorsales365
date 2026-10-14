
-- ============================================================================
-- SOURCE MIGRATION: 20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql
-- ============================================================================
-- 1. Views: run as the invoking user, not the definer
ALTER VIEW public.active_ads_public SET (security_invoker = true);
ALTER VIEW public.public_listing_verification_status SET (security_invoker = true);

-- 2. Fix mutable search_path on all our own functions (skip extension-owned)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname IN ('public','shop_manager')
      AND d.objid IS NULL
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
      ))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, shop_manager, pg_temp', r.sig);
  END LOOP;
END $$;

-- 3. Lock down function EXECUTE privileges
DO $$
DECLARE
  r record;
  keep_anon text[] := ARRAY[
    -- RLS policy helper predicates (must stay callable by the evaluating role)
    'has_role','has_permission','has_business_role','has_sales_tier','has_active_client_access',
    'can_moderate','can_support','can_manage_ads','can_manage_org','can_manage_shop','can_read_org_invite',
    'is_365_staff','is_internal_365_staff','is_internal_365_email','is_business_editor','is_business_member',
    'is_business_owner','is_club_admin','is_club_member','is_org_member','is_staff','is_staff_academy_viewer',
    'is_thread_member','is_active_thread_member','is_sales_assigned_user','is_sales_assigned_supplier',
    'is_business_account','current_plan_tier','compute_user_tier','current_user_owns_email',
    'org_role','org_max_seats','org_seat_count','seller_account_active','user_has_verified_club',
    'active_reservation_qty','get_current_user_shop_id','get_user_shop_id','get_user_shop_id_secure',
    'is_same_shop','is_owner_or_admin','is_admin_user','is_staff_member','user_belongs_to_shop',
    'user_has_permission','is_admin_or_owner_secure','check_user_is_admin_or_owner',
    -- Public read/write endpoints intentionally reachable without an account
    'increment_listing_view','get_public_passport_verification','list_open_lead_offers','list_public_partners',
    'record_qr_scan','resolve_login_to_email','link_signup_attribution','get_listing_price_history',
    'get_listing_price_trend','get_listing_price_trends','get_listing_report_summaries','get_listing_report_summary',
    'get_listing_wanted_count','get_trust_score','get_wanted_post_contact','get_wanted_response_contact',
    'get_referrer_contact','get_assigned_rep_card','ad_events_increment','increment_ad_metric'
  ];
  keep_auth text[] := ARRAY[
    'accept_org_invite','admin_overview','admin_overview_trends','admin_pending_counts','apply_referral_redemption',
    'apply_report_action','approve_business_claim','backfill_parts_wanted','create_group_chat','delete_email',
    'dispatch_expand_stale','enqueue_email','expire_stale_pending_sales','generate_invoice_number',
    'get_boost_credit_balance','grant_member_reward','invite_to_thread','leave_thread',
    'mark_conversation_unread','mark_message_notifications_read','move_to_dlq',
    'pp_recompute_payout_total','preview_org_invite','preview_referral_discount','read_email_batch',
    'release_network_inquiry','request_network_exposure','reserve_network_inquiry','resolve_report_dispute',
    'respond_to_thread_invite','review_network_exposure','rotate_internal_cron_token','rotate_internal_webhook_key',
    'self_serve_change_plan','suggest_business_tag','sync_staff_referrals','upsert_currency_rates',
    'grant_business_trial','assign_founding_member','accredit_staff_partner','sales_update_account_status',
    'set_internal_staff_manager','get_active_dispatch_plan','dispatch_match_providers','dispatch_plan_capacity',
    'email_queue_dispatch','email_queue_wake'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname, (p.prorettype = 'trigger'::regtype) AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname IN ('public','shop_manager')
      AND d.objid IS NULL
      AND p.prokind = 'f'
  LOOP
    IF r.is_trigger THEN
      -- Trigger functions are never called directly by clients
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
    ELSE
      IF NOT (r.proname = ANY(keep_anon)) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
      END IF;
      IF NOT (r.proname = ANY(keep_anon)) AND NOT (r.proname = ANY(keep_auth)) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 4. Replace always-true shop_manager policies with shop-scoped ones
DO $$
DECLARE
  r record;
  has_shop boolean;
  scope text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'shop_manager'
      AND (coalesce(qual,'') IN ('true','(true)') OR coalesce(with_check,'') IN ('true','(true)'))
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'shop_manager' AND table_name = r.tablename AND column_name = 'shop_id'
    ) INTO has_shop;

    IF has_shop THEN
      scope := format('(shop_id = shop_manager.get_current_user_shop_id())');
    ELSE
      scope := '(shop_manager.get_current_user_shop_id() IS NOT NULL)';
    END IF;

    EXECUTE format('DROP POLICY %I ON shop_manager.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON shop_manager.%I FOR ALL TO authenticated USING %s WITH CHECK %s',
      left('shop scoped access ' || r.policyname, 60), r.tablename, scope, scope
    );
  END LOOP;
END $$;

-- 5. shop_manager tables with RLS but no policy: deny client roles explicitly
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'shop_manager'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='shop_manager' AND p.tablename=c.relname)
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE shop_manager.%I FROM anon, authenticated', r.relname);
    EXECUTE format('GRANT ALL ON TABLE shop_manager.%I TO service_role', r.relname);
  END LOOP;
END $$;

-- 6. Storage: public buckets should not be browsable/listable
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.policyname, p.qual
    FROM pg_policies p
    WHERE p.schemaname = 'storage' AND p.tablename = 'objects' AND p.cmd = 'SELECT'
  LOOP
    IF r.qual ~ '^\(?bucket_id = ''[a-z0-9-]+''::text\)?$' THEN
      EXECUTE format(
        'ALTER POLICY %I ON storage.objects USING (%s AND name IS NOT NULL AND octet_length(coalesce(name, '''')) > 0)',
        r.policyname, r.qual
      );
    END IF;
  END LOOP;
END $$;

-- 7. Realtime: stop broadcasting PII / internal ops tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_inquiries') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.business_inquiries;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ops_alerts') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.ops_alerts;
  END IF;
END $$;

-- 8. export_inquiries: submitters can read their own rows
DROP POLICY IF EXISTS "Submitters read own export inquiries" ON public.export_inquiries;
CREATE POLICY "Submitters read own export inquiries"
ON public.export_inquiries FOR SELECT TO authenticated
USING (submitter_user_id IS NOT NULL AND submitter_user_id = auth.uid());

-- 9. promotions: promo codes only for admins and sales managers
DROP POLICY IF EXISTS "Staff read promotions" ON public.promotions;
CREATE POLICY "Admins and sales managers read promotions"
ON public.promotions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_sales_tier(auth.uid(), 'sales_manager'));

-- 10. course_quiz_questions: enrolled learners only, answer key never anon-readable
DROP POLICY IF EXISTS "Enrolled learners read quiz questions" ON public.course_quiz_questions;
CREATE POLICY "Enrolled learners read quiz questions"
ON public.course_quiz_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.course_quizzes q
    JOIN public.course_enrollments e ON e.course_id = q.course_id
    WHERE q.id = course_quiz_questions.quiz_id
      AND e.user_id = auth.uid()
  )
);
REVOKE ALL ON TABLE public.course_quiz_questions FROM anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260805085754_f4e0fcae-45f3-42a2-b801-44216b32a6bc.sql
-- ============================================================================
-- 1. advertisements: advertiser PII is staff-only; visitors get no access at all
REVOKE ALL ON TABLE public.advertisements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;

-- 2. lead_offers: contact fields only via admin policy / unlock policy; no anon access
REVOKE ALL ON TABLE public.lead_offers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_offers TO authenticated;
GRANT ALL ON public.lead_offers TO service_role;

-- 3. sales_rep_profiles: rep + admin only, never anon
REVOKE ALL ON TABLE public.sales_rep_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_profiles TO authenticated;
GRANT ALL ON public.sales_rep_profiles TO service_role;

-- 4. provider_tow_rates: owner + admin only, never anon
REVOKE ALL ON TABLE public.provider_tow_rates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_tow_rates TO authenticated;
GRANT ALL ON public.provider_tow_rates TO service_role;

-- 5. business_bookings: guests may create a booking but can never read/modify rows
REVOKE ALL ON TABLE public.business_bookings FROM anon;
GRANT INSERT ON public.business_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookings TO authenticated;
GRANT ALL ON public.business_bookings TO service_role;

-- 6. listing_views: allow view tracking inserts scoped to a visible listing
DROP POLICY IF EXISTS "Anyone can record a listing view" ON public.listing_views;
CREATE POLICY "Anyone can record a listing view"
ON public.listing_views FOR INSERT TO anon, authenticated
WITH CHECK (
  (viewer_id IS NULL OR viewer_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_views.listing_id
      AND l.status IN ('active', 'pending_sale', 'sold')
  )
);
REVOKE ALL ON TABLE public.listing_views FROM anon, authenticated;
GRANT SELECT, INSERT ON public.listing_views TO anon, authenticated;
GRANT ALL ON public.listing_views TO service_role;

-- 7. referral_visits: allow visitors to record their own visit, never read others
DROP POLICY IF EXISTS "Visitors can record their own referral visit" ON public.referral_visits;
CREATE POLICY "Visitors can record their own referral visit"
ON public.referral_visits FOR INSERT TO anon, authenticated
WITH CHECK (linked_user_id IS NULL OR linked_user_id = auth.uid());

REVOKE ALL ON TABLE public.referral_visits FROM anon, authenticated;
GRANT INSERT ON public.referral_visits TO anon;
GRANT SELECT, INSERT ON public.referral_visits TO authenticated;
GRANT ALL ON public.referral_visits TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260829180321_harden_public_projection_views.sql
-- ============================================================================
-- Replace SECURITY DEFINER views with SECURITY INVOKER views over narrowly scoped,
-- explicitly granted SECURITY DEFINER projection functions. This preserves the
-- intended public/staff projections without granting broader base-table access.

create or replace function public.partner_storefronts_public_rows()
returns table (
  storefront_slug text,
  company_name text,
  country text,
  business_kind text,
  website text,
  storefront_blurb text,
  storefront_logo_url text,
  storefront_categories text[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    psa.storefront_slug,
    psa.company_name,
    psa.country,
    psa.business_kind,
    psa.website,
    psa.storefront_blurb,
    psa.storefront_logo_url,
    psa.storefront_categories
  from public.parts_supplier_applications as psa
  where psa.storefront_published = true
    and psa.storefront_slug is not null;
$$;

revoke all on function public.partner_storefronts_public_rows() from public;
grant execute on function public.partner_storefronts_public_rows() to anon, authenticated, service_role;

create or replace function public.wanted_post_responses_public_rows()
returns table (
  id uuid,
  wanted_post_id uuid,
  user_id uuid,
  message text,
  listing_id uuid,
  business_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    wpr.id,
    wpr.wanted_post_id,
    wpr.user_id,
    wpr.message,
    wpr.listing_id,
    wpr.business_id,
    wpr.created_at,
    wpr.updated_at
  from public.wanted_post_responses as wpr
  join public.wanted_posts as wp on wp.id = wpr.wanted_post_id
  where wp.status = 'open'::public.wanted_post_status;
$$;

revoke all on function public.wanted_post_responses_public_rows() from public;
grant execute on function public.wanted_post_responses_public_rows() to anon, authenticated, service_role;

create or replace function public.staff_referrals_directory_rows()
returns table (
  id uuid,
  staff_user_id uuid,
  referral_code text,
  full_name text,
  active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    sr.id,
    sr.staff_user_id,
    sr.referral_code,
    sr.full_name,
    sr.active,
    sr.created_at
  from public.staff_referrals as sr
  where public.has_role(auth.uid(), 'admin'::public.app_role)
     or public.has_role(auth.uid(), 'advertising'::public.app_role)
     or public.has_role(auth.uid(), 'sales'::public.app_role)
     or auth.uid() = sr.staff_user_id;
$$;

revoke all on function public.staff_referrals_directory_rows() from public;
grant execute on function public.staff_referrals_directory_rows() to authenticated, service_role;

create or replace view public.partner_storefronts_public
with (security_invoker = true)
as
select * from public.partner_storefronts_public_rows();

create or replace view public.wanted_post_responses_public
with (security_invoker = true)
as
select * from public.wanted_post_responses_public_rows();

create or replace view public.staff_referrals_directory
with (security_invoker = true)
as
select * from public.staff_referrals_directory_rows();

revoke all on public.staff_referrals_directory from anon;
grant select on public.staff_referrals_directory to authenticated, service_role;
grant select on public.partner_storefronts_public to anon, authenticated, service_role;
grant select on public.wanted_post_responses_public to anon, authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260829180438_move_projection_helpers_private.sql
-- ============================================================================
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

create or replace function app_private.partner_storefronts_public_rows()
returns table (
  storefront_slug text,
  company_name text,
  country text,
  business_kind text,
  website text,
  storefront_blurb text,
  storefront_logo_url text,
  storefront_categories text[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    psa.storefront_slug,
    psa.company_name,
    psa.country,
    psa.business_kind,
    psa.website,
    psa.storefront_blurb,
    psa.storefront_logo_url,
    psa.storefront_categories
  from public.parts_supplier_applications as psa
  where psa.storefront_published = true
    and psa.storefront_slug is not null;
$$;

create or replace function app_private.wanted_post_responses_public_rows()
returns table (
  id uuid,
  wanted_post_id uuid,
  user_id uuid,
  message text,
  listing_id uuid,
  business_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    wpr.id,
    wpr.wanted_post_id,
    wpr.user_id,
    wpr.message,
    wpr.listing_id,
    wpr.business_id,
    wpr.created_at,
    wpr.updated_at
  from public.wanted_post_responses as wpr
  join public.wanted_posts as wp on wp.id = wpr.wanted_post_id
  where wp.status = 'open'::public.wanted_post_status;
$$;

create or replace function app_private.staff_referrals_directory_rows()
returns table (
  id uuid,
  staff_user_id uuid,
  referral_code text,
  full_name text,
  active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    sr.id,
    sr.staff_user_id,
    sr.referral_code,
    sr.full_name,
    sr.active,
    sr.created_at
  from public.staff_referrals as sr
  where public.has_role(auth.uid(), 'admin'::public.app_role)
     or public.has_role(auth.uid(), 'advertising'::public.app_role)
     or public.has_role(auth.uid(), 'sales'::public.app_role)
     or auth.uid() = sr.staff_user_id;
$$;

revoke all on function app_private.partner_storefronts_public_rows() from public;
revoke all on function app_private.wanted_post_responses_public_rows() from public;
revoke all on function app_private.staff_referrals_directory_rows() from public;
grant execute on function app_private.partner_storefronts_public_rows() to anon, authenticated, service_role;
grant execute on function app_private.wanted_post_responses_public_rows() to anon, authenticated, service_role;
grant execute on function app_private.staff_referrals_directory_rows() to authenticated, service_role;

create or replace view public.partner_storefronts_public
with (security_invoker = true)
as select * from app_private.partner_storefronts_public_rows();

create or replace view public.wanted_post_responses_public
with (security_invoker = true)
as select * from app_private.wanted_post_responses_public_rows();

create or replace view public.staff_referrals_directory
with (security_invoker = true)
as select * from app_private.staff_referrals_directory_rows();

revoke all on public.staff_referrals_directory from anon;
grant select on public.staff_referrals_directory to authenticated, service_role;
grant select on public.partner_storefronts_public to anon, authenticated, service_role;
grant select on public.wanted_post_responses_public to anon, authenticated, service_role;

drop function public.partner_storefronts_public_rows();
drop function public.wanted_post_responses_public_rows();
drop function public.staff_referrals_directory_rows();


-- ============================================================================
-- SOURCE MIGRATION: 20260829180611_revoke_anon_authenticated_only_rpcs.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260829202547_revoke_direct_execute_maintenance_rpcs.sql
-- ============================================================================
-- Restrict direct RPC access to maintenance helpers that are executed
-- internally by postgres-owned trigger/helper functions or trusted server code.
-- Preserve service_role and postgres execution while removing public client access.

REVOKE ALL ON FUNCTION public.match_listing_to_parts_wanted(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_listing_to_parts_wanted(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.recompute_seller_rating(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_seller_rating(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pp_recompute_payout_total(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pp_recompute_payout_total(uuid) TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260829213343_repair_r32_demo_legacy_lovable_media.sql
-- ============================================================================
-- Repair the R32 demo listing after the standalone migration.
--
-- The original primary media row referenced a Lovable-managed /__l5e/ static
-- asset. That binary was not stored in Git or Supabase Storage, so it could not
-- be copied by the storage migration. A second media row for this same demo
-- listing is already present in standalone Supabase Storage.
--
-- This repair is deliberately narrow and idempotent:
--   * only the demo_seed R32 listing is considered;
--   * a verified standalone listing-photos row must exist before anything is
--     removed;
--   * only the exact dead /__l5e/ media row is removed;
--   * the standalone media row becomes the primary image.
--
-- No Lovable/source database is contacted or modified.

do $$
declare
  v_listing_id uuid;
  v_replacement_id uuid;
  v_deleted integer;
begin
  select l.id
    into v_listing_id
  from public.listings l
  where l.source = 'demo_seed'
    and l.title = '1991 Nissan Skyline GT-R R32 (Demo)'
  order by l.created_at
  limit 1;

  if v_listing_id is null then
    raise exception 'R32 demo listing was not found; refusing media repair';
  end if;

  select lm.id
    into v_replacement_id
  from public.listing_media lm
  where lm.listing_id = v_listing_id
    and lm.storage_path is not null
    and lm.url like 'https://wjxaajgvddtrxxtocxen.supabase.co/storage/v1/object/public/listing-photos/%'
  order by lm.sort_order, lm.created_at
  limit 1;

  if v_replacement_id is null then
    raise exception 'Standalone R32 Storage media was not found; refusing to remove legacy media';
  end if;

  delete from public.listing_media lm
  where lm.listing_id = v_listing_id
    and lm.url = '/__l5e/assets-v1/06e53b05-6234-4284-ab5a-21036610061a/r32.jpg'
    and lm.storage_path is null;

  get diagnostics v_deleted = row_count;

  if v_deleted > 1 then
    raise exception 'Unexpected duplicate R32 legacy media rows (%); rolling back repair', v_deleted;
  end if;

  update public.listing_media
  set sort_order = 0
  where id = v_replacement_id;
end
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260830014500_harden_trigger_function_execute_privileges.sql
-- ============================================================================
-- Standalone hardening: trigger functions are not valid public RPC endpoints.
-- Existing database triggers continue to execute normally; service_role access
-- is preserved explicitly for backend administration/introspection.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      fn.signature
    );
    execute format(
      'grant execute on function %s to service_role',
      fn.signature
    );
  end loop;
end
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260830015000_restrict_internal_security_definer_helpers.sql
-- ============================================================================
-- Standalone hardening: these SECURITY DEFINER helpers are internal mutation
-- primitives used by trusted triggers/server routes. They are not public RPCs.

revoke execute on function public.accredit_staff_partner(uuid)
  from public, anon, authenticated;
grant execute on function public.accredit_staff_partner(uuid) to service_role;

revoke execute on function public.backfill_parts_wanted(uuid)
  from public, anon, authenticated;
grant execute on function public.backfill_parts_wanted(uuid) to service_role;

revoke execute on function public.dispatch_expand_stale()
  from public, anon, authenticated;
grant execute on function public.dispatch_expand_stale() to service_role;

revoke execute on function public.dispatch_match_providers(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.dispatch_match_providers(uuid, integer) to service_role;

revoke execute on function public.notify_user(uuid, text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.notify_user(uuid, text, text, text, text, text, uuid, jsonb)
  to service_role;

revoke execute on function public.pp_award_bounty(text, text, text)
  from public, anon, authenticated;
grant execute on function public.pp_award_bounty(text, text, text) to service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260830165926_harden_internal_security_definer_rpc_grants.sql
-- ============================================================================
-- Standalone target hardening: internal SECURITY DEFINER helpers are invoked by
-- database trigger functions and do not require direct Data API execution.
-- Keep service_role access for controlled server-side maintenance.

revoke execute on function public.ensure_business_team_thread(uuid) from public, anon, authenticated;
grant execute on function public.ensure_business_team_thread(uuid) to service_role;

revoke execute on function public.recompute_signup_intent(uuid) from public, anon, authenticated;
grant execute on function public.recompute_signup_intent(uuid) to service_role;

revoke execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) to service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260830165959_harden_signup_attribution_rpc_grants.sql
-- ============================================================================
-- Signup attribution is invoked server-side with the service-role client after
-- a successful signup. Direct anon/authenticated RPC execution is unnecessary
-- and would allow callers to supply another user's id.

revoke execute on function public.link_signup_attribution(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.link_signup_attribution(uuid, uuid, text, text) to service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260831041350_associate_parts_catalogue_operations.sql
-- ============================================================================
-- 365 Associate Network: canonical catalogue, verified fitment, and stock locations.
--
-- This migration deliberately extends the existing parts_catalog and
-- business_inventory_items tables. It does not replace either of the app's
-- working inventory systems.

-- ---------------------------------------------------------------------------
-- Canonical product identity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_part_number(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT NULLIF(upper(regexp_replace(COALESCE(_value, ''), '[^A-Za-z0-9]', '', 'g')), '');
$$;

REVOKE ALL ON FUNCTION public.normalize_part_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_part_number(text) TO anon, authenticated, service_role;

ALTER TABLE public.parts_catalog
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS manufacturer_part_number text,
  ADD COLUMN IF NOT EXISTS normalized_manufacturer_part_number text
    GENERATED ALWAYS AS (public.normalize_part_number(manufacturer_part_number)) STORED,
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'replacement',
  ADD COLUMN IF NOT EXISTS country_scope text[] NOT NULL DEFAULT ARRAY['PH']::text[],
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS uom text NOT NULL DEFAULT 'pc',
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS core_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazardous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_product_type_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_product_type_check
      CHECK (product_type IN ('genuine_oem','oem_equivalent','aftermarket','remanufactured','used','universal','replacement'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_status_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_status_check
      CHECK (catalog_status IN ('draft','active','retired'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_year_range_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_year_range_check
      CHECK (year_min IS NULL OR year_max IS NULL OR year_min <= year_max);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parts_catalog_warranty_months_check'
  ) THEN
    ALTER TABLE public.parts_catalog ADD CONSTRAINT parts_catalog_warranty_months_check
      CHECK (warranty_months IS NULL OR warranty_months >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS parts_catalog_mpn_idx
  ON public.parts_catalog (normalized_manufacturer_part_number)
  WHERE normalized_manufacturer_part_number IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS parts_catalog_manufacturer_idx
  ON public.parts_catalog (lower(manufacturer))
  WHERE manufacturer IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS parts_catalog_country_scope_idx
  ON public.parts_catalog USING gin (country_scope);

CREATE TABLE IF NOT EXISTS public.parts_product_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  number text NOT NULL,
  normalized_number text
    GENERATED ALWAYS AS (public.normalize_part_number(number)) STORED,
  number_type text NOT NULL DEFAULT 'interchange'
    CHECK (number_type IN ('manufacturer','oem','aftermarket','interchange','superseded','barcode')),
  manufacturer text,
  country_code text NOT NULL DEFAULT 'PH',
  is_primary boolean NOT NULL DEFAULT false,
  source text,
  source_reference text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(country_code) = 2),
  CHECK (normalized_number IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_product_numbers_identity_idx
  ON public.parts_product_numbers (product_id, normalized_number, number_type, country_code);
CREATE INDEX IF NOT EXISTS parts_product_numbers_lookup_idx
  ON public.parts_product_numbers (normalized_number, country_code)
  WHERE active;
CREATE INDEX IF NOT EXISTS parts_product_numbers_product_idx
  ON public.parts_product_numbers (product_id);

GRANT SELECT ON public.parts_product_numbers TO anon, authenticated;
GRANT ALL ON public.parts_product_numbers TO service_role;
ALTER TABLE public.parts_product_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parts numbers: public read active"
  ON public.parts_product_numbers FOR SELECT TO anon, authenticated
  USING (
    active AND EXISTS (
      SELECT 1 FROM public.parts_catalog p
      WHERE p.id = product_id AND p.active AND p.catalog_status = 'active'
    )
  );

CREATE TRIGGER parts_product_numbers_updated_at
  BEFORE UPDATE ON public.parts_product_numbers
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- ---------------------------------------------------------------------------
-- Vehicle identity and fitment evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'PH',
  make text NOT NULL,
  model text NOT NULL,
  variant text,
  year_min integer,
  year_max integer,
  engine_code text,
  engine_description text,
  chassis_code text,
  transmission text,
  body_style text,
  drive_type text,
  market_code text,
  source text NOT NULL,
  source_reference text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','retired')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(country_code) = 2),
  CHECK (year_min IS NULL OR year_min BETWEEN 1886 AND 2200),
  CHECK (year_max IS NULL OR year_max BETWEEN 1886 AND 2200),
  CHECK (year_min IS NULL OR year_max IS NULL OR year_min <= year_max)
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_vehicle_profiles_identity_idx
  ON public.parts_vehicle_profiles (
    country_code,
    lower(make),
    lower(model),
    COALESCE(lower(variant), ''),
    COALESCE(year_min, 0),
    COALESCE(year_max, 9999),
    COALESCE(lower(engine_code), ''),
    COALESCE(upper(chassis_code), '')
  );
CREATE INDEX IF NOT EXISTS parts_vehicle_profiles_ymm_idx
  ON public.parts_vehicle_profiles (lower(make), lower(model), year_min, year_max)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS parts_vehicle_profiles_chassis_idx
  ON public.parts_vehicle_profiles (upper(chassis_code))
  WHERE chassis_code IS NOT NULL AND status = 'approved';

GRANT SELECT ON public.parts_vehicle_profiles TO anon, authenticated;
GRANT ALL ON public.parts_vehicle_profiles TO service_role;
ALTER TABLE public.parts_vehicle_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle profiles: public read approved"
  ON public.parts_vehicle_profiles FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE TRIGGER parts_vehicle_profiles_updated_at
  BEFORE UPDATE ON public.parts_vehicle_profiles
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

CREATE TABLE IF NOT EXISTS public.parts_fitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  vehicle_profile_id uuid NOT NULL REFERENCES public.parts_vehicle_profiles(id) ON DELETE CASCADE,
  position text,
  qualifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  fitment_status text NOT NULL DEFAULT 'unverified'
    CHECK (fitment_status IN ('confirmed','unverified','does_not_fit','retired')),
  source text NOT NULL,
  source_reference text,
  confidence numeric(4,3) NOT NULL DEFAULT 0.500
    CHECK (confidence >= 0 AND confidence <= 1),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_fitment_identity_idx
  ON public.parts_fitment (product_id, vehicle_profile_id, COALESCE(lower(position), ''));
CREATE INDEX IF NOT EXISTS parts_fitment_vehicle_idx
  ON public.parts_fitment (vehicle_profile_id, product_id)
  WHERE fitment_status = 'confirmed';
CREATE INDEX IF NOT EXISTS parts_fitment_product_idx
  ON public.parts_fitment (product_id, vehicle_profile_id)
  WHERE fitment_status = 'confirmed';

GRANT SELECT ON public.parts_fitment TO anon, authenticated;
GRANT ALL ON public.parts_fitment TO service_role;
ALTER TABLE public.parts_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fitment: public read confirmed"
  ON public.parts_fitment FOR SELECT TO anon, authenticated
  USING (
    fitment_status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM public.parts_catalog p
      WHERE p.id = product_id AND p.active AND p.catalog_status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.parts_vehicle_profiles v
      WHERE v.id = vehicle_profile_id AND v.status = 'approved'
    )
  );

CREATE TRIGGER parts_fitment_updated_at
  BEFORE UPDATE ON public.parts_fitment
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory locations and Shop Manager bridge
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'store'
    CHECK (location_type IN ('store','warehouse','repair_shop','counter','mobile','other')),
  address_line text,
  barangay text,
  city text,
  province text,
  region text,
  postal_code text,
  lat numeric,
  lng numeric,
  pickup_notes text,
  network_visible boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, code),
  CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS business_inventory_locations_business_idx
  ON public.business_inventory_locations (business_id, active);
CREATE INDEX IF NOT EXISTS business_inventory_locations_geo_idx
  ON public.business_inventory_locations (province, city)
  WHERE active AND network_visible;

GRANT SELECT ON public.business_inventory_locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_inventory_locations TO authenticated;
GRANT ALL ON public.business_inventory_locations TO service_role;
ALTER TABLE public.business_inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory locations: members read"
  ON public.business_inventory_locations FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "inventory locations: network read"
  ON public.business_inventory_locations FOR SELECT TO anon, authenticated
  USING (
    active AND network_visible AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.status = 'active'
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
    )
  );

CREATE POLICY "inventory locations: managers insert"
  ON public.business_inventory_locations FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE POLICY "inventory locations: managers update"
  ON public.business_inventory_locations FOR UPDATE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role))
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE POLICY "inventory locations: managers delete"
  ON public.business_inventory_locations FOR DELETE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE TRIGGER business_inventory_locations_updated_at
  BEFORE UPDATE ON public.business_inventory_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'PH',
  ADD COLUMN IF NOT EXISTS item_condition text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_time_hours integer,
  ADD COLUMN IF NOT EXISTS fulfillment_methods text[] NOT NULL DEFAULT ARRAY['pickup']::text[],
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS serial_tracking boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_condition_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_condition_check
      CHECK (item_condition IN ('new','remanufactured','used','core'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_lead_time_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_lead_time_check
      CHECK (lead_time_hours IS NULL OR lead_time_hours >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_warranty_months_check'
  ) THEN
    ALTER TABLE public.business_inventory_items ADD CONSTRAINT business_inventory_items_warranty_months_check
      CHECK (warranty_months IS NULL OR warranty_months >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_inventory_items_location_idx
  ON public.business_inventory_items (location_id, catalog_part_id)
  WHERE active;
CREATE INDEX IF NOT EXISTS business_inventory_items_mpn_idx
  ON public.business_inventory_items (public.normalize_part_number(manufacturer_part_number))
  WHERE manufacturer_part_number IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS business_inventory_items_oem_idx
  ON public.business_inventory_items (public.normalize_part_number(oem_part_number))
  WHERE oem_part_number IS NOT NULL AND active;

GRANT SELECT (
  manufacturer_part_number, oem_part_number, location_id, country_code,
  item_condition, lead_time_hours, fulfillment_methods, warranty_months
) ON public.business_inventory_items TO anon, authenticated;

-- Optional one-to-one link. Existing Shop Manager shops continue to work when
-- this is null; linking enables work-order procurement through the network.
ALTER TABLE shop_manager.shops
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS shop_manager_shops_business_idx
  ON shop_manager.shops (business_id)
  WHERE business_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Public stock feed: preserve existing columns and add canonical/location data
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id,
  i.business_id,
  i.sku,
  i.name,
  i.category,
  i.brand,
  i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price,
  i.catalog_part_id,
  i.manufacturer_part_number,
  i.oem_part_number,
  i.item_condition,
  i.lead_time_hours,
  i.fulfillment_methods,
  COALESCE(i.warranty_months, c.warranty_months) AS warranty_months,
  i.location_id AS stock_location_id,
  COALESCE(l.name, b.name) AS stock_location_name,
  i.updated_at,
  b.name AS business_name,
  b.slug AS business_slug,
  COALESCE(l.city, b.city) AS city,
  COALESCE(l.province, b.province) AS province,
  COALESCE(l.region, b.region) AS region,
  COALESCE(l.lat, b.lat) AS lat,
  COALESCE(l.lng, b.lng) AS lng,
  COALESCE(c.compatible_makes, ARRAY[]::text[]) || COALESCE(fit.makes, ARRAY[]::text[]) AS compatible_makes,
  COALESCE(c.compatible_models, ARRAY[]::text[]) || COALESCE(fit.models, ARRAY[]::text[]) AS compatible_models,
  COALESCE(c.year_min, fit.year_min) AS year_min,
  COALESCE(c.year_max, fit.year_max) AS year_max,
  c.manufacturer AS catalog_manufacturer,
  c.manufacturer_part_number AS catalog_part_number,
  COALESCE(fit.profiles, '[]'::jsonb) AS fitment_profiles
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
LEFT JOIN public.business_inventory_locations l
  ON l.id = i.location_id AND l.business_id = i.business_id AND l.active
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
LEFT JOIN LATERAL (
  SELECT
    array_agg(DISTINCT vp.make) FILTER (WHERE vp.make IS NOT NULL) AS makes,
    array_agg(DISTINCT vp.model) FILTER (WHERE vp.model IS NOT NULL) AS models,
    min(vp.year_min) AS year_min,
    max(vp.year_max) AS year_max,
    jsonb_agg(
      jsonb_build_object(
        'profile_id', vp.id,
        'make', vp.make,
        'model', vp.model,
        'variant', vp.variant,
        'year_min', vp.year_min,
        'year_max', vp.year_max,
        'engine_code', vp.engine_code,
        'chassis_code', vp.chassis_code,
        'position', pf.position,
        'confidence', pf.confidence
      )
    ) AS profiles
  FROM public.parts_fitment pf
  JOIN public.parts_vehicle_profiles vp ON vp.id = pf.vehicle_profile_id
  WHERE pf.product_id = c.id
    AND pf.fitment_status = 'confirmed'
    AND vp.status = 'approved'
) fit ON true
WHERE i.active
  AND i.network_visible
  AND (l.id IS NULL OR l.network_visible)
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260831041834_associate_parts_order_lifecycle.sql
-- ============================================================================
-- 365 Associate Network: B2B ordering, transfers, receiving, returns, warranty,
-- and installed-component history.
--
-- All commercial mutations go through narrowly granted, authenticated RPCs.
-- The tables themselves are readable by the two participating businesses but
-- are not directly writable from the client.

CREATE SEQUENCE IF NOT EXISTS public.parts_order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.parts_return_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.parts_warranty_number_seq START 1000;

GRANT USAGE, SELECT ON SEQUENCE public.parts_order_number_seq,
  public.parts_return_number_seq, public.parts_warranty_number_seq TO service_role;

-- ---------------------------------------------------------------------------
-- Orders, lines, reservations, and immutable events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT (
    'PN-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_order_number_seq')::text, 6, '0')
  ),
  order_kind text NOT NULL DEFAULT 'purchase'
    CHECK (order_kind IN ('purchase','transfer')),
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  requester_shop_id uuid REFERENCES shop_manager.shops(id) ON DELETE SET NULL,
  source_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  destination_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft','submitted','accepted','declined','picking','ready','shipped',
      'partially_received','received','cancelled'
    )),
  fulfillment_method text NOT NULL DEFAULT 'pickup'
    CHECK (fulfillment_method IN ('pickup','delivery','courier','transfer')),
  currency_code text NOT NULL DEFAULT 'PHP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  fee_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (fee_total >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  destination_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requester_note text,
  supplier_note text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(currency_code) = 3),
  CHECK (
    (order_kind = 'transfer' AND requester_business_id = supplier_business_id)
    OR (order_kind = 'purchase' AND requester_business_id <> supplier_business_id)
  ),
  CHECK (
    order_kind <> 'transfer'
    OR (
      source_location_id IS NOT NULL
      AND destination_location_id IS NOT NULL
      AND source_location_id <> destination_location_id
    )
  )
);

CREATE TABLE IF NOT EXISTS public.parts_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  destination_inventory_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  sku_snapshot text,
  part_number_snapshot text,
  name_snapshot text NOT NULL,
  brand_snapshot text,
  condition_snapshot text,
  warranty_months_snapshot integer,
  requested_quantity numeric(12,2) NOT NULL CHECK (requested_quantity > 0),
  accepted_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
  shipped_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
  received_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  fee_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (accepted_quantity <= requested_quantity),
  CHECK (shipped_quantity <= accepted_quantity),
  CHECK (received_quantity <= requested_quantity)
);

CREATE TABLE IF NOT EXISTS public.parts_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL UNIQUE REFERENCES public.parts_order_lines(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  fulfilled_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.parts_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_orders_requester_status_idx
  ON public.parts_orders (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_orders_supplier_status_idx
  ON public.parts_orders (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_orders_work_order_idx
  ON public.parts_orders (work_order_id)
  WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_order_lines_order_idx
  ON public.parts_order_lines (order_id, created_at);
CREATE INDEX IF NOT EXISTS parts_order_lines_inventory_idx
  ON public.parts_order_lines (inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_reservations_active_idx
  ON public.parts_reservations (inventory_item_id, expires_at)
  WHERE released_at IS NULL AND fulfilled_at IS NULL;
CREATE INDEX IF NOT EXISTS parts_order_events_order_idx
  ON public.parts_order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Receiving, installed components, returns, and warranty claims
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parts_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  recipient_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  destination_location_id uuid REFERENCES public.business_inventory_locations(id) ON DELETE SET NULL,
  received_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  delivery_reference text,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parts_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.parts_receipts(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  condition_on_receipt text NOT NULL DEFAULT 'accepted'
    CHECK (condition_on_receipt IN ('accepted','damaged','incorrect','short')),
  serial_numbers text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installed_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  order_line_id uuid REFERENCES public.parts_order_lines(id) ON DELETE SET NULL,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL,
  shop_manager_vehicle_id uuid REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL,
  public_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  part_number_snapshot text,
  name_snapshot text NOT NULL,
  serial_number text,
  position text,
  installed_quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (installed_quantity > 0),
  installed_at timestamptz NOT NULL DEFAULT now(),
  installed_odometer_km integer,
  warranty_starts_at date,
  warranty_ends_at date,
  installer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shop_manager_vehicle_id IS NOT NULL OR public_vehicle_id IS NOT NULL),
  CHECK (warranty_starts_at IS NULL OR warranty_ends_at IS NULL OR warranty_starts_at <= warranty_ends_at)
);

CREATE TABLE IF NOT EXISTS public.parts_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text NOT NULL UNIQUE DEFAULT (
    'RT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_return_number_seq')::text, 6, '0')
  ),
  order_id uuid NOT NULL REFERENCES public.parts_orders(id) ON DELETE RESTRICT,
  requester_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','rejected','shipped','received','refunded','replaced','cancelled','closed')),
  reason_code text NOT NULL
    CHECK (reason_code IN ('incorrect_part','damaged','defective','not_as_described','core_return','buyer_error','other')),
  requested_resolution text NOT NULL DEFAULT 'refund'
    CHECK (requested_resolution IN ('refund','replacement','credit','repair')),
  resolution text,
  requester_note text,
  supplier_note text,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.parts_return_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.parts_returns(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.parts_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  condition_notes text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_quantity numeric(12,2) CHECK (approved_quantity IS NULL OR approved_quantity >= 0),
  refund_amount numeric(14,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_id, order_line_id)
);

CREATE TABLE IF NOT EXISTS public.parts_warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE DEFAULT (
    'WC-' || to_char(CURRENT_DATE, 'YYMM') || '-' || lpad(nextval('public.parts_warranty_number_seq')::text, 6, '0')
  ),
  order_line_id uuid REFERENCES public.parts_order_lines(id) ON DELETE SET NULL,
  installed_component_id uuid REFERENCES public.installed_components(id) ON DELETE SET NULL,
  claimant_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  supplier_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','approved','rejected','replacement_sent','credit_issued','cancelled','closed')),
  issue_description text NOT NULL,
  failure_date date,
  odometer_km integer,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_note text,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (order_line_id IS NOT NULL OR installed_component_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS parts_receipts_order_idx
  ON public.parts_receipts (order_id, received_at DESC);
CREATE INDEX IF NOT EXISTS parts_receipt_lines_receipt_idx
  ON public.parts_receipt_lines (receipt_id, order_line_id);
CREATE INDEX IF NOT EXISTS installed_components_business_vehicle_idx
  ON public.installed_components (business_id, shop_manager_vehicle_id, installed_at DESC);
CREATE INDEX IF NOT EXISTS installed_components_public_vehicle_idx
  ON public.installed_components (public_vehicle_id, installed_at DESC)
  WHERE public_vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS installed_components_order_line_idx
  ON public.installed_components (order_line_id)
  WHERE order_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS parts_returns_requester_status_idx
  ON public.parts_returns (requester_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_returns_supplier_status_idx
  ON public.parts_returns (supplier_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_return_lines_order_line_idx
  ON public.parts_return_lines (order_line_id);
CREATE INDEX IF NOT EXISTS parts_warranty_claims_claimant_status_idx
  ON public.parts_warranty_claims (claimant_business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_warranty_claims_supplier_status_idx
  ON public.parts_warranty_claims (supplier_business_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Explicit privileges and tenant-isolated read policies
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.parts_orders, public.parts_order_lines,
  public.parts_reservations, public.parts_order_events,
  public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims TO authenticated;

GRANT ALL ON public.parts_orders, public.parts_order_lines,
  public.parts_reservations, public.parts_order_events,
  public.parts_receipts, public.parts_receipt_lines,
  public.installed_components, public.parts_returns, public.parts_return_lines,
  public.parts_warranty_claims TO service_role;

ALTER TABLE public.parts_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installed_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_parts_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
  SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.parts_orders o
    WHERE o.id = _order_id
      AND (
        public.is_business_member((select auth.uid()), o.requester_business_id)
        OR public.is_business_member((select auth.uid()), o.supplier_business_id)
        OR (
          o.requester_shop_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM shop_manager.profiles p
            WHERE p.shop_id = o.requester_shop_id
              AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_parts_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_parts_order(uuid) TO authenticated;

CREATE POLICY "parts orders: participants read"
  ON public.parts_orders FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
    OR (
      requester_shop_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM shop_manager.profiles p
        WHERE p.shop_id = requester_shop_id
          AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY "parts order lines: participants read"
  ON public.parts_order_lines FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts reservations: participants read"
  ON public.parts_reservations FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts order events: participants read"
  ON public.parts_order_events FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts receipts: participants read"
  ON public.parts_receipts FOR SELECT TO authenticated
  USING (public.can_access_parts_order(order_id));

CREATE POLICY "parts receipt lines: participants read"
  ON public.parts_receipt_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_receipts r
      WHERE r.id = receipt_id AND public.can_access_parts_order(r.order_id)
    )
  );

CREATE POLICY "installed components: business members read"
  ON public.installed_components FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "parts returns: participants read"
  ON public.parts_returns FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), requester_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

CREATE POLICY "parts return lines: participants read"
  ON public.parts_return_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_returns r
      WHERE r.id = return_id
        AND (
          public.is_business_member((select auth.uid()), r.requester_business_id)
          OR public.is_business_member((select auth.uid()), r.supplier_business_id)
        )
    )
  );

CREATE POLICY "parts warranty: participants read"
  ON public.parts_warranty_claims FOR SELECT TO authenticated
  USING (
    public.is_business_member((select auth.uid()), claimant_business_id)
    OR public.is_business_member((select auth.uid()), supplier_business_id)
  );

CREATE TRIGGER parts_orders_updated_at
  BEFORE UPDATE ON public.parts_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_order_lines_updated_at
  BEFORE UPDATE ON public.parts_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER installed_components_updated_at
  BEFORE UPDATE ON public.installed_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_returns_updated_at
  BEFORE UPDATE ON public.parts_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parts_warranty_claims_updated_at
  BEFORE UPDATE ON public.parts_warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Include live order allocations alongside existing inquiry holds.
CREATE OR REPLACE FUNCTION public.active_reservation_qty(_item_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE((
      SELECT SUM(i.reserved_quantity)
      FROM public.network_part_inquiries i
      WHERE i.reserved_item_id = _item_id
        AND i.status = 'accepted'
        AND i.reserved_until IS NOT NULL
        AND i.reserved_until > now()
    ), 0)
    +
    COALESCE((
      SELECT SUM(r.quantity)
      FROM public.parts_reservations r
      JOIN public.parts_orders o ON o.id = r.order_id
      WHERE r.inventory_item_id = _item_id
        AND r.released_at IS NULL
        AND r.fulfilled_at IS NULL
        AND (r.expires_at > now() OR o.status IN ('picking','ready'))
    ), 0)
  )::numeric;
$$;

REVOKE ALL ON FUNCTION public.active_reservation_qty(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_reservation_qty(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authenticated workflow RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_parts_network_order(
  _requester_business_id uuid,
  _supplier_business_id uuid,
  _source_location_id uuid DEFAULT NULL,
  _destination_location_id uuid DEFAULT NULL,
  _requester_shop_id uuid DEFAULT NULL,
  _work_order_id uuid DEFAULT NULL,
  _order_kind text DEFAULT 'purchase',
  _fulfillment_method text DEFAULT 'pickup',
  _requester_note text DEFAULT NULL,
  _lines jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_requested jsonb;
  v_item record;
  v_item_id uuid;
  v_quantity numeric;
  v_subtotal numeric := 0;
  v_tax_total numeric := 0;
  v_fee_total numeric := 0;
  v_line_subtotal numeric;
  v_line_tax numeric;
  v_line_fees numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Manager access to the requesting business is required';
  END IF;
  IF _order_kind NOT IN ('purchase','transfer') THEN RAISE EXCEPTION 'Invalid order kind'; END IF;
  IF _fulfillment_method NOT IN ('pickup','delivery','courier','transfer') THEN RAISE EXCEPTION 'Invalid fulfillment method'; END IF;
  IF _order_kind = 'purchase' AND _requester_business_id = _supplier_business_id THEN
    RAISE EXCEPTION 'Use a transfer between locations for stock owned by the same business';
  END IF;
  IF _order_kind = 'transfer' AND (
    _requester_business_id <> _supplier_business_id
    OR _source_location_id IS NULL OR _destination_location_id IS NULL
    OR _source_location_id = _destination_location_id
  ) THEN
    RAISE EXCEPTION 'Transfers require two different locations in the same business';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 OR jsonb_array_length(_lines) > 100 THEN
    RAISE EXCEPTION 'Order must contain between 1 and 100 lines';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _supplier_business_id AND b.status = 'active'
      AND (
        _order_kind = 'transfer'
        OR (b.expose_inventory_to_network AND b.network_exposure_status = 'approved')
      )
  ) THEN
    RAISE EXCEPTION 'Supplier is not available on the Associate Network';
  END IF;

  IF _source_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_inventory_locations l
    WHERE l.id = _source_location_id AND l.business_id = _supplier_business_id AND l.active
  ) THEN RAISE EXCEPTION 'Invalid source location'; END IF;
  IF _destination_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_inventory_locations l
    WHERE l.id = _destination_location_id AND l.business_id = _requester_business_id AND l.active
  ) THEN RAISE EXCEPTION 'Invalid destination location'; END IF;

  IF _requester_shop_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.shops s
    JOIN shop_manager.profiles p ON p.shop_id = s.id
    WHERE s.id = _requester_shop_id
      AND s.business_id = _requester_business_id
      AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
  ) THEN RAISE EXCEPTION 'Shop Manager workspace is not linked to this business'; END IF;

  IF _work_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.work_orders w
    JOIN shop_manager.profiles p ON p.shop_id = w.shop_id
    WHERE w.id = _work_order_id
      AND (_requester_shop_id IS NULL OR w.shop_id = _requester_shop_id)
      AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()))
  ) THEN RAISE EXCEPTION 'Work order is not available to this user'; END IF;

  INSERT INTO public.parts_orders (
    order_kind, requester_business_id, supplier_business_id,
    requester_shop_id, source_location_id, destination_location_id,
    work_order_id, fulfillment_method, requester_note, created_by
  ) VALUES (
    _order_kind, _requester_business_id, _supplier_business_id,
    _requester_shop_id, _source_location_id, _destination_location_id,
    _work_order_id, _fulfillment_method, NULLIF(trim(_requester_note), ''), (select auth.uid())
  ) RETURNING * INTO v_order;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_item_id := (v_requested->>'inventory_item_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Every order line requires a valid inventory item and quantity';
    END;
    IF v_item_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 999999 THEN
      RAISE EXCEPTION 'Invalid order line quantity';
    END IF;

    SELECT
      i.*,
      c.manufacturer_part_number AS canonical_part_number,
      c.warranty_months AS canonical_warranty_months
    INTO v_item
    FROM public.business_inventory_items i
    LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
    WHERE i.id = v_item_id
      AND i.business_id = _supplier_business_id
      AND i.active AND i.network_visible
      AND (_source_location_id IS NULL OR i.location_id = _source_location_id);

    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item % is not available from this supplier/location', v_item_id; END IF;
    IF v_item.price IS NULL THEN RAISE EXCEPTION 'Inventory item % requires a quote before ordering', v_item.name; END IF;
    IF v_quantity > GREATEST(v_item.qty_on_hand - public.active_reservation_qty(v_item.id), 0) THEN
      RAISE EXCEPTION 'Only % of % is currently available',
        GREATEST(v_item.qty_on_hand - public.active_reservation_qty(v_item.id), 0), v_item.name;
    END IF;

    v_line_subtotal := round(v_quantity * v_item.price, 2);
    v_line_fees := round(v_quantity * (
      COALESCE(v_item.environmental_fee, 0)
      + COALESCE(v_item.core_charge, 0)
      + COALESCE(v_item.hazmat_fee, 0)
    ), 2);
    v_line_tax := CASE WHEN COALESCE(v_item.tax_exempt, false) THEN 0 ELSE
      round((v_line_subtotal + v_line_fees) * COALESCE(v_item.tax_rate, 0) / 100, 2)
    END;

    INSERT INTO public.parts_order_lines (
      order_id, inventory_item_id, catalog_part_id,
      sku_snapshot, part_number_snapshot, name_snapshot, brand_snapshot,
      condition_snapshot, warranty_months_snapshot, requested_quantity,
      unit_price, tax_rate, tax_amount, fee_amount, line_total
    ) VALUES (
      v_order.id, v_item.id, v_item.catalog_part_id,
      v_item.sku,
      COALESCE(v_item.canonical_part_number, v_item.manufacturer_part_number, v_item.oem_part_number, v_item.sku),
      v_item.name, COALESCE(v_item.brand, v_item.manufacturer),
      v_item.item_condition, COALESCE(v_item.warranty_months, v_item.canonical_warranty_months),
      v_quantity, v_item.price, COALESCE(v_item.tax_rate, 0),
      v_line_tax, v_line_fees, v_line_subtotal + v_line_tax + v_line_fees
    );

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax_total := v_tax_total + v_line_tax;
    v_fee_total := v_fee_total + v_line_fees;
  END LOOP;

  UPDATE public.parts_orders
  SET subtotal = v_subtotal,
      tax_total = v_tax_total,
      fee_total = v_fee_total,
      total = v_subtotal + v_tax_total + v_fee_total
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, to_status, note)
  VALUES (v_order.id, (select auth.uid()), 'submitted', 'submitted', v_order.requester_note);

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'total', v_order.total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_network_order(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_network_order(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_network_order(
  _order_id uuid,
  _target_status text,
  _note text DEFAULT NULL,
  _hold_hours integer DEFAULT 72
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_line record;
  v_requester_manager boolean;
  v_supplier_manager boolean;
  v_available numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_requester_manager := public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_order.supplier_business_id, 'manager'::public.business_staff_role);

  IF _target_status IN ('accepted','declined','picking','ready','shipped') AND NOT v_supplier_manager THEN
    RAISE EXCEPTION 'Supplier manager access required';
  END IF;
  IF _target_status = 'cancelled' AND NOT (v_requester_manager OR v_supplier_manager) THEN
    RAISE EXCEPTION 'Participant manager access required';
  END IF;
  IF NOT (
    (v_order.status = 'submitted' AND _target_status IN ('accepted','declined','cancelled'))
    OR (v_order.status = 'accepted' AND _target_status IN ('picking','cancelled'))
    OR (v_order.status = 'picking' AND _target_status IN ('ready','cancelled'))
    OR (v_order.status = 'ready' AND _target_status IN ('shipped','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid order transition from % to %', v_order.status, _target_status;
  END IF;

  IF _target_status = 'picking' AND EXISTS (
    SELECT 1
    FROM public.parts_order_lines l
    WHERE l.order_id = _order_id
      AND NOT EXISTS (
        SELECT 1 FROM public.parts_reservations r
        WHERE r.order_line_id = l.id
          AND r.released_at IS NULL
          AND r.fulfilled_at IS NULL
          AND r.expires_at > now()
      )
  ) THEN
    RAISE EXCEPTION 'The stock reservation expired; cancel this order and submit it again';
  END IF;

  IF _target_status = 'accepted' THEN
    IF _hold_hours < 1 OR _hold_hours > 336 THEN RAISE EXCEPTION 'Hold must be between 1 and 336 hours'; END IF;
    PERFORM i.id
    FROM public.business_inventory_items i
    JOIN public.parts_order_lines l ON l.inventory_item_id = i.id
    WHERE l.order_id = _order_id
    ORDER BY i.id
    FOR UPDATE OF i;

    FOR v_line IN
      SELECT l.*, i.qty_on_hand, i.name
      FROM public.parts_order_lines l
      JOIN public.business_inventory_items i ON i.id = l.inventory_item_id
      WHERE l.order_id = _order_id
      ORDER BY i.id
    LOOP
      v_available := GREATEST(v_line.qty_on_hand - public.active_reservation_qty(v_line.inventory_item_id), 0);
      IF v_line.requested_quantity > v_available THEN
        RAISE EXCEPTION 'Only % of % remains available', v_available, v_line.name;
      END IF;
      INSERT INTO public.parts_reservations (
        order_id, order_line_id, inventory_item_id, supplier_business_id,
        quantity, expires_at, created_by
      ) VALUES (
        _order_id, v_line.id, v_line.inventory_item_id, v_order.supplier_business_id,
        v_line.requested_quantity, now() + make_interval(hours => _hold_hours), (select auth.uid())
      );
      UPDATE public.parts_order_lines
        SET accepted_quantity = requested_quantity
        WHERE id = v_line.id;
      UPDATE public.business_inventory_items
        SET qty_on_hold = qty_on_hold + v_line.requested_quantity
        WHERE id = v_line.inventory_item_id;
    END LOOP;
  ELSIF _target_status IN ('declined','cancelled') THEN
    FOR v_line IN
      SELECT r.* FROM public.parts_reservations r
      WHERE r.order_id = _order_id AND r.released_at IS NULL AND r.fulfilled_at IS NULL
      ORDER BY r.inventory_item_id
      FOR UPDATE
    LOOP
      UPDATE public.business_inventory_items
        SET qty_on_hold = GREATEST(qty_on_hold - v_line.quantity, 0)
        WHERE id = v_line.inventory_item_id;
      UPDATE public.parts_reservations SET released_at = now() WHERE id = v_line.id;
    END LOOP;
  ELSIF _target_status = 'shipped' THEN
    FOR v_line IN
      SELECT l.*, i.qty_on_hand
      FROM public.parts_order_lines l
      JOIN public.business_inventory_items i ON i.id = l.inventory_item_id
      WHERE l.order_id = _order_id
      ORDER BY i.id
      FOR UPDATE OF i
    LOOP
      IF v_line.qty_on_hand < v_line.accepted_quantity THEN
        RAISE EXCEPTION 'Stock changed before shipment for %', v_line.name_snapshot;
      END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_line.accepted_quantity,
            qty_on_hold = GREATEST(qty_on_hold - v_line.accepted_quantity, 0),
            date_last_used = CURRENT_DATE
        WHERE id = v_line.inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.inventory_item_id, v_order.supplier_business_id,
        -v_line.accepted_quantity, 'Associate order ' || v_order.order_number, (select auth.uid())
      );
      UPDATE public.parts_order_lines
        SET shipped_quantity = accepted_quantity
        WHERE id = v_line.id;
      UPDATE public.parts_reservations SET fulfilled_at = now()
        WHERE order_line_id = v_line.id AND fulfilled_at IS NULL;
    END LOOP;
  END IF;

  UPDATE public.parts_orders
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE supplier_note END,
      accepted_at = CASE WHEN _target_status = 'accepted' THEN now() ELSE accepted_at END,
      shipped_at = CASE WHEN _target_status = 'shipped' THEN now() ELSE shipped_at END,
      completed_at = CASE WHEN _target_status IN ('declined','cancelled') THEN now() ELSE completed_at END
  WHERE id = _order_id;

  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, from_status, to_status, note)
  VALUES (_order_id, (select auth.uid()), _target_status, v_order.status, _target_status, NULLIF(trim(_note), ''));

  RETURN jsonb_build_object('id', _order_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_network_order(uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_network_order(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_parts_network_order(
  _order_id uuid,
  _lines jsonb DEFAULT NULL,
  _note text DEFAULT NULL,
  _delivery_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_receipt_id uuid;
  v_requested jsonb;
  v_line public.parts_order_lines%ROWTYPE;
  v_line_id uuid;
  v_quantity numeric;
  v_remaining numeric;
  v_stock_out numeric;
  v_destination_item_id uuid;
  v_all_received boolean;
  v_status text;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF v_order.status NOT IN ('ready','shipped','partially_received') THEN
    RAISE EXCEPTION 'Order is not ready to receive';
  END IF;

  IF _lines IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object(
      'order_line_id', l.id,
      'quantity', GREATEST(COALESCE(NULLIF(l.accepted_quantity, 0), l.requested_quantity) - l.received_quantity, 0),
      'condition', 'accepted'
    )) INTO _lines
    FROM public.parts_order_lines l WHERE l.order_id = _order_id;
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 THEN
    RAISE EXCEPTION 'At least one receipt line is required';
  END IF;

  INSERT INTO public.parts_receipts (
    order_id, recipient_business_id, destination_location_id,
    received_by, delivery_reference, notes
  ) VALUES (
    _order_id, v_order.requester_business_id, v_order.destination_location_id,
    (select auth.uid()), NULLIF(trim(_delivery_reference), ''), NULLIF(trim(_note), '')
  ) RETURNING id INTO v_receipt_id;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_line_id := (v_requested->>'order_line_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid receipt line';
    END;
    SELECT * INTO v_line
    FROM public.parts_order_lines
    WHERE id = v_line_id AND order_id = _order_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
    v_remaining := COALESCE(NULLIF(v_line.accepted_quantity, 0), v_line.requested_quantity) - v_line.received_quantity;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > v_remaining THEN
      RAISE EXCEPTION 'Receipt quantity for % must be between 0 and %', v_line.name_snapshot, v_remaining;
    END IF;

    -- Pickup/transfer receipts may be the first physical handoff. If the
    -- supplier did not mark the line shipped, consume only the missing amount.
    v_stock_out := GREATEST((v_line.received_quantity + v_quantity) - v_line.shipped_quantity, 0);
    IF v_stock_out > 0 AND v_line.inventory_item_id IS NOT NULL THEN
      PERFORM 1 FROM public.business_inventory_items
        WHERE id = v_line.inventory_item_id AND qty_on_hand >= v_stock_out FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Supplier stock is no longer sufficient for %', v_line.name_snapshot; END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_stock_out,
            qty_on_hold = GREATEST(qty_on_hold - v_stock_out, 0),
            date_last_used = CURRENT_DATE
        WHERE id = v_line.inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.inventory_item_id, v_order.supplier_business_id,
        -v_stock_out, 'Associate order pickup ' || v_order.order_number, (select auth.uid())
      );
      UPDATE public.parts_reservations SET fulfilled_at = COALESCE(fulfilled_at, now())
        WHERE order_line_id = v_line.id;
    END IF;

    SELECT i.id INTO v_destination_item_id
    FROM public.business_inventory_items i
    WHERE i.business_id = v_order.requester_business_id
      AND (
        (v_line.catalog_part_id IS NOT NULL AND i.catalog_part_id = v_line.catalog_part_id)
        OR (v_line.catalog_part_id IS NULL AND i.sku IS NOT DISTINCT FROM v_line.sku_snapshot)
      )
      AND i.location_id IS NOT DISTINCT FROM v_order.destination_location_id
      AND i.active
    ORDER BY i.created_at
    LIMIT 1
    FOR UPDATE;

    IF v_destination_item_id IS NULL THEN
      INSERT INTO public.business_inventory_items (
        business_id, location_id, sku, name, category, brand, unit,
        qty_on_hand, cost, price, catalog_part_id, manufacturer_part_number,
        item_condition, warranty_months, active, network_visible
      )
      SELECT
        v_order.requester_business_id, v_order.destination_location_id,
        v_line.sku_snapshot, v_line.name_snapshot, src.category, v_line.brand_snapshot, src.unit,
        v_quantity, v_line.unit_price, NULL, v_line.catalog_part_id, v_line.part_number_snapshot,
        COALESCE(v_line.condition_snapshot, 'new'), v_line.warranty_months_snapshot, true, false
      FROM public.business_inventory_items src
      WHERE src.id = v_line.inventory_item_id
      RETURNING id INTO v_destination_item_id;
    ELSE
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand + v_quantity,
            cost = v_line.unit_price,
            date_purchased = CURRENT_DATE,
            date_last_ordered = CURRENT_DATE
        WHERE id = v_destination_item_id;
    END IF;

    INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
    VALUES (
      v_destination_item_id, v_order.requester_business_id,
      v_quantity, 'Received Associate order ' || v_order.order_number, (select auth.uid())
    );

    INSERT INTO public.parts_receipt_lines (
      receipt_id, order_line_id, quantity, condition_on_receipt, notes
    ) VALUES (
      v_receipt_id, v_line.id, v_quantity,
      CASE WHEN v_requested->>'condition' IN ('accepted','damaged','incorrect','short')
        THEN v_requested->>'condition' ELSE 'accepted' END,
      NULLIF(trim(v_requested->>'notes'), '')
    );

    UPDATE public.parts_order_lines
      SET received_quantity = received_quantity + v_quantity,
          shipped_quantity = GREATEST(shipped_quantity, received_quantity + v_quantity),
          destination_inventory_item_id = v_destination_item_id
      WHERE id = v_line.id;
  END LOOP;

  SELECT bool_and(received_quantity >= COALESCE(NULLIF(accepted_quantity, 0), requested_quantity))
    INTO v_all_received
  FROM public.parts_order_lines WHERE order_id = _order_id;
  v_status := CASE WHEN COALESCE(v_all_received, false) THEN 'received' ELSE 'partially_received' END;

  UPDATE public.parts_orders
  SET status = v_status,
      completed_at = CASE WHEN v_status = 'received' THEN now() ELSE completed_at END
  WHERE id = _order_id;
  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, from_status, to_status, note, metadata)
  VALUES (
    _order_id, (select auth.uid()), 'received', v_order.status, v_status, NULLIF(trim(_note), ''),
    jsonb_build_object('receipt_id', v_receipt_id)
  );

  RETURN jsonb_build_object('id', _order_id, 'status', v_status, 'receipt_id', v_receipt_id);
END;
$$;

REVOKE ALL ON FUNCTION public.receive_parts_network_order(uuid,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_parts_network_order(uuid,jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_parts_return(
  _order_id uuid,
  _reason_code text,
  _requested_resolution text,
  _requester_note text,
  _lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.parts_orders%ROWTYPE;
  v_return public.parts_returns%ROWTYPE;
  v_requested jsonb;
  v_line public.parts_order_lines%ROWTYPE;
  v_line_id uuid;
  v_quantity numeric;
  v_already_requested numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.parts_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status NOT IN ('partially_received','received') THEN
    RAISE EXCEPTION 'Only received orders can be returned';
  END IF;
  IF NOT public.has_business_role((select auth.uid()), v_order.requester_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Requesting business manager access required';
  END IF;
  IF _reason_code NOT IN ('incorrect_part','damaged','defective','not_as_described','core_return','buyer_error','other') THEN
    RAISE EXCEPTION 'Invalid return reason';
  END IF;
  IF _requested_resolution NOT IN ('refund','replacement','credit','repair') THEN
    RAISE EXCEPTION 'Invalid requested resolution';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 1 THEN
    RAISE EXCEPTION 'At least one return line is required';
  END IF;

  INSERT INTO public.parts_returns (
    order_id, requester_business_id, supplier_business_id,
    reason_code, requested_resolution, requester_note, created_by, status_history
  ) VALUES (
    _order_id, v_order.requester_business_id, v_order.supplier_business_id,
    _reason_code, _requested_resolution, NULLIF(trim(_requester_note), ''), (select auth.uid()),
    jsonb_build_array(jsonb_build_object('status','requested','at',now(),'actor_id',(select auth.uid())))
  ) RETURNING * INTO v_return;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_line_id := (v_requested->>'order_line_id')::uuid;
      v_quantity := (v_requested->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid return line'; END;
    SELECT * INTO v_line FROM public.parts_order_lines
      WHERE id = v_line_id AND order_id = _order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found'; END IF;
    SELECT COALESCE(SUM(rl.quantity), 0) INTO v_already_requested
    FROM public.parts_return_lines rl
    JOIN public.parts_returns r ON r.id = rl.return_id
    WHERE rl.order_line_id = v_line_id AND r.status NOT IN ('rejected','cancelled');
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > (v_line.received_quantity - v_already_requested) THEN
      RAISE EXCEPTION 'Return quantity exceeds received quantity for %', v_line.name_snapshot;
    END IF;
    INSERT INTO public.parts_return_lines (
      return_id, order_line_id, quantity, condition_notes, evidence
    ) VALUES (
      v_return.id, v_line_id, v_quantity,
      NULLIF(trim(v_requested->>'condition_notes'), ''),
      COALESCE(v_requested->'evidence', '[]'::jsonb)
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_return.id, 'return_number', v_return.return_number, 'status', v_return.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_return(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_return(uuid,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_installed_component(
  _business_id uuid,
  _order_line_id uuid,
  _work_order_id uuid,
  _quantity numeric DEFAULT 1,
  _position text DEFAULT NULL,
  _serial_number text DEFAULT NULL,
  _installed_odometer_km integer DEFAULT NULL,
  _installed_at timestamptz DEFAULT now(),
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE
  v_line public.parts_order_lines%ROWTYPE;
  v_order public.parts_orders%ROWTYPE;
  v_vehicle_id uuid;
  v_already_installed numeric;
  v_component_id uuid;
  v_warranty_end date;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Business manager access required';
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Installed quantity must be positive'; END IF;

  SELECT l.* INTO v_line
  FROM public.parts_order_lines l
  JOIN public.parts_orders o ON o.id = l.order_id
  WHERE l.id = _order_line_id
    AND o.requester_business_id = _business_id
    AND o.work_order_id = _work_order_id
    AND o.status IN ('partially_received','received')
  FOR UPDATE OF l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Received order line is not linked to this work order'; END IF;

  SELECT w.vehicle_id INTO v_vehicle_id
  FROM shop_manager.work_orders w
  JOIN shop_manager.profiles p ON p.shop_id = w.shop_id
  WHERE w.id = _work_order_id
    AND (p.id = (select auth.uid()) OR p.user_id = (select auth.uid()));
  IF v_vehicle_id IS NULL THEN RAISE EXCEPTION 'The work order needs a vehicle before recording installation'; END IF;

  SELECT COALESCE(SUM(ic.installed_quantity), 0) INTO v_already_installed
  FROM public.installed_components ic WHERE ic.order_line_id = _order_line_id;
  IF _quantity > (v_line.received_quantity - v_already_installed) THEN
    RAISE EXCEPTION 'Installed quantity exceeds received quantity remaining';
  END IF;

  v_warranty_end := CASE
    WHEN v_line.warranty_months_snapshot IS NULL THEN NULL
    ELSE (_installed_at::date + make_interval(months => v_line.warranty_months_snapshot))::date
  END;

  INSERT INTO public.installed_components (
    business_id, order_line_id, catalog_part_id, work_order_id, shop_manager_vehicle_id,
    part_number_snapshot, name_snapshot, serial_number, position, installed_quantity,
    installed_at, installed_odometer_km, warranty_starts_at, warranty_ends_at,
    installer_user_id, notes
  ) VALUES (
    _business_id, _order_line_id, v_line.catalog_part_id, _work_order_id, v_vehicle_id,
    v_line.part_number_snapshot, v_line.name_snapshot, NULLIF(trim(_serial_number), ''),
    NULLIF(trim(_position), ''), _quantity, _installed_at, _installed_odometer_km,
    _installed_at::date, v_warranty_end, (select auth.uid()), NULLIF(trim(_notes), '')
  ) RETURNING id INTO v_component_id;

  RETURN jsonb_build_object('id', v_component_id, 'warranty_ends_at', v_warranty_end);
END;
$$;

REVOKE ALL ON FUNCTION public.record_installed_component(uuid,uuid,uuid,numeric,text,text,integer,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_installed_component(uuid,uuid,uuid,numeric,text,text,integer,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_parts_warranty_claim(
  _claimant_business_id uuid,
  _order_line_id uuid DEFAULT NULL,
  _installed_component_id uuid DEFAULT NULL,
  _issue_description text DEFAULT NULL,
  _failure_date date DEFAULT NULL,
  _odometer_km integer DEFAULT NULL,
  _evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_supplier_business_id uuid;
  v_claim public.parts_warranty_claims%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _claimant_business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Claimant business manager access required';
  END IF;
  IF _order_line_id IS NULL AND _installed_component_id IS NULL THEN
    RAISE EXCEPTION 'An order line or installed component is required';
  END IF;
  IF NULLIF(trim(_issue_description), '') IS NULL THEN RAISE EXCEPTION 'Issue description is required'; END IF;

  SELECT o.supplier_business_id INTO v_supplier_business_id
  FROM public.parts_order_lines l
  JOIN public.parts_orders o ON o.id = l.order_id
  WHERE l.id = COALESCE(
    _order_line_id,
    (SELECT ic.order_line_id FROM public.installed_components ic
      WHERE ic.id = _installed_component_id AND ic.business_id = _claimant_business_id)
  )
    AND o.requester_business_id = _claimant_business_id;
  IF v_supplier_business_id IS NULL THEN RAISE EXCEPTION 'Covered order line not found'; END IF;

  INSERT INTO public.parts_warranty_claims (
    order_line_id, installed_component_id, claimant_business_id, supplier_business_id,
    issue_description, failure_date, odometer_km, evidence, created_by, status_history
  ) VALUES (
    _order_line_id, _installed_component_id, _claimant_business_id, v_supplier_business_id,
    trim(_issue_description), _failure_date, _odometer_km, COALESCE(_evidence, '[]'::jsonb),
    (select auth.uid()),
    jsonb_build_array(jsonb_build_object('status','submitted','at',now(),'actor_id',(select auth.uid())))
  ) RETURNING * INTO v_claim;

  RETURN jsonb_build_object('id', v_claim.id, 'claim_number', v_claim.claim_number, 'status', v_claim.status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_parts_warranty_claim(uuid,uuid,uuid,text,date,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parts_warranty_claim(uuid,uuid,uuid,text,date,integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_return(
  _return_id uuid,
  _target_status text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_return public.parts_returns%ROWTYPE;
  v_requester_manager boolean;
  v_supplier_manager boolean;
  v_line record;
  v_quantity numeric;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_return FROM public.parts_returns WHERE id = _return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return not found'; END IF;
  v_requester_manager := public.has_business_role((select auth.uid()), v_return.requester_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_return.supplier_business_id, 'manager'::public.business_staff_role);
  IF _target_status IN ('cancelled','shipped') AND NOT v_requester_manager THEN RAISE EXCEPTION 'Requester manager access required'; END IF;
  IF _target_status NOT IN ('cancelled','shipped') AND NOT v_supplier_manager THEN RAISE EXCEPTION 'Supplier manager access required'; END IF;
  IF NOT (
    (v_return.status = 'requested' AND _target_status IN ('approved','rejected','cancelled'))
    OR (v_return.status = 'approved' AND _target_status IN ('shipped','received','cancelled'))
    OR (v_return.status = 'shipped' AND _target_status = 'received')
    OR (v_return.status = 'received' AND _target_status IN ('refunded','replaced','closed'))
    OR (v_return.status IN ('refunded','replaced') AND _target_status = 'closed')
  ) THEN RAISE EXCEPTION 'Invalid return transition from % to %', v_return.status, _target_status; END IF;

  IF _target_status = 'approved' THEN
    UPDATE public.parts_return_lines
      SET approved_quantity = quantity
      WHERE return_id = _return_id AND approved_quantity IS NULL;
  END IF;

  -- When the buyer ships a return (or the supplier receives an in-person
  -- return directly from Approved), remove it from the buyer's received stock.
  IF _target_status = 'shipped' OR (_target_status = 'received' AND v_return.status = 'approved') THEN
    FOR v_line IN
      SELECT rl.*, ol.destination_inventory_item_id, ol.name_snapshot
      FROM public.parts_return_lines rl
      JOIN public.parts_order_lines ol ON ol.id = rl.order_line_id
      WHERE rl.return_id = _return_id
      ORDER BY ol.destination_inventory_item_id
    LOOP
      v_quantity := COALESCE(v_line.approved_quantity, v_line.quantity);
      IF v_line.destination_inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'Received inventory link is missing for %', v_line.name_snapshot;
      END IF;
      PERFORM 1 FROM public.business_inventory_items
        WHERE id = v_line.destination_inventory_item_id AND qty_on_hand >= v_quantity FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient received stock to return %', v_line.name_snapshot; END IF;
      UPDATE public.business_inventory_items
        SET qty_on_hand = qty_on_hand - v_quantity
        WHERE id = v_line.destination_inventory_item_id;
      INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
      VALUES (
        v_line.destination_inventory_item_id, v_return.requester_business_id,
        -v_quantity, 'Return ' || v_return.return_number, (select auth.uid())
      );
    END LOOP;
  END IF;

  -- Supplier receipt puts approved stock back into the original source item.
  IF _target_status = 'received' THEN
    FOR v_line IN
      SELECT rl.*, ol.inventory_item_id, ol.name_snapshot
      FROM public.parts_return_lines rl
      JOIN public.parts_order_lines ol ON ol.id = rl.order_line_id
      WHERE rl.return_id = _return_id
      ORDER BY ol.inventory_item_id
    LOOP
      v_quantity := COALESCE(v_line.approved_quantity, v_line.quantity);
      IF v_line.inventory_item_id IS NOT NULL THEN
        UPDATE public.business_inventory_items
          SET qty_on_hand = qty_on_hand + v_quantity
          WHERE id = v_line.inventory_item_id;
        INSERT INTO public.business_inventory_movements (item_id, business_id, delta, reason, actor_id)
        VALUES (
          v_line.inventory_item_id, v_return.supplier_business_id,
          v_quantity, 'Received return ' || v_return.return_number, (select auth.uid())
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.parts_returns
  SET status = _target_status,
      supplier_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE supplier_note END,
      status_history = status_history || jsonb_build_array(jsonb_build_object(
        'status', _target_status, 'at', now(), 'actor_id', (select auth.uid()), 'note', NULLIF(trim(_note), '')
      )),
      resolved_at = CASE WHEN _target_status IN ('rejected','refunded','replaced','cancelled','closed') THEN now() ELSE resolved_at END
  WHERE id = _return_id;
  RETURN jsonb_build_object('id', _return_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_return(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_return(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_parts_warranty_claim(
  _claim_id uuid,
  _target_status text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim public.parts_warranty_claims%ROWTYPE;
  v_claimant_manager boolean;
  v_supplier_manager boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_claim FROM public.parts_warranty_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Warranty claim not found'; END IF;
  v_claimant_manager := public.has_business_role((select auth.uid()), v_claim.claimant_business_id, 'manager'::public.business_staff_role);
  v_supplier_manager := public.has_business_role((select auth.uid()), v_claim.supplier_business_id, 'manager'::public.business_staff_role);
  IF _target_status = 'cancelled' AND NOT v_claimant_manager THEN RAISE EXCEPTION 'Claimant manager access required'; END IF;
  IF _target_status <> 'cancelled' AND NOT v_supplier_manager THEN RAISE EXCEPTION 'Supplier manager access required'; END IF;
  IF NOT (
    (v_claim.status = 'submitted' AND _target_status IN ('reviewing','approved','rejected','cancelled'))
    OR (v_claim.status = 'reviewing' AND _target_status IN ('approved','rejected'))
    OR (v_claim.status = 'approved' AND _target_status IN ('replacement_sent','credit_issued','closed'))
    OR (v_claim.status IN ('replacement_sent','credit_issued') AND _target_status = 'closed')
  ) THEN RAISE EXCEPTION 'Invalid warranty transition from % to %', v_claim.status, _target_status; END IF;

  UPDATE public.parts_warranty_claims
  SET status = _target_status,
      decision_note = CASE WHEN v_supplier_manager AND NULLIF(trim(_note), '') IS NOT NULL THEN _note ELSE decision_note END,
      status_history = status_history || jsonb_build_array(jsonb_build_object(
        'status', _target_status, 'at', now(), 'actor_id', (select auth.uid()), 'note', NULLIF(trim(_note), '')
      )),
      resolved_at = CASE WHEN _target_status IN ('rejected','replacement_sent','credit_issued','cancelled','closed') THEN now() ELSE resolved_at END
  WHERE id = _claim_id;
  RETURN jsonb_build_object('id', _claim_id, 'status', _target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_parts_warranty_claim(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_parts_warranty_claim(uuid,text,text) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260831113000_business_associate_enrollment.sql
-- ============================================================================
-- Business-linked enrollment for the 365 Associate Network.
-- Additive: existing supplier applications, businesses, inventory and Shop Manager remain intact.

CREATE TABLE IF NOT EXISTS public.business_associate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  track text NOT NULL CHECK (track IN ('parts_supplier','repair_shop','both')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','approved','rejected','suspended','withdrawn')),
  terms_version text NOT NULL DEFAULT 'associate-v1',
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_associate_status_idx
  ON public.business_associate_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS business_associate_applicant_idx
  ON public.business_associate_applications(applicant_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS business_associate_reviewer_idx
  ON public.business_associate_applications(reviewed_by) WHERE reviewed_by IS NOT NULL;

ALTER TABLE public.business_associate_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_associate_applications FROM anon, authenticated;
GRANT SELECT ON public.business_associate_applications TO authenticated;
GRANT ALL ON public.business_associate_applications TO service_role;

CREATE POLICY "associate applications: business members read"
  ON public.business_associate_applications FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE OR REPLACE FUNCTION public.apply_business_associate(
  _business_id uuid,
  _track text,
  _terms_version text DEFAULT 'associate-v1'
) RETURNS public.business_associate_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.business_associate_applications%ROWTYPE;
  v_result public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _track NOT IN ('parts_supplier','repair_shop','both') THEN RAISE EXCEPTION 'Invalid Associate track'; END IF;
  IF NOT public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role) THEN
    RAISE EXCEPTION 'Business owner or manager access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.status = 'active') THEN
    RAISE EXCEPTION 'The business must be active before applying';
  END IF;

  SELECT * INTO v_existing FROM public.business_associate_applications
  WHERE business_id = _business_id FOR UPDATE;
  IF FOUND AND v_existing.status IN ('approved','suspended') THEN
    RAISE EXCEPTION 'This business already has an approved or suspended Associate record';
  END IF;

  INSERT INTO public.business_associate_applications (
    business_id, applicant_user_id, track, status, terms_version,
    terms_accepted_at, submitted_at, reviewed_at, reviewed_by, review_note
  ) VALUES (
    _business_id, (select auth.uid()), _track, 'pending',
    COALESCE(NULLIF(trim(_terms_version), ''), 'associate-v1'),
    now(), now(), NULL, NULL, NULL
  )
  ON CONFLICT (business_id) DO UPDATE SET
    applicant_user_id = EXCLUDED.applicant_user_id,
    track = EXCLUDED.track,
    status = 'pending',
    terms_version = EXCLUDED.terms_version,
    terms_accepted_at = now(),
    submitted_at = now(),
    reviewed_at = NULL,
    reviewed_by = NULL,
    review_note = NULL,
    updated_at = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_business_associate(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_business_associate_application(
  _application_id uuid,
  _status text,
  _review_note text DEFAULT NULL
) RETURNS public.business_associate_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF _status NOT IN ('reviewing','approved','rejected','suspended') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;
  UPDATE public.business_associate_applications SET
    status = _status,
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    review_note = NULLIF(trim(_review_note), ''),
    approved_at = CASE WHEN _status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
    updated_at = now()
  WHERE id = _application_id
  RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Associate application not found'; END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_business_associate_application(uuid,text,text) TO authenticated;

CREATE OR REPLACE VIEW public.associate_businesses_public
WITH (security_invoker = true)
AS
SELECT business_id, track, approved_at
FROM public.business_associate_applications
WHERE status = 'approved';

CREATE POLICY "associate applications: approved public read"
  ON public.business_associate_applications FOR SELECT TO anon
  USING (status = 'approved');
GRANT SELECT (business_id, track, status, approved_at)
  ON public.business_associate_applications TO anon;
GRANT SELECT ON public.associate_businesses_public TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260831113100_harden_business_associate_rpc.sql
-- ============================================================================
-- Explicit API-role hardening for projects with inherited legacy function grants.
REVOKE ALL ON FUNCTION public.apply_business_associate(uuid,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.review_business_associate_application(uuid,text,text) FROM anon;

CREATE INDEX IF NOT EXISTS business_associate_reviewer_idx
  ON public.business_associate_applications(reviewed_by)
  WHERE reviewed_by IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260831113150_grant_associate_public_projection.sql
-- ============================================================================
-- security_invoker views require source-column privileges in addition to RLS.
-- Expose only the fields required to identify approved Associate businesses.
GRANT SELECT (business_id, track, status, approved_at)
  ON public.business_associate_applications TO anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260831113200_associate_enrollment_acceptance_test.sql
-- ============================================================================
-- Atomic live acceptance test for Associate enrollment and public map visibility.
-- Uses an existing eligible owner/business only inside this transaction and removes
-- the temporary application before commit. Any failed assertion aborts the migration.

CREATE TEMP TABLE associate_acceptance_fixture ON COMMIT DROP AS
SELECT
  b.id AS business_id,
  b.owner_id,
  NULL::uuid AS application_id,
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.user_id LIMIT 1) AS admin_id,
  (SELECT u.id FROM auth.users u
   WHERE u.id <> b.owner_id
     AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role = 'admin')
     AND NOT public.is_business_member(u.id, b.id)
   ORDER BY u.id LIMIT 1) AS outsider_id
FROM public.businesses b
WHERE b.status = 'active'
  AND b.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.business_associate_applications a WHERE a.business_id = b.id
  )
ORDER BY b.created_at
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM associate_acceptance_fixture
    WHERE business_id IS NOT NULL AND owner_id IS NOT NULL
      AND admin_id IS NOT NULL AND outsider_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Associate acceptance fixtures unavailable';
  END IF;
END;
$$;

CREATE TEMP TABLE associate_acceptance_results (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
) ON COMMIT DROP;
GRANT SELECT, UPDATE ON associate_acceptance_fixture TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON associate_acceptance_results TO authenticated, anon;

SELECT set_config('request.jwt.claim.sub', (SELECT owner_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT owner_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'owner_application_created', x.status = 'pending' AND x.track = 'both', x.status
FROM public.apply_business_associate(
  (SELECT business_id FROM associate_acceptance_fixture), 'both', 'associate-v1'
) x;
UPDATE associate_acceptance_fixture
SET application_id = (
  SELECT id FROM public.business_associate_applications
  WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT outsider_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT outsider_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.apply_business_associate(
      (SELECT business_id FROM associate_acceptance_fixture), 'parts_supplier', 'associate-v1'
    );
    INSERT INTO associate_acceptance_results VALUES (
      'cross_tenant_application_denied', false, 'unexpectedly allowed'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO associate_acceptance_results VALUES (
      'cross_tenant_application_denied', true, SQLSTATE
    );
  END;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT admin_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'admin_approval', x.status = 'approved' AND x.approved_at IS NOT NULL, x.status
FROM public.review_business_associate_application(
  (SELECT application_id FROM associate_acceptance_fixture),
  'approved', 'atomic acceptance test'
) x;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
INSERT INTO associate_acceptance_results
SELECT 'approved_public_projection', count(*) = 1, count(*)::text
FROM public.associate_businesses_public
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT admin_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'admin_suspension', x.status = 'suspended', x.status
FROM public.review_business_associate_application(
  (SELECT application_id FROM associate_acceptance_fixture),
  'suspended', 'atomic acceptance test'
) x;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
INSERT INTO associate_acceptance_results
SELECT 'suspension_removes_public_projection', count(*) = 0, count(*)::text
FROM public.associate_businesses_public
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture);
RESET ROLE;

DO $$
DECLARE v_count integer; v_passed boolean;
BEGIN
  SELECT count(*), bool_and(passed) INTO v_count, v_passed
  FROM associate_acceptance_results;
  IF v_count <> 6 OR NOT COALESCE(v_passed, false) THEN
    RAISE EXCEPTION 'Associate acceptance failed: %', (
      SELECT jsonb_object_agg(name, jsonb_build_object('passed', passed, 'detail', detail))
      FROM associate_acceptance_results
    );
  END IF;
END;
$$;

DELETE FROM public.business_associate_applications
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
  AND review_note = 'atomic acceptance test';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.business_associate_applications
    WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
  ) THEN
    RAISE EXCEPTION 'Associate acceptance cleanup failed';
  END IF;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260831114500_associate_privacy_customer_vehicle_ledger.sql
-- ============================================================================
-- Associate privacy, offboarding, live-stock freshness, and consented vehicle history.
-- Additive: private business ledgers and all historical transactions are retained.

ALTER TABLE public.business_associate_applications
  ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS offboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS offboard_reason text,
  ADD COLUMN IF NOT EXISTS last_transaction_at timestamptz;

UPDATE public.business_associate_applications
SET access_enabled = (status = 'approved'),
    access_enabled_at = CASE WHEN status = 'approved' THEN COALESCE(access_enabled_at, approved_at, reviewed_at) ELSE access_enabled_at END,
    access_disabled_at = CASE WHEN status IN ('suspended','withdrawn','rejected') THEN COALESCE(access_disabled_at, reviewed_at, updated_at) ELSE access_disabled_at END;

CREATE OR REPLACE FUNCTION public.is_active_associate(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_associate_applications a
    JOIN public.businesses b ON b.id = a.business_id
    WHERE a.business_id = _business_id
      AND a.status = 'approved'
      AND a.access_enabled
      AND a.offboarded_at IS NULL
      AND b.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_associate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_associate(uuid) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.associate_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  application_id uuid REFERENCES public.business_associate_applications(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('approved','access_enabled','access_disabled','suspended','offboarded','reinstated','api_connected','api_disconnected')),
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS associate_access_audit_business_idx ON public.associate_access_audit(business_id, occurred_at DESC);
ALTER TABLE public.associate_access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.associate_access_audit FROM anon, authenticated;
GRANT SELECT ON public.associate_access_audit TO authenticated;
GRANT ALL ON public.associate_access_audit TO service_role;
CREATE POLICY "associate access audit: managers and admins read" ON public.associate_access_audit
  FOR SELECT TO authenticated USING (
    public.is_business_member((select auth.uid()), business_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.associate_api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  connection_name text NOT NULL,
  provider text NOT NULL DEFAULT 'associate_api',
  credential_reference text, -- reference to a secrets manager only; never store API secrets here
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','revoked')),
  last_heartbeat_at timestamptz,
  last_sync_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, connection_name)
);
ALTER TABLE public.associate_api_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.associate_api_connections FROM anon, authenticated;
GRANT SELECT ON public.associate_api_connections TO authenticated;
GRANT ALL ON public.associate_api_connections TO service_role;
CREATE POLICY "associate api: managers and admins read" ON public.associate_api_connections
  FOR SELECT TO authenticated USING (
    public.is_business_member((select auth.uid()), business_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

ALTER TABLE public.business_inventory_locations
  ADD COLUMN IF NOT EXISTS inventory_source text NOT NULL DEFAULT 'manual'
    CHECK (inventory_source IN ('manual','api','shop_manager','import')),
  ADD COLUMN IF NOT EXISTS last_inventory_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS stale_after_minutes integer NOT NULL DEFAULT 1440
    CHECK (stale_after_minutes BETWEEN 5 AND 43200);

-- New commercial transactions require active Associate access. Existing orders,
-- returns, warranties, and their history remain available for completion/audit.
CREATE OR REPLACE FUNCTION public.enforce_active_associate_on_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_active_associate(NEW.requester_business_id) THEN
    RAISE EXCEPTION 'Requesting business does not have active 365 Associate access';
  END IF;
  IF NOT public.is_active_associate(NEW.supplier_business_id) THEN
    RAISE EXCEPTION 'Supplying business does not have active 365 Associate access';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS parts_orders_require_active_associates ON public.parts_orders;
CREATE TRIGGER parts_orders_require_active_associates
  BEFORE INSERT ON public.parts_orders FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_associate_on_new_order();
REVOKE ALL ON FUNCTION public.enforce_active_associate_on_new_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_active_associate_on_new_order() TO service_role;

CREATE OR REPLACE FUNCTION public.touch_associate_last_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.business_associate_applications
  SET last_transaction_at = GREATEST(COALESCE(last_transaction_at, '-infinity'::timestamptz), NEW.created_at),
      updated_at = now()
  WHERE business_id IN (
    SELECT requester_business_id FROM public.parts_orders WHERE id = NEW.order_id
    UNION
    SELECT supplier_business_id FROM public.parts_orders WHERE id = NEW.order_id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS parts_order_events_touch_associate ON public.parts_order_events;
CREATE TRIGGER parts_order_events_touch_associate
  AFTER INSERT ON public.parts_order_events FOR EACH ROW
  EXECUTE FUNCTION public.touch_associate_last_transaction();
REVOKE ALL ON FUNCTION public.touch_associate_last_transaction() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_associate_last_transaction() TO service_role;

CREATE OR REPLACE FUNCTION public.offboard_business_associate(
  _application_id uuid,
  _reason text
) RETURNS public.business_associate_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app public.business_associate_applications%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(_reason), '') IS NULL THEN RAISE EXCEPTION 'An offboarding reason is required'; END IF;

  SELECT * INTO v_app FROM public.business_associate_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Associate application not found'; END IF;

  UPDATE public.business_associate_applications SET
    status = 'suspended', access_enabled = false, access_disabled_at = now(),
    offboarded_at = now(), offboard_reason = trim(_reason), reviewed_at = now(),
    reviewed_by = (select auth.uid()), review_note = trim(_reason), updated_at = now()
  WHERE id = _application_id RETURNING * INTO v_app;

  UPDATE public.businesses SET expose_inventory_to_network = false,
    network_exposure_status = 'revoked', network_exposure_reviewed_at = now(),
    network_exposure_reviewed_by = (select auth.uid()),
    network_exposure_review_note = trim(_reason), updated_at = now()
  WHERE id = v_app.business_id;

  UPDATE public.associate_api_connections SET status = 'revoked', revoked_at = now(),
    revoked_by = (select auth.uid()), credential_reference = NULL, updated_at = now()
  WHERE business_id = v_app.business_id AND status <> 'revoked';

  INSERT INTO public.associate_access_audit
    (business_id, application_id, actor_id, event_type, previous_status, new_status, reason)
  VALUES (v_app.business_id, v_app.id, (select auth.uid()), 'offboarded', 'approved', 'suspended', trim(_reason));
  RETURN v_app;
END;
$$;
REVOKE ALL ON FUNCTION public.offboard_business_associate(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offboard_business_associate(uuid,text) TO authenticated;

-- Keep approval state and legacy network-exposure state synchronized.
CREATE OR REPLACE FUNCTION public.sync_associate_access_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    NEW.access_enabled := true;
    NEW.access_enabled_at := COALESCE(NEW.access_enabled_at, now());
    NEW.access_disabled_at := NULL;
    NEW.offboarded_at := NULL;
    NEW.offboard_reason := NULL;
    UPDATE public.businesses SET expose_inventory_to_network = true,
      network_exposure_status = 'approved', network_exposure_reviewed_at = now(), updated_at = now()
    WHERE id = NEW.business_id;
  ELSIF NEW.status IN ('suspended','withdrawn','rejected') THEN
    NEW.access_enabled := false;
    NEW.access_disabled_at := COALESCE(NEW.access_disabled_at, now());
    UPDATE public.businesses SET expose_inventory_to_network = false,
      network_exposure_status = 'revoked', network_exposure_reviewed_at = now(), updated_at = now()
    WHERE id = NEW.business_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS business_associate_sync_access ON public.business_associate_applications;
CREATE TRIGGER business_associate_sync_access
  BEFORE INSERT OR UPDATE OF status ON public.business_associate_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_associate_access_state();
REVOKE ALL ON FUNCTION public.sync_associate_access_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_associate_access_state() TO service_role;

-- Customer identity stays private. Cross-location visibility is explicit and revocable.
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_business_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  purpose text NOT NULL DEFAULT 'service_and_warranty',
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('pending','granted','revoked','expired')),
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  terms_version text NOT NULL DEFAULT 'customer-network-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_account_id, business_id, purpose)
);
CREATE TABLE IF NOT EXISTS public.vehicle_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE RESTRICT,
  business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('part_ordered','part_paid','part_installed','service','inspection','warranty_opened','warranty_resolved','return_opened','return_resolved','odometer','ownership_note')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  odometer_km integer CHECK (odometer_km IS NULL OR odometer_km >= 0),
  title text NOT NULL,
  summary text,
  source_table text,
  source_id uuid,
  verification_status text NOT NULL DEFAULT 'business_attested' CHECK (verification_status IN ('customer_entered','business_attested','365_verified')),
  public_summary_allowed boolean NOT NULL DEFAULT false,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_history_events_vehicle_idx ON public.vehicle_history_events(vehicle_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_history_events_source_idx ON public.vehicle_history_events(source_table, source_id, event_type) WHERE source_id IS NOT NULL;

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_business_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_history_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events FROM anon, authenticated;
GRANT SELECT ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events TO authenticated;
GRANT ALL ON public.customer_accounts, public.customer_business_consents, public.vehicle_history_events TO service_role;
CREATE POLICY "customer accounts: owner read" ON public.customer_accounts FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "customer consents: customer or business read" ON public.customer_business_consents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.customer_accounts c WHERE c.id = customer_account_id AND c.user_id = (select auth.uid()))
  OR public.is_business_member((select auth.uid()), business_id)
);
CREATE POLICY "vehicle history: owner or consented business read" ON public.vehicle_history_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.customer_accounts c WHERE c.id = customer_account_id AND c.user_id = (select auth.uid()))
  OR (business_id IS NOT NULL AND public.is_business_member((select auth.uid()), business_id)
      AND EXISTS (SELECT 1 FROM public.customer_business_consents cc WHERE cc.customer_account_id = vehicle_history_events.customer_account_id
        AND cc.business_id = vehicle_history_events.business_id AND cc.status = 'granted'
        AND (cc.expires_at IS NULL OR cc.expires_at > now())))
  OR public.has_role((select auth.uid()), 'admin'::public.app_role)
);

CREATE POLICY "vehicle history: opted-in public summary" ON public.vehicle_history_events
  FOR SELECT TO anon, authenticated USING (
    public_summary_allowed AND EXISTS (
      SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.is_public
    )
  );
GRANT SELECT (id, vehicle_id, event_type, occurred_at, odometer_km, title, summary, verification_status, public_summary_allowed)
  ON public.vehicle_history_events TO anon;

CREATE OR REPLACE FUNCTION public.ensure_customer_account(_display_name text DEFAULT NULL)
RETURNS public.customer_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_account public.customer_accounts%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.customer_accounts(user_id, display_name)
  VALUES ((select auth.uid()), NULLIF(trim(_display_name), ''))
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name), ''), customer_accounts.display_name),
    updated_at = now()
  RETURNING * INTO v_account;
  RETURN v_account;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_customer_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_customer_account(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_customer_business_consent(
  _business_id uuid, _purpose text, _grant boolean, _expires_at timestamptz DEFAULT NULL
) RETURNS public.customer_business_consents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_customer public.customer_accounts%ROWTYPE; v_consent public.customer_business_consents%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_customer FROM public.customer_accounts WHERE user_id = (select auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Create a customer account first'; END IF;
  IF NOT public.is_active_associate(_business_id) THEN RAISE EXCEPTION 'Business is not an active 365 Associate'; END IF;
  IF NULLIF(trim(_purpose), '') IS NULL THEN RAISE EXCEPTION 'Consent purpose is required'; END IF;
  INSERT INTO public.customer_business_consents
    (customer_account_id, business_id, purpose, status, granted_at, revoked_at, expires_at)
  VALUES (v_customer.id, _business_id, trim(_purpose), CASE WHEN _grant THEN 'granted' ELSE 'revoked' END,
    CASE WHEN _grant THEN now() END, CASE WHEN NOT _grant THEN now() END, CASE WHEN _grant THEN _expires_at END)
  ON CONFLICT (customer_account_id, business_id, purpose) DO UPDATE SET
    status = EXCLUDED.status, granted_at = CASE WHEN _grant THEN now() ELSE customer_business_consents.granted_at END,
    revoked_at = CASE WHEN _grant THEN NULL ELSE now() END, expires_at = EXCLUDED.expires_at, updated_at = now()
  RETURNING * INTO v_consent;
  RETURN v_consent;
END;
$$;
REVOKE ALL ON FUNCTION public.set_customer_business_consent(uuid,text,boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_business_consent(uuid,text,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_vehicle_history_event(
  _vehicle_id uuid, _customer_account_id uuid, _business_id uuid, _event_type text,
  _occurred_at timestamptz, _title text, _summary text DEFAULT NULL, _odometer_km integer DEFAULT NULL,
  _source_table text DEFAULT NULL, _source_id uuid DEFAULT NULL, _public_summary_allowed boolean DEFAULT false,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.vehicle_history_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_event public.vehicle_history_events%ROWTYPE; v_is_owner boolean; v_is_business boolean;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.customer_accounts c
    WHERE c.id = _customer_account_id AND c.user_id = (select auth.uid())) INTO v_is_owner;
  v_is_business := _business_id IS NOT NULL
    AND public.is_active_associate(_business_id)
    AND public.has_business_role((select auth.uid()), _business_id, 'manager'::public.business_staff_role)
    AND EXISTS (SELECT 1 FROM public.customer_business_consents cc
      WHERE cc.customer_account_id = _customer_account_id AND cc.business_id = _business_id
        AND cc.status = 'granted' AND (cc.expires_at IS NULL OR cc.expires_at > now()));
  IF NOT v_is_owner AND NOT v_is_business THEN RAISE EXCEPTION 'Customer consent or vehicle-owner access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vehicles v JOIN public.customer_accounts c ON c.user_id = v.owner_user_id
    WHERE v.id = _vehicle_id AND c.id = _customer_account_id) THEN
    RAISE EXCEPTION 'Vehicle is not linked to this customer account';
  END IF;
  INSERT INTO public.vehicle_history_events(vehicle_id, customer_account_id, business_id, event_type,
    occurred_at, odometer_km, title, summary, source_table, source_id, verification_status,
    public_summary_allowed, actor_id, metadata)
  VALUES (_vehicle_id, _customer_account_id, _business_id, _event_type, COALESCE(_occurred_at, now()),
    _odometer_km, trim(_title), NULLIF(trim(_summary), ''), NULLIF(trim(_source_table), ''), _source_id,
    CASE WHEN v_is_business THEN 'business_attested' ELSE 'customer_entered' END,
    CASE WHEN v_is_owner THEN _public_summary_allowed ELSE false END, (select auth.uid()), COALESCE(_metadata, '{}'::jsonb))
  RETURNING * INTO v_event;
  RETURN v_event;
END;
$$;
REVOKE ALL ON FUNCTION public.append_vehicle_history_event(uuid,uuid,uuid,text,timestamptz,text,text,integer,text,uuid,boolean,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_vehicle_history_event(uuid,uuid,uuid,text,timestamptz,text,text,integer,text,uuid,boolean,jsonb) TO authenticated;

CREATE OR REPLACE VIEW public.vehicle_history_public
WITH (security_invoker = true) AS
SELECT e.id, e.vehicle_id, e.event_type, e.occurred_at, e.odometer_km, e.title,
  e.summary, e.verification_status
FROM public.vehicle_history_events e
JOIN public.vehicles v ON v.id = e.vehicle_id
WHERE v.is_public AND e.public_summary_allowed;
GRANT SELECT ON public.vehicle_history_public TO anon, authenticated;

-- Rebuild the minimum network projection. Private cost, notes, bins, customer data,
-- exact API configuration, and non-published inventory never enter this view.
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.brand, i.unit, i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty, i.price, i.catalog_part_id,
  i.manufacturer_part_number, i.oem_part_number, i.item_condition, i.lead_time_hours,
  i.fulfillment_methods, COALESCE(i.warranty_months, c.warranty_months) AS warranty_months,
  i.location_id AS stock_location_id, COALESCE(l.name, b.name) AS stock_location_name,
  i.updated_at, b.name AS business_name, b.slug AS business_slug,
  COALESCE(l.city, b.city) AS city, COALESCE(l.province, b.province) AS province,
  COALESCE(l.region, b.region) AS region, COALESCE(l.lat, b.lat) AS lat, COALESCE(l.lng, b.lng) AS lng,
  COALESCE(c.compatible_makes, ARRAY[]::text[]) || COALESCE(fit.makes, ARRAY[]::text[]) AS compatible_makes,
  COALESCE(c.compatible_models, ARRAY[]::text[]) || COALESCE(fit.models, ARRAY[]::text[]) AS compatible_models,
  COALESCE(c.year_min, fit.year_min) AS year_min, COALESCE(c.year_max, fit.year_max) AS year_max,
  c.manufacturer AS catalog_manufacturer, c.manufacturer_part_number AS catalog_part_number,
  COALESCE(fit.profiles, '[]'::jsonb) AS fitment_profiles,
  CASE WHEN l.inventory_source = 'api' THEN l.last_inventory_sync_at ELSE i.updated_at END AS stock_verified_at
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
JOIN public.business_associate_applications a ON a.business_id = b.id
LEFT JOIN public.business_inventory_locations l ON l.id = i.location_id AND l.business_id = i.business_id AND l.active
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT vp.make) FILTER (WHERE vp.make IS NOT NULL) AS makes,
    array_agg(DISTINCT vp.model) FILTER (WHERE vp.model IS NOT NULL) AS models,
    min(vp.year_min) AS year_min, max(vp.year_max) AS year_max,
    jsonb_agg(jsonb_build_object('profile_id',vp.id,'make',vp.make,'model',vp.model,'variant',vp.variant,
      'year_min',vp.year_min,'year_max',vp.year_max,'engine_code',vp.engine_code,'chassis_code',vp.chassis_code,
      'position',pf.position,'confidence',pf.confidence)) AS profiles
  FROM public.parts_fitment pf JOIN public.parts_vehicle_profiles vp ON vp.id = pf.vehicle_profile_id
  WHERE pf.product_id = c.id AND pf.fitment_status = 'confirmed' AND vp.status = 'approved'
) fit ON true
WHERE i.active AND i.network_visible AND GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) > 0
  AND (l.id IS NULL OR l.network_visible)
  AND (l.id IS NULL OR l.inventory_source <> 'api' OR (l.last_inventory_sync_at IS NOT NULL
       AND l.last_inventory_sync_at > now() - make_interval(mins => l.stale_after_minutes)))
  AND b.expose_inventory_to_network AND b.network_exposure_status = 'approved' AND b.status = 'active'
  AND a.status = 'approved' AND a.access_enabled AND a.offboarded_at IS NULL;
GRANT SELECT ON public.network_stock TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260831124952_employee_operations_ledger.sql
-- ============================================================================
-- Nextpart-style employee operating layer for Shop Manager.
-- Additive: existing work orders, inventory, customers, invoices, payments,
-- purchase orders, discounts, and reports remain the systems of record.

CREATE TABLE IF NOT EXISTS shop_manager.employee_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'store'
    CHECK (location_type IN ('store','parts_counter','service_desk','warehouse','office','mobile','other')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id,name)
);
CREATE INDEX IF NOT EXISTS employee_work_locations_shop_idx
  ON shop_manager.employee_work_locations(shop_id,active,name);
INSERT INTO shop_manager.employee_work_locations(shop_id,name,location_type)
SELECT s.id,COALESCE(NULLIF(trim(s.name),''),'Main location'),'store'
FROM shop_manager.shops s
ON CONFLICT (shop_id,name) DO NOTHING;

CREATE OR REPLACE FUNCTION shop_manager.create_default_employee_work_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
BEGIN
  INSERT INTO shop_manager.employee_work_locations(shop_id,name,location_type)
  VALUES(NEW.id,COALESCE(NULLIF(trim(NEW.name),''),'Main location'),'store')
  ON CONFLICT (shop_id,name) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shops_create_employee_work_location ON shop_manager.shops;
CREATE TRIGGER shops_create_employee_work_location
  AFTER INSERT ON shop_manager.shops FOR EACH ROW
  EXECUTE FUNCTION shop_manager.create_default_employee_work_location();

CREATE TABLE IF NOT EXISTS shop_manager.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES shop_manager.employee_work_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'on_shift'
    CHECK (status IN ('on_shift','on_break','completed','manager_closed')),
  clocked_in_at timestamptz NOT NULL DEFAULT now(),
  clocked_out_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  opening_note text,
  closing_note text,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clocked_out_at IS NULL OR clocked_out_at >= clocked_in_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS employee_shifts_one_open_per_user
  ON shop_manager.employee_shifts(user_id) WHERE status IN ('on_shift','on_break');
CREATE INDEX IF NOT EXISTS employee_shifts_shop_time_idx
  ON shop_manager.employee_shifts(shop_id, clocked_in_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_shift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shop_manager.employee_shifts(id) ON DELETE RESTRICT,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'clock_in','break_start','break_end','clock_out','manager_close','note'
  )),
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS employee_shift_events_shift_idx
  ON shop_manager.employee_shift_events(shift_id, occurred_at);
CREATE INDEX IF NOT EXISTS employee_shift_events_shop_idx
  ON shop_manager.employee_shift_events(shop_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  requested_by_profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id) ON DELETE RESTRICT,
  requested_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_type text NOT NULL CHECK (request_type IN (
    'discount','price_override','return','refund','void_payment','stock_adjustment','credit','other'
  )),
  entity_type text,
  entity_id text,
  requested_value numeric,
  original_value numeric,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','expired')),
  decided_by_profile_id uuid REFERENCES shop_manager.profiles(id) ON DELETE SET NULL,
  decided_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS employee_approvals_shop_status_idx
  ON shop_manager.employee_approval_requests(shop_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS employee_approvals_requester_idx
  ON shop_manager.employee_approval_requests(requested_by_profile_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS shop_manager.employee_operational_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,
  profile_id uuid REFERENCES shop_manager.profiles(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES shop_manager.employee_shifts(id) ON DELETE SET NULL,
  event_category text NOT NULL CHECK (event_category IN (
    'shift','customer','sale','payment','pricing','discount','inventory','receiving',
    'transfer','return','warranty','work_order','order','security','other'
  )),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  customer_id uuid REFERENCES shop_manager.customers(id) ON DELETE SET NULL,
  amount numeric,
  quantity numeric,
  approval_request_id uuid REFERENCES shop_manager.employee_approval_requests(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'shop_manager'
);
CREATE INDEX IF NOT EXISTS employee_ops_shop_time_idx
  ON shop_manager.employee_operational_events(shop_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS employee_ops_profile_time_idx
  ON shop_manager.employee_operational_events(profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS employee_ops_entity_idx
  ON shop_manager.employee_operational_events(entity_type, entity_id, occurred_at DESC)
  WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employee_ops_customer_idx
  ON shop_manager.employee_operational_events(customer_id, occurred_at DESC)
  WHERE customer_id IS NOT NULL;

ALTER TABLE shop_manager.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_shift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.employee_operational_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  FROM anon, authenticated;
GRANT SELECT ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  TO authenticated;
GRANT ALL ON shop_manager.employee_work_locations, shop_manager.employee_shifts, shop_manager.employee_shift_events,
  shop_manager.employee_approval_requests, shop_manager.employee_operational_events
  TO service_role;

CREATE OR REPLACE FUNCTION shop_manager.is_shop_operations_manager(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
  SELECT shop_manager.user_belongs_to_shop(_user_id, _shop_id)
    AND (
      shop_manager.has_role(_user_id, 'owner'::text)
      OR shop_manager.has_role(_user_id, 'admin'::text)
      OR shop_manager.has_role(_user_id, 'manager'::text)
      OR shop_manager.has_role(_user_id, 'operations_manager'::text)
      OR shop_manager.has_role(_user_id, 'parts_manager'::text)
      OR shop_manager.has_role(_user_id, 'office_admin'::text)
    );
$$;
REVOKE ALL ON FUNCTION shop_manager.is_shop_operations_manager(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.is_shop_operations_manager(uuid,uuid) TO authenticated, service_role;

CREATE POLICY employee_shifts_read ON shop_manager.employee_shifts FOR SELECT TO authenticated USING (
  user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_work_locations_read ON shop_manager.employee_work_locations FOR SELECT TO authenticated USING (
  shop_manager.user_belongs_to_shop((select auth.uid()),shop_id)
);
CREATE POLICY employee_shift_events_read ON shop_manager.employee_shift_events FOR SELECT TO authenticated USING (
  actor_user_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM shop_manager.employee_shifts s WHERE s.id = shift_id AND s.user_id = (select auth.uid()))
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_approvals_read ON shop_manager.employee_approval_requests FOR SELECT TO authenticated USING (
  requested_by_user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);
CREATE POLICY employee_operational_events_read ON shop_manager.employee_operational_events FOR SELECT TO authenticated USING (
  actor_user_id = (select auth.uid())
  OR shop_manager.is_shop_operations_manager((select auth.uid()), shop_id)
);

CREATE OR REPLACE FUNCTION shop_manager.current_employee_profile()
RETURNS shop_manager.profiles LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
  SELECT p FROM shop_manager.profiles p
  WHERE p.user_id = (select auth.uid()) OR p.id = (select auth.uid())
  ORDER BY (p.user_id = (select auth.uid())) DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION shop_manager.current_employee_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.current_employee_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_operating_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE; v_roles jsonb; v_locations jsonb;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No Shop Manager employee profile is linked to this account'; END IF;
  SELECT COALESCE(jsonb_agg(r.name::text ORDER BY r.name::text), '[]'::jsonb) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id = ur.role_id
  WHERE ur.user_id IN (v_profile.id, (select auth.uid()));
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id = (select auth.uid()) AND status IN ('on_shift','on_break')
  ORDER BY clocked_in_at DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'location_type',l.location_type) ORDER BY l.name),'[]'::jsonb)
  INTO v_locations FROM shop_manager.employee_work_locations l WHERE l.shop_id=v_profile.shop_id AND l.active;
  RETURN jsonb_build_object(
    'shop_id', v_profile.shop_id, 'profile_id', v_profile.id,
    'employee_name', COALESCE(v_profile.full_name, concat_ws(' ',v_profile.first_name,v_profile.last_name),v_profile.email),
    'job_title', v_profile.job_title, 'department', v_profile.department, 'roles', v_roles,
    'locations', v_locations,
    'can_manage', shop_manager.is_shop_operations_manager((select auth.uid()), v_profile.shop_id),
    'active_shift', CASE WHEN v_shift.id IS NULL THEN NULL ELSE to_jsonb(v_shift) END
  );
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_operating_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_operating_context() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_shift_action(
  _action text, _note text DEFAULT NULL, _location_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE; v_event text;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No employee profile or shop is linked to this account'; END IF;
  IF _location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM shop_manager.employee_work_locations
    WHERE id = _location_id AND shop_id = v_profile.shop_id AND active
  ) THEN RAISE EXCEPTION 'Invalid or inactive location'; END IF;
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id = (select auth.uid()) AND status IN ('on_shift','on_break')
  FOR UPDATE;

  IF _action = 'clock_in' THEN
    IF FOUND THEN RAISE EXCEPTION 'You already have an active shift'; END IF;
    INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id,location_id,opening_note)
    VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),_location_id,NULLIF(trim(_note),'')) RETURNING * INTO v_shift;
    v_event := 'clock_in';
  ELSIF _action = 'break_start' THEN
    IF NOT FOUND OR v_shift.status <> 'on_shift' THEN RAISE EXCEPTION 'Clock in before starting a break'; END IF;
    UPDATE shop_manager.employee_shifts SET status='on_break',updated_at=now() WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'break_start';
  ELSIF _action = 'break_end' THEN
    IF NOT FOUND OR v_shift.status <> 'on_break' THEN RAISE EXCEPTION 'No active break to end'; END IF;
    UPDATE shop_manager.employee_shifts SET status='on_shift',updated_at=now() WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'break_end';
  ELSIF _action = 'clock_out' THEN
    IF NOT FOUND THEN RAISE EXCEPTION 'No active shift to close'; END IF;
    UPDATE shop_manager.employee_shifts SET status='completed',clocked_out_at=now(),closing_note=NULLIF(trim(_note),''),updated_at=now()
    WHERE id=v_shift.id RETURNING * INTO v_shift;
    v_event := 'clock_out';
  ELSE RAISE EXCEPTION 'Invalid shift action'; END IF;

  INSERT INTO shop_manager.employee_shift_events(shift_id,shop_id,profile_id,actor_user_id,event_type,note)
  VALUES(v_shift.id,v_shift.shop_id,v_shift.profile_id,(select auth.uid()),v_event,NULLIF(trim(_note),''));
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,entity_type,entity_id,reason)
  VALUES(v_shift.shop_id,v_shift.profile_id,(select auth.uid()),v_shift.id,'shift',v_event,'employee_shift',v_shift.id::text,NULLIF(trim(_note),''));
  RETURN to_jsonb(v_shift);
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_shift_action(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_shift_action(text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.request_employee_approval(
  _request_type text, _reason text, _entity_type text DEFAULT NULL, _entity_id text DEFAULT NULL,
  _requested_value numeric DEFAULT NULL, _original_value numeric DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS shop_manager.employee_approval_requests LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_result shop_manager.employee_approval_requests%ROWTYPE; v_shift_id uuid;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _request_type NOT IN ('discount','price_override','return','refund','void_payment','stock_adjustment','credit','other') THEN RAISE EXCEPTION 'Invalid approval type'; END IF;
  IF char_length(trim(COALESCE(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No employee shop is linked'; END IF;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  INSERT INTO shop_manager.employee_approval_requests(shop_id,requested_by_profile_id,requested_by_user_id,request_type,
    entity_type,entity_id,requested_value,original_value,reason,expires_at,metadata)
  VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),_request_type,NULLIF(trim(_entity_type),''),NULLIF(trim(_entity_id),''),
    _requested_value,_original_value,trim(_reason),now()+interval '24 hours',COALESCE(_metadata,'{}'::jsonb)) RETURNING * INTO v_result;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,amount,approval_request_id,reason)
  VALUES(v_profile.shop_id,v_profile.id,(select auth.uid()),v_shift_id,
    CASE WHEN _request_type IN ('discount','price_override') THEN 'pricing' WHEN _request_type IN ('return','refund') THEN 'return' ELSE 'other' END,
    'approval_requested',_entity_type,_entity_id,_requested_value,v_result.id,trim(_reason));
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.request_employee_approval(text,text,text,text,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.request_employee_approval(text,text,text,text,numeric,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.decide_employee_approval(
  _request_id uuid, _decision text, _note text DEFAULT NULL
) RETURNS shop_manager.employee_approval_requests LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_request shop_manager.employee_approval_requests%ROWTYPE; v_profile shop_manager.profiles%ROWTYPE; v_shift_id uuid;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO v_request FROM shop_manager.employee_approval_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Approval request is already resolved'; END IF;
  IF NOT shop_manager.is_shop_operations_manager((select auth.uid()),v_request.shop_id) THEN RAISE EXCEPTION 'Manager approval required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  UPDATE shop_manager.employee_approval_requests SET status=_decision,decided_by_profile_id=v_profile.id,
    decided_by_user_id=(select auth.uid()),decision_note=NULLIF(trim(_note),''),decided_at=now()
  WHERE id=_request_id RETURNING * INTO v_request;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,amount,approval_request_id,reason)
  VALUES(v_request.shop_id,v_profile.id,(select auth.uid()),v_shift_id,'pricing','approval_'||_decision,
    v_request.entity_type,v_request.entity_id,v_request.requested_value,v_request.id,NULLIF(trim(_note),''));
  RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.decide_employee_approval(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.decide_employee_approval(uuid,text,text) TO authenticated;

-- Central audit hook for the existing systems of record. It records attribution
-- and operational facts, never customer PII, card data, free-form invoice notes, or credentials.
CREATE OR REPLACE FUNCTION shop_manager.capture_employee_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_row jsonb; v_profile shop_manager.profiles%ROWTYPE; v_shop_id uuid; v_shift_id uuid;
  v_category text; v_action text; v_amount numeric; v_quantity numeric; v_customer_id uuid; v_entity_id text;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  v_row := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  v_shop_id := v_profile.shop_id;
  IF v_shop_id IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  SELECT id INTO v_shift_id FROM shop_manager.employee_shifts WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') LIMIT 1;
  v_entity_id := v_row->>'id';
  v_customer_id := NULLIF(v_row->>'customer_id','')::uuid;
  v_amount := COALESCE(NULLIF(v_row->>'amount','')::numeric,NULLIF(v_row->>'total','')::numeric,NULLIF(v_row->>'total_amount','')::numeric);
  v_quantity := COALESCE(NULLIF(v_row->>'quantity','')::numeric,NULLIF(v_row->>'quantity_received','')::numeric);
  v_category := CASE TG_TABLE_NAME WHEN 'payments' THEN 'payment' WHEN 'invoices' THEN 'sale'
    WHEN 'inventory_transactions' THEN 'inventory' WHEN 'inventory_purchase_orders' THEN 'receiving'
    WHEN 'stock_transfers' THEN 'transfer' WHEN 'customers' THEN 'customer'
    WHEN 'work_orders' THEN 'work_order' WHEN 'work_order_discounts' THEN 'discount' ELSE 'other' END;
  v_action := lower(TG_OP)||'_'||TG_TABLE_NAME;
  INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,
    entity_type,entity_id,customer_id,amount,quantity,metadata)
  VALUES(v_shop_id,v_profile.id,(select auth.uid()),v_shift_id,v_category,v_action,TG_TABLE_NAME,v_entity_id,v_customer_id,v_amount,v_quantity,
    jsonb_strip_nulls(jsonb_build_object('status',v_row->>'status','transaction_type',v_row->>'transaction_type',
      'payment_type',v_row->>'payment_type','reference_type',v_row->>'reference_type','reference_id',v_row->>'reference_id')));
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['payments','invoices','inventory_transactions','inventory_purchase_orders','stock_transfers','customers','work_orders','work_order_discounts']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS employee_operation_audit ON shop_manager.%I',t);
    EXECUTE format('CREATE TRIGGER employee_operation_audit AFTER INSERT OR UPDATE OR DELETE ON shop_manager.%I FOR EACH ROW EXECUTE FUNCTION shop_manager.capture_employee_operation()',t);
  END LOOP;
END $$;

CREATE OR REPLACE VIEW shop_manager.employee_daily_performance
WITH (security_invoker = true) AS
SELECT e.shop_id,e.profile_id,date_trunc('day',e.occurred_at) AS work_day,
  count(*) AS total_actions,
  count(*) FILTER (WHERE e.event_category='sale') AS sales_actions,
  count(*) FILTER (WHERE e.event_category='payment') AS payment_actions,
  count(*) FILTER (WHERE e.event_category IN ('inventory','receiving','transfer')) AS inventory_actions,
  count(*) FILTER (WHERE e.event_category='return') AS return_actions,
  COALESCE(sum(e.amount) FILTER (WHERE e.event_category='payment' AND e.action LIKE 'insert_%'),0) AS payments_recorded,
  count(DISTINCT e.customer_id) FILTER (WHERE e.customer_id IS NOT NULL) AS customers_helped
FROM shop_manager.employee_operational_events e
GROUP BY e.shop_id,e.profile_id,date_trunc('day',e.occurred_at);
GRANT SELECT ON shop_manager.employee_daily_performance TO authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260831130502_employee_module_access.sql
-- ============================================================================
-- Role-aware Shop Manager module routing. Existing per-shop permission rows
-- override the default role matrix when a shop has configured them.

CREATE OR REPLACE FUNCTION shop_manager.employee_allowed_modules()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_roles text[]; v_modules text[];
  v_all constant text[] := ARRAY['operations','customers','vehicles','work_orders','inspections','appointments',
    'inventory','parts_network','purchase_orders','invoices','payments','quotes','vendors','vendor_bills',
    'technicians','scheduling','discounts','returns','warranty','reports','accounting','settings'];
BEGIN
  IF (select auth.uid()) IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT COALESCE(array_agg(DISTINCT r.name::text),'{}'::text[]) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
  WHERE ur.user_id IN (v_profile.id,(select auth.uid()));

  IF v_roles && ARRAY['owner','admin','manager','operations_manager','developer']::text[] THEN
    RETURN v_all;
  END IF;

  IF EXISTS (SELECT 1 FROM shop_manager.shop_role_permissions p
    WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)) THEN
    SELECT COALESCE(array_agg(DISTINCT p.module),'{}'::text[]) INTO v_modules
    FROM shop_manager.shop_role_permissions p
    WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)
      AND (COALESCE((p.actions->>'view')::boolean,false)
        OR COALESCE((p.actions->>'read')::boolean,false)
        OR COALESCE((p.actions->>'manage')::boolean,false));
    RETURN array_append(v_modules,'operations');
  END IF;

  v_modules := ARRAY['operations'];
  IF v_roles && ARRAY['parts_manager']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','inventory','parts_network','purchase_orders','vendors','returns','warranty','reports'];
  END IF;
  IF v_roles && ARRAY['service_advisor','reception','office_admin']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inspections','appointments','quotes','invoices','payments','discounts','returns','warranty'];
  END IF;
  IF v_roles && ARRAY['technician','mechanic_manager','mechanic_manager_assistant']::text[] THEN
    v_modules := v_modules || ARRAY['vehicles','work_orders','inspections','inventory','parts_network','warranty'];
  END IF;
  IF v_roles && ARRAY['other_staff','dispatch','yard','yard_manager','yard_manager_assistant']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inventory','parts_network','scheduling'];
  END IF;
  IF v_roles && ARRAY['truck_driver']::text[] THEN
    v_modules := v_modules || ARRAY['vehicles','parts_network','scheduling'];
  END IF;
  RETURN ARRAY(SELECT DISTINCT unnest(v_modules));
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_allowed_modules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_allowed_modules() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_operating_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE;
  v_roles jsonb; v_locations jsonb;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No Shop Manager employee profile is linked to this account'; END IF;
  SELECT COALESCE(jsonb_agg(r.name::text ORDER BY r.name::text),'[]'::jsonb) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
  WHERE ur.user_id IN (v_profile.id,(select auth.uid()));
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') ORDER BY clocked_in_at DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'location_type',l.location_type) ORDER BY l.name),'[]'::jsonb)
  INTO v_locations FROM shop_manager.employee_work_locations l WHERE l.shop_id=v_profile.shop_id AND l.active;
  RETURN jsonb_build_object(
    'shop_id',v_profile.shop_id,'profile_id',v_profile.id,
    'employee_name',COALESCE(v_profile.full_name,concat_ws(' ',v_profile.first_name,v_profile.last_name),v_profile.email),
    'job_title',v_profile.job_title,'department',v_profile.department,'roles',v_roles,'locations',v_locations,
    'allowed_modules',to_jsonb(shop_manager.employee_allowed_modules()),
    'can_manage',shop_manager.is_shop_operations_manager((select auth.uid()),v_profile.shop_id),
    'active_shift',CASE WHEN v_shift.id IS NULL THEN NULL ELSE to_jsonb(v_shift) END
  );
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_operating_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_operating_context() TO authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260831193523_counter_sales_registers_pricebook.sql
-- ============================================================================
-- Cash register, atomic counter sale, price-book and commission foundation.
CREATE SEQUENCE IF NOT EXISTS shop_manager.counter_sale_number_seq START 1000;
CREATE TABLE shop_manager.cash_registers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,location_id uuid REFERENCES shop_manager.employee_work_locations(id) ON DELETE SET NULL,name text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(shop_id,name));
INSERT INTO shop_manager.cash_registers(shop_id,name) SELECT id,'Front Counter' FROM shop_manager.shops ON CONFLICT(shop_id,name) DO NOTHING;
CREATE TABLE shop_manager.register_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),register_id uuid NOT NULL REFERENCES shop_manager.cash_registers(id) ON DELETE RESTRICT,shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,shift_id uuid NOT NULL REFERENCES shop_manager.employee_shifts(id) ON DELETE RESTRICT,opened_by_profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id),opened_by_user_id uuid NOT NULL REFERENCES auth.users(id),status text NOT NULL DEFAULT 'open' CHECK(status IN('open','closed','manager_closed')),opening_float numeric(14,2) NOT NULL DEFAULT 0 CHECK(opening_float>=0),expected_cash numeric(14,2) NOT NULL DEFAULT 0,counted_cash numeric(14,2),variance numeric(14,2),opened_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz,closed_by uuid REFERENCES auth.users(id),closing_note text);
CREATE UNIQUE INDEX register_one_open ON shop_manager.register_sessions(register_id) WHERE status='open';
CREATE TABLE shop_manager.price_book_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shop_id uuid NOT NULL REFERENCES shop_manager.shops(id) ON DELETE RESTRICT,name text NOT NULL,rule_type text NOT NULL CHECK(rule_type IN('markup_percent','margin_percent','fixed_price','discount_percent')),category text,brand text,minimum_quantity numeric,adjustment_value numeric NOT NULL,priority integer NOT NULL DEFAULT 100,requires_manager boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,starts_at timestamptz,ends_at timestamptz,created_by uuid REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_manager.counter_sales(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sale_number text NOT NULL UNIQUE DEFAULT('CS-'||to_char(current_date,'YYMM')||'-'||lpad(nextval('shop_manager.counter_sale_number_seq')::text,6,'0')),shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),register_session_id uuid NOT NULL REFERENCES shop_manager.register_sessions(id),shift_id uuid NOT NULL REFERENCES shop_manager.employee_shifts(id),employee_profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id),customer_id uuid REFERENCES shop_manager.customers(id) ON DELETE SET NULL,status text NOT NULL DEFAULT 'completed' CHECK(status IN('completed','partially_returned','returned','voided')),subtotal numeric(14,2) NOT NULL,discount_total numeric(14,2) NOT NULL DEFAULT 0,tax_total numeric(14,2) NOT NULL DEFAULT 0,total numeric(14,2) NOT NULL,tender_type text NOT NULL CHECK(tender_type IN('cash','gcash','maya','card','bank_transfer','store_credit','mixed')),amount_tendered numeric(14,2) NOT NULL,change_due numeric(14,2) NOT NULL DEFAULT 0,approval_request_id uuid REFERENCES shop_manager.employee_approval_requests(id),created_by uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_manager.counter_sale_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sale_id uuid NOT NULL REFERENCES shop_manager.counter_sales(id) ON DELETE RESTRICT,inventory_item_id uuid NOT NULL REFERENCES shop_manager.inventory_items(id) ON DELETE RESTRICT,sku_snapshot text,name_snapshot text NOT NULL,quantity numeric(12,2) NOT NULL CHECK(quantity>0),list_price numeric(14,2) NOT NULL,unit_price numeric(14,2) NOT NULL,discount_amount numeric(14,2) NOT NULL DEFAULT 0,tax_amount numeric(14,2) NOT NULL DEFAULT 0,line_total numeric(14,2) NOT NULL,cost_snapshot numeric(14,2),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_manager.commission_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),name text NOT NULL,basis text NOT NULL CHECK(basis IN('revenue','gross_profit','quantity')),rate_percent numeric(7,4) NOT NULL DEFAULT 0,flat_amount numeric(14,2) NOT NULL DEFAULT 0,role_name text,category text,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_manager.commission_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),profile_id uuid NOT NULL REFERENCES shop_manager.profiles(id),sale_id uuid NOT NULL REFERENCES shop_manager.counter_sales(id),rule_id uuid REFERENCES shop_manager.commission_rules(id),basis_amount numeric(14,2) NOT NULL,commission_amount numeric(14,2) NOT NULL,status text NOT NULL DEFAULT 'earned' CHECK(status IN('earned','approved','paid','reversed')),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX counter_sales_shop_time ON shop_manager.counter_sales(shop_id,created_at DESC); CREATE INDEX commission_profile_time ON shop_manager.commission_events(profile_id,created_at DESC);

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['cash_registers','register_sessions','price_book_rules','counter_sales','counter_sale_lines','commission_rules','commission_events'] LOOP EXECUTE format('ALTER TABLE shop_manager.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON shop_manager.%I FROM anon,authenticated',t); EXECUTE format('GRANT SELECT ON shop_manager.%I TO authenticated',t); EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role',t); END LOOP; END $$;
CREATE POLICY registers_read ON shop_manager.cash_registers FOR SELECT TO authenticated USING(shop_manager.user_belongs_to_shop((select auth.uid()),shop_id));
CREATE POLICY register_sessions_read ON shop_manager.register_sessions FOR SELECT TO authenticated USING(opened_by_user_id=(select auth.uid()) OR shop_manager.is_shop_operations_manager((select auth.uid()),shop_id));
CREATE POLICY price_rules_read ON shop_manager.price_book_rules FOR SELECT TO authenticated USING(shop_manager.user_belongs_to_shop((select auth.uid()),shop_id));
CREATE POLICY counter_sales_read ON shop_manager.counter_sales FOR SELECT TO authenticated USING(created_by=(select auth.uid()) OR shop_manager.is_shop_operations_manager((select auth.uid()),shop_id));
CREATE POLICY counter_lines_read ON shop_manager.counter_sale_lines FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM shop_manager.counter_sales s WHERE s.id=sale_id AND(s.created_by=(select auth.uid()) OR shop_manager.is_shop_operations_manager((select auth.uid()),s.shop_id))));
CREATE POLICY commission_rules_read ON shop_manager.commission_rules FOR SELECT TO authenticated USING(shop_manager.user_belongs_to_shop((select auth.uid()),shop_id));
CREATE POLICY commission_events_read ON shop_manager.commission_events FOR SELECT TO authenticated USING(profile_id=(SELECT p.id FROM shop_manager.profiles p WHERE p.user_id=(select auth.uid()) LIMIT 1) OR shop_manager.is_shop_operations_manager((select auth.uid()),shop_id));

CREATE OR REPLACE FUNCTION shop_manager.open_register(_register_id uuid,_opening_float numeric DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=shop_manager,public,pg_temp AS $$ DECLARE p shop_manager.profiles%ROWTYPE;s shop_manager.employee_shifts%ROWTYPE;r shop_manager.cash_registers%ROWTYPE;rs shop_manager.register_sessions%ROWTYPE; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required';END IF;SELECT * INTO p FROM shop_manager.current_employee_profile();SELECT * INTO s FROM shop_manager.employee_shifts WHERE user_id=auth.uid() AND status='on_shift' LIMIT 1;IF NOT FOUND THEN RAISE EXCEPTION 'Clock in before opening a register';END IF;SELECT * INTO r FROM shop_manager.cash_registers WHERE id=_register_id AND shop_id=p.shop_id AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Register unavailable';END IF;INSERT INTO shop_manager.register_sessions(register_id,shop_id,shift_id,opened_by_profile_id,opened_by_user_id,opening_float,expected_cash)VALUES(r.id,p.shop_id,s.id,p.id,auth.uid(),COALESCE(_opening_float,0),COALESCE(_opening_float,0))RETURNING * INTO rs;RETURN to_jsonb(rs);END;$$;
REVOKE ALL ON FUNCTION shop_manager.open_register(uuid,numeric) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION shop_manager.open_register(uuid,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.complete_counter_sale(_register_session_id uuid,_customer_id uuid,_tender_type text,_amount_tendered numeric,_lines jsonb,_discount numeric DEFAULT 0,_tax numeric DEFAULT 0,_approval_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=shop_manager,public,pg_temp AS $$ DECLARE p shop_manager.profiles%ROWTYPE;rs shop_manager.register_sessions%ROWTYPE;sale shop_manager.counter_sales%ROWTYPE;x jsonb;i shop_manager.inventory_items%ROWTYPE;q integer;price numeric;sub numeric:=0;total numeric; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required';END IF;SELECT * INTO p FROM shop_manager.current_employee_profile();SELECT * INTO rs FROM shop_manager.register_sessions WHERE id=_register_session_id AND opened_by_user_id=auth.uid() AND status='open' FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Open your register first';END IF;IF jsonb_typeof(_lines)<>'array' OR jsonb_array_length(_lines)<1 THEN RAISE EXCEPTION 'Sale requires items';END IF;FOR x IN SELECT value FROM jsonb_array_elements(_lines) LOOP q:=(x->>'quantity')::integer;SELECT * INTO i FROM shop_manager.inventory_items WHERE id=(x->>'inventory_item_id')::uuid FOR UPDATE;IF NOT FOUND OR i.quantity<q OR q<=0 THEN RAISE EXCEPTION 'Insufficient stock';END IF;price:=COALESCE((x->>'unit_price')::numeric,i.unit_price,0);IF price<i.unit_price AND (_approval_id IS NULL OR NOT EXISTS(SELECT 1 FROM shop_manager.employee_approval_requests a WHERE a.id=_approval_id AND a.shop_id=rs.shop_id AND a.status='approved')) THEN RAISE EXCEPTION 'Manager approval required below list price';END IF;sub:=sub+q*price;END LOOP;IF COALESCE(_discount,0)>0 AND (_approval_id IS NULL OR NOT EXISTS(SELECT 1 FROM shop_manager.employee_approval_requests a WHERE a.id=_approval_id AND a.shop_id=rs.shop_id AND a.status='approved')) THEN RAISE EXCEPTION 'Manager approval required for sale discount';END IF;total:=round(sub-COALESCE(_discount,0)+COALESCE(_tax,0),2);IF total<0 OR _amount_tendered<total THEN RAISE EXCEPTION 'Tender is below sale total';END IF;INSERT INTO shop_manager.counter_sales(shop_id,register_session_id,shift_id,employee_profile_id,customer_id,subtotal,discount_total,tax_total,total,tender_type,amount_tendered,change_due,approval_request_id,created_by)VALUES(rs.shop_id,rs.id,rs.shift_id,p.id,_customer_id,sub,COALESCE(_discount,0),COALESCE(_tax,0),total,_tender_type,_amount_tendered,_amount_tendered-total,_approval_id,auth.uid())RETURNING * INTO sale;FOR x IN SELECT value FROM jsonb_array_elements(_lines) LOOP q:=(x->>'quantity')::integer;SELECT * INTO i FROM shop_manager.inventory_items WHERE id=(x->>'inventory_item_id')::uuid FOR UPDATE;price:=COALESCE((x->>'unit_price')::numeric,i.unit_price,0);INSERT INTO shop_manager.counter_sale_lines(sale_id,inventory_item_id,sku_snapshot,name_snapshot,quantity,list_price,unit_price,line_total,cost_snapshot)VALUES(sale.id,i.id,i.sku,i.name,q,COALESCE(i.unit_price,0),price,q*price,i.cost_per_unit);UPDATE shop_manager.inventory_items SET quantity=quantity-q,updated_at=now() WHERE id=i.id;INSERT INTO shop_manager.inventory_transactions(inventory_item_id,transaction_type,quantity,reference_type,reference_id,performed_by,notes)VALUES(i.id,'sale',-q,'counter_sale',sale.id,p.id,'Counter sale '||sale.sale_number);END LOOP;IF _tender_type='cash' THEN UPDATE shop_manager.register_sessions SET expected_cash=expected_cash+total WHERE id=rs.id;END IF;INSERT INTO shop_manager.employee_operational_events(shop_id,profile_id,actor_user_id,shift_id,event_category,action,entity_type,entity_id,customer_id,amount)VALUES(rs.shop_id,p.id,auth.uid(),rs.shift_id,'sale','counter_sale_completed','counter_sale',sale.id::text,_customer_id,total);RETURN jsonb_build_object('id',sale.id,'sale_number',sale.sale_number,'total',total,'change_due',sale.change_due);END;$$;
REVOKE ALL ON FUNCTION shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION shop_manager.close_register(_session_id uuid,_counted_cash numeric,_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=shop_manager,public,pg_temp AS $$ DECLARE r shop_manager.register_sessions%ROWTYPE;BEGIN SELECT * INTO r FROM shop_manager.register_sessions WHERE id=_session_id AND status='open' FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Open register session not found';END IF;IF r.opened_by_user_id<>auth.uid() AND NOT shop_manager.is_shop_operations_manager(auth.uid(),r.shop_id) THEN RAISE EXCEPTION 'Not authorized';END IF;UPDATE shop_manager.register_sessions SET status='closed',counted_cash=_counted_cash,variance=_counted_cash-expected_cash,closed_at=now(),closed_by=auth.uid(),closing_note=NULLIF(trim(_note),'') WHERE id=r.id RETURNING * INTO r;RETURN to_jsonb(r);END;$$;
REVOKE ALL ON FUNCTION shop_manager.close_register(uuid,numeric,text) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION shop_manager.close_register(uuid,numeric,text) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260831201500_counter_sale_commission_accrual.sql
-- ============================================================================
-- Accrue commission only after the atomic checkout has written every sale line.
CREATE UNIQUE INDEX IF NOT EXISTS commission_events_one_rule_per_sale
  ON shop_manager.commission_events(sale_id, rule_id, profile_id)
  WHERE rule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shop_manager.accrue_counter_sale_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp
AS $$
DECLARE
  sale shop_manager.counter_sales%ROWTYPE;
  rule shop_manager.commission_rules%ROWTYPE;
  basis numeric(14,2);
BEGIN
  IF NEW.action <> 'counter_sale_completed' OR NEW.entity_type <> 'counter_sale' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sale
  FROM shop_manager.counter_sales
  WHERE id = NEW.entity_id::uuid;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOR rule IN
    SELECT * FROM shop_manager.commission_rules
    WHERE shop_id = sale.shop_id AND active
    ORDER BY created_at, id
  LOOP
    SELECT CASE rule.basis
      WHEN 'revenue' THEN COALESCE(sum(line_total), 0)
      WHEN 'gross_profit' THEN COALESCE(sum(line_total - (COALESCE(cost_snapshot, 0) * quantity)), 0)
      WHEN 'quantity' THEN COALESCE(sum(quantity), 0)
    END
    INTO basis
    FROM shop_manager.counter_sale_lines
    WHERE sale_id = sale.id;

    INSERT INTO shop_manager.commission_events(
      shop_id, profile_id, sale_id, rule_id, basis_amount, commission_amount
    ) VALUES (
      sale.shop_id,
      sale.employee_profile_id,
      sale.id,
      rule.id,
      basis,
      round((basis * rule.rate_percent / 100) + rule.flat_amount, 2)
    )
    ON CONFLICT (sale_id, rule_id, profile_id) WHERE rule_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION shop_manager.accrue_counter_sale_commission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS accrue_counter_sale_commission_trigger
  ON shop_manager.employee_operational_events;
CREATE TRIGGER accrue_counter_sale_commission_trigger
AFTER INSERT ON shop_manager.employee_operational_events
FOR EACH ROW
WHEN (NEW.action = 'counter_sale_completed' AND NEW.entity_type = 'counter_sale')
EXECUTE FUNCTION shop_manager.accrue_counter_sale_commission();


-- ============================================================================
-- SOURCE MIGRATION: 20260901021500_fix_counter_sale_inventory_cost.sql
-- ============================================================================
-- Align counter-sale cost snapshots with the existing inventory schema.
DO $$
DECLARE
  ddl text;
  corrected text;
BEGIN
  SELECT pg_get_functiondef(
    'shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)'::regprocedure
  ) INTO ddl;

  corrected := replace(ddl, 'i.cost);UPDATE', 'i.cost_per_unit);UPDATE');
  IF corrected = ddl THEN
    RAISE EXCEPTION 'Expected inventory cost reference was not found';
  END IF;

  EXECUTE corrected;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260901025424_business_staff_shop_manager_bridge.sql
-- ============================================================================
-- Keep the business staff roster and Shop Manager identity/role model aligned.
CREATE UNIQUE INDEX IF NOT EXISTS shops_one_per_business
  ON shop_manager.shops(business_id) WHERE business_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_per_auth_user
  ON shop_manager.profiles(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_member(
  _business_id uuid,
  _user_id uuid,
  _active boolean,
  _business_role text,
  _title text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public, auth, pg_temp
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_public_profile public.profiles%ROWTYPE;
  v_shop_id uuid;
  v_shop_role text;
  v_role_id uuid;
  v_email text;
BEGIN
  SELECT * INTO v_business FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;

  SELECT * INTO v_public_profile FROM public.profiles WHERE id = _user_id;
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Employee auth account not found'; END IF;

  INSERT INTO shop_manager.shops(
    name, organization_id, business_id, slug, address, phone, email, city, is_active,
    business_type, industry
  ) VALUES (
    v_business.name, v_business.id, v_business.id,
    'sm-' || left(replace(v_business.id::text, '-', ''), 20),
    v_business.street_address, v_business.phone, v_business.email, v_business.city,
    true, 'business', v_business.type_slug
  )
  ON CONFLICT (business_id) WHERE business_id IS NOT NULL
  DO UPDATE SET name=EXCLUDED.name, address=EXCLUDED.address, phone=EXCLUDED.phone,
    email=EXCLUDED.email, city=EXCLUDED.city, is_active=true, updated_at=now()
  RETURNING id INTO v_shop_id;

  INSERT INTO shop_manager.cash_registers(shop_id,name)
  SELECT v_shop_id,'Front Counter'
  WHERE NOT EXISTS (SELECT 1 FROM shop_manager.cash_registers WHERE shop_id=v_shop_id);

  IF NOT _active THEN
    UPDATE shop_manager.register_sessions
      SET status='manager_closed', closed_at=now(), counted_cash=expected_cash,
          variance=0, closing_note='Employee access deactivated'
      WHERE opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts
      SET status='clocked_out', clocked_out_at=now(), closing_note='Employee access deactivated', updated_at=now()
      WHERE user_id=_user_id AND status IN ('on_shift','on_break');
    UPDATE shop_manager.profiles SET shop_id=NULL, updated_at=now()
      WHERE user_id=_user_id AND shop_id=v_shop_id;
    DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r
      WHERE ur.role_id=r.id AND ur.user_id=_user_id
        AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin');
    RETURN;
  END IF;

  -- Ownership is authoritative. A redundant/stale staff row must never reduce
  -- the business owner's Shop Manager permissions (for example owner+driver).
  v_shop_role := CASE WHEN v_business.owner_id = _user_id THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner'
    WHEN 'manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch'
    WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician'
    WHEN 'clerk' THEN 'office_admin'
    ELSE 'other_staff'
  END END;

  INSERT INTO shop_manager.profiles(
    id,user_id,email,first_name,last_name,shop_id,job_title,department,has_auth_account
  ) VALUES (
    _user_id,_user_id,v_email,
    COALESCE(NULLIF(v_public_profile.first_name,''),'Employee'),
    COALESCE(NULLIF(v_public_profile.last_name,''),''),
    v_shop_id,COALESCE(NULLIF(_title,''),initcap(replace(_business_role,'_',' '))),
    'Operations',true
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
    SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,
        shop_id=EXCLUDED.shop_id,job_title=EXCLUDED.job_title,
        department=EXCLUDED.department,has_auth_account=true,updated_at=now();

  DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r
    WHERE ur.role_id=r.id AND ur.user_id=_user_id
      AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff');
  SELECT id INTO v_role_id FROM shop_manager.roles WHERE name::text=v_shop_role;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Mapped Shop Manager role not found: %',v_shop_role; END IF;
  INSERT INTO shop_manager.user_roles(user_id,role_id)
    VALUES(_user_id,v_role_id) ON CONFLICT(user_id,role_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=OLD.business_id AND b.owner_id=OLD.user_id
    ) THEN
      PERFORM shop_manager.sync_business_staff_member(OLD.business_id,OLD.user_id,true,'owner','Owner');
    ELSE
      PERFORM shop_manager.sync_business_staff_member(OLD.business_id,OLD.user_id,false,OLD.role::text,OLD.title);
    END IF;
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=NEW.business_id AND b.owner_id=NEW.user_id
  ) THEN
    PERFORM shop_manager.sync_business_staff_member(NEW.business_id,NEW.user_id,true,'owner','Owner');
  ELSE
    PERFORM shop_manager.sync_business_staff_member(NEW.business_id,NEW.user_id,NEW.active,NEW.role::text,NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_trigger() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS sync_business_staff_to_shop_manager ON public.business_staff;
CREATE TRIGGER sync_business_staff_to_shop_manager
AFTER INSERT OR UPDATE OF role,title,active OR DELETE ON public.business_staff
FOR EACH ROW EXECUTE FUNCTION shop_manager.sync_business_staff_trigger();

-- Provision staff who were added before this bridge was installed.
DO $$ DECLARE r public.business_staff%ROWTYPE; BEGIN
  FOR r IN SELECT * FROM public.business_staff LOOP
    PERFORM shop_manager.sync_business_staff_member(r.business_id,r.user_id,r.active,r.role::text,r.title);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260901025637_add_driver_module_access.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION shop_manager.employee_allowed_modules()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_roles text[]; v_modules text[];
  v_all constant text[] := ARRAY['operations','customers','vehicles','work_orders','inspections','appointments',
    'inventory','parts_network','purchase_orders','invoices','payments','quotes','vendors','vendor_bills',
    'technicians','scheduling','discounts','returns','warranty','reports','accounting','settings'];
BEGIN
  IF (select auth.uid()) IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT COALESCE(array_agg(DISTINCT r.name::text),'{}'::text[]) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
  WHERE ur.user_id IN (v_profile.id,(select auth.uid()));
  IF v_roles && ARRAY['owner','admin','manager','operations_manager','developer']::text[] THEN RETURN v_all; END IF;
  IF EXISTS (SELECT 1 FROM shop_manager.shop_role_permissions p WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)) THEN
    SELECT COALESCE(array_agg(DISTINCT p.module),'{}'::text[]) INTO v_modules
    FROM shop_manager.shop_role_permissions p WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)
      AND (COALESCE((p.actions->>'view')::boolean,false) OR COALESCE((p.actions->>'read')::boolean,false)
        OR COALESCE((p.actions->>'manage')::boolean,false));
    RETURN array_append(v_modules,'operations');
  END IF;
  v_modules := ARRAY['operations'];
  IF v_roles && ARRAY['parts_manager']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','inventory','parts_network','purchase_orders','vendors','returns','warranty','reports']; END IF;
  IF v_roles && ARRAY['service_advisor','reception','office_admin']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inspections','appointments','quotes','invoices','payments','discounts','returns','warranty']; END IF;
  IF v_roles && ARRAY['technician','mechanic_manager','mechanic_manager_assistant']::text[] THEN v_modules := v_modules || ARRAY['vehicles','work_orders','inspections','inventory','parts_network','warranty']; END IF;
  IF v_roles && ARRAY['other_staff','dispatch','yard','yard_manager','yard_manager_assistant']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inventory','parts_network','scheduling']; END IF;
  IF v_roles && ARRAY['truck_driver']::text[] THEN v_modules := v_modules || ARRAY['vehicles','parts_network','scheduling']; END IF;
  RETURN ARRAY(SELECT DISTINCT unnest(v_modules));
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_allowed_modules() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_allowed_modules() TO authenticated,service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260901025813_enforce_counter_operator_roles.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION shop_manager.can_operate_counter(_user_id uuid,_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
  SELECT shop_manager.user_belongs_to_shop(_user_id,_shop_id)
    AND EXISTS (
      SELECT 1 FROM shop_manager.user_roles ur
      JOIN shop_manager.roles r ON r.id=ur.role_id
      WHERE ur.user_id=_user_id
        AND r.name::text IN ('owner','admin','manager','operations_manager','parts_manager','office_admin','reception')
    );
$$;
REVOKE ALL ON FUNCTION shop_manager.can_operate_counter(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.can_operate_counter(uuid,uuid) TO service_role;

DO $$
DECLARE ddl text; corrected text;
BEGIN
  SELECT pg_get_functiondef('shop_manager.open_register(uuid,numeric)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Authentication required'';END IF;SELECT * INTO p',
    'IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Authentication required'';END IF;SELECT * INTO p');
  corrected := replace(corrected,
    'SELECT * INTO r FROM shop_manager.cash_registers WHERE id=_register_id AND shop_id=p.shop_id AND active FOR UPDATE;',
    'IF NOT shop_manager.can_operate_counter(auth.uid(),p.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;SELECT * INTO r FROM shop_manager.cash_registers WHERE id=_register_id AND shop_id=p.shop_id AND active FOR UPDATE;');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch open_register permission check'; END IF;
  EXECUTE corrected;

  SELECT pg_get_functiondef('shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'SELECT * INTO rs FROM shop_manager.register_sessions WHERE id=_register_session_id AND opened_by_user_id=auth.uid() AND status=''open'' FOR UPDATE;',
    'IF NOT shop_manager.can_operate_counter(auth.uid(),p.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;SELECT * INTO rs FROM shop_manager.register_sessions WHERE id=_register_session_id AND opened_by_user_id=auth.uid() AND status=''open'' FOR UPDATE;');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch complete_counter_sale permission check'; END IF;
  EXECUTE corrected;

  SELECT pg_get_functiondef('shop_manager.close_register(uuid,numeric,text)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'IF NOT FOUND THEN RAISE EXCEPTION ''Open register session not found'';END IF;IF r.opened_by_user_id',
    'IF NOT FOUND THEN RAISE EXCEPTION ''Open register session not found'';END IF;IF NOT shop_manager.can_operate_counter(auth.uid(),r.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;IF r.opened_by_user_id');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch close_register permission check'; END IF;
  EXECUTE corrected;
END;
$$;

REVOKE ALL ON FUNCTION shop_manager.open_register(uuid,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION shop_manager.close_register(uuid,numeric,text) FROM PUBLIC,anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260901032848_test_tow_company_demo_workspace.sql
-- ============================================================================
-- Resettable, private demo data for a towing-business workspace.
-- This is additive: only rows carrying the exact demo marker are replaced.

CREATE OR REPLACE FUNCTION shop_manager.seed_tow_demo_workspace(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp
AS $$
DECLARE
  v_shop_id uuid;
  v_location_id uuid;
  v_marker constant text := '[365 DEMO v1]';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  SELECT id INTO v_shop_id FROM shop_manager.shops WHERE business_id = _business_id;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Shop Manager workspace is not linked'; END IF;

  INSERT INTO public.business_inventory_locations(
    business_id, code, name, location_type, network_visible, active, pickup_notes
  ) VALUES (
    _business_id, 'DEMO-MAIN', 'Demo Main Stockroom', 'warehouse', false, true,
    'Training location — not available for public pickup'
  )
  ON CONFLICT (business_id, code) DO UPDATE SET
    name=EXCLUDED.name, location_type=EXCLUDED.location_type,
    network_visible=false, active=true, pickup_notes=EXCLUDED.pickup_notes,
    updated_at=now()
  RETURNING id INTO v_location_id;

  DELETE FROM public.business_assets
    WHERE business_id=_business_id AND notes=v_marker;
  DELETE FROM public.business_inventory_items
    WHERE business_id=_business_id AND notes=v_marker;
  DELETE FROM shop_manager.inventory_items
    WHERE shop_id=v_shop_id AND notes=v_marker;

  INSERT INTO public.business_assets(
    business_id,kind,name,plate,vin,capacity_kg,status,notes
  ) VALUES
    (_business_id,'tow_truck','Unit 01 · Light-Duty Wheel Lift','DEMO-101','DEMO-VIN-WL-001',3500,'active',v_marker),
    (_business_id,'flatbed','Unit 02 · Flatbed Carrier','DEMO-202','DEMO-VIN-FB-002',5000,'active',v_marker),
    (_business_id,'wrecker','Unit 03 · Heavy Recovery Wrecker','DEMO-303','DEMO-VIN-HR-003',12000,'maintenance',v_marker),
    (_business_id,'service_van','Unit 04 · Roadside Service Van','DEMO-404','DEMO-VIN-SV-004',1800,'active',v_marker);

  INSERT INTO public.business_inventory_items(
    business_id,location_id,sku,name,category,unit,qty_on_hand,reorder_at,cost,price,
    location,notes,active,network_visible,brand,manufacturer_part_number,
    country_code,item_condition,fulfillment_methods,warranty_months
  ) VALUES
    (_business_id,v_location_id,'DEMO-REC-10T','Recovery Strap 10T','Recovery Gear','pc',8,3,1450,2100,'Rack A1',v_marker,true,false,'365 Demo','REC-10T','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-SHK-475','Bow Shackle 4.75T','Recovery Gear','pc',14,5,620,950,'Rack A2',v_marker,true,false,'365 Demo','SHK-475','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-WLS-SET','Wheel-Lift Strap Set','Tow Equipment','set',6,2,1900,2850,'Rack A3',v_marker,true,false,'365 Demo','WLS-SET','PH','new',ARRAY['pickup'],6),
    (_business_id,v_location_id,'DEMO-DOLLY-01','Universal Wheel Dolly','Tow Equipment','pc',4,2,7200,9500,'Equipment Bay',v_marker,true,false,'365 Demo','DOLLY-01','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-JUMP-12V','12V/24V Jump Starter','Roadside Service','pc',3,1,6400,7900,'Charging Station',v_marker,true,false,'365 Demo','JUMP-12V24V','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-TIRE-PLUG','Tubeless Tire Repair Kit','Roadside Service','kit',12,4,480,750,'Rack B1',v_marker,true,false,'365 Demo','TIRE-PLUG-KIT','PH','new',ARRAY['pickup'],6),
    (_business_id,v_location_id,'DEMO-HYD-ISO46','Hydraulic Oil ISO 46 · 4L','Fluids','bottle',9,3,680,950,'Fluids Cabinet',v_marker,true,false,'365 Demo','HYD-ISO46-4L','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-CONE-750','Traffic Cone 750mm','Safety','pc',20,8,340,520,'Safety Cage',v_marker,true,false,'365 Demo','CONE-750','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-VEST-HV','High-Visibility Safety Vest','Safety','pc',16,6,180,320,'Safety Cage',v_marker,true,false,'365 Demo','VEST-HV','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-SPILL-20L','20L Spill Response Kit','Safety','kit',2,2,1650,2350,'Safety Cage',v_marker,true,false,'365 Demo','SPILL-20L','PH','new',ARRAY['pickup'],NULL);

  INSERT INTO shop_manager.inventory_items(
    shop_id,name,sku,category,supplier,quantity,quantity_in_stock,reorder_point,
    unit_price,cost_per_unit,sell_price_per_unit,location,status,part_number,
    manufacturer,warranty_period,description,notes
  ) VALUES
    (v_shop_id,'Recovery Strap 10T','DEMO-REC-10T','Recovery Gear','365 Demo Supply',8,8,3,2100,1450,2100,'Rack A1','In Stock','REC-10T','365 Demo','12 months','Heavy recovery strap for training sales and receiving.',v_marker),
    (v_shop_id,'Bow Shackle 4.75T','DEMO-SHK-475','Recovery Gear','365 Demo Supply',14,14,5,950,620,950,'Rack A2','In Stock','SHK-475','365 Demo','12 months','Rated bow shackle demo inventory.',v_marker),
    (v_shop_id,'Wheel-Lift Strap Set','DEMO-WLS-SET','Tow Equipment','365 Demo Supply',6,6,2,2850,1900,2850,'Rack A3','In Stock','WLS-SET','365 Demo','6 months','Replacement wheel-lift straps.',v_marker),
    (v_shop_id,'Universal Wheel Dolly','DEMO-DOLLY-01','Tow Equipment','365 Demo Supply',4,4,2,9500,7200,9500,'Equipment Bay','In Stock','DOLLY-01','365 Demo','12 months','Universal wheel dolly set.',v_marker),
    (v_shop_id,'12V/24V Jump Starter','DEMO-JUMP-12V','Roadside Service','365 Demo Supply',3,3,1,7900,6400,7900,'Charging Station','In Stock','JUMP-12V24V','365 Demo','12 months','Commercial jump starter.',v_marker),
    (v_shop_id,'Tubeless Tire Repair Kit','DEMO-TIRE-PLUG','Roadside Service','365 Demo Supply',12,12,4,750,480,750,'Rack B1','In Stock','TIRE-PLUG-KIT','365 Demo','6 months','Roadside tubeless repair kit.',v_marker),
    (v_shop_id,'Hydraulic Oil ISO 46 · 4L','DEMO-HYD-ISO46','Fluids','365 Demo Supply',9,9,3,950,680,950,'Fluids Cabinet','In Stock','HYD-ISO46-4L','365 Demo',NULL,'Hydraulic oil for tow equipment.',v_marker),
    (v_shop_id,'Traffic Cone 750mm','DEMO-CONE-750','Safety','365 Demo Supply',20,20,8,520,340,520,'Safety Cage','In Stock','CONE-750','365 Demo',NULL,'Reflective roadside traffic cone.',v_marker),
    (v_shop_id,'High-Visibility Safety Vest','DEMO-VEST-HV','Safety','365 Demo Supply',16,16,6,320,180,320,'Safety Cage','In Stock','VEST-HV','365 Demo',NULL,'Employee roadside safety vest.',v_marker),
    (v_shop_id,'20L Spill Response Kit','DEMO-SPILL-20L','Safety','365 Demo Supply',2,2,2,2350,1650,2350,'Safety Cage','Low Stock','SPILL-20L','365 Demo',NULL,'Training stock intentionally at reorder point.',v_marker);
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.seed_tow_demo_workspace(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.seed_tow_demo_workspace(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_tow_demo_workspace(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE v_meta jsonb;
BEGIN
  SELECT import_metadata INTO v_meta FROM public.businesses
    WHERE id=_business_id AND owner_id=(SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the business owner can reset this demo'; END IF;
  IF COALESCE(v_meta->>'demo_template','') <> 'tow-company-v1' THEN
    RAISE EXCEPTION 'This business is not a resettable towing demo';
  END IF;
  PERFORM shop_manager.seed_tow_demo_workspace(_business_id);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_tow_demo_workspace(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_tow_demo_workspace(uuid) TO authenticated,service_role;

-- Correct owner role precedence in the already-deployed bridge function.
CREATE OR REPLACE FUNCTION shop_manager.effective_business_shop_role(
  _business_id uuid, _user_id uuid, _business_role text
) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
  SELECT CASE WHEN EXISTS(
    SELECT 1 FROM public.businesses b WHERE b.id=_business_id AND b.owner_id=_user_id
  ) THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch' WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician' WHEN 'clerk' THEN 'office_admin'
    ELSE 'other_staff' END END
$$;
REVOKE ALL ON FUNCTION shop_manager.effective_business_shop_role(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.effective_business_shop_role(uuid,uuid,text) TO service_role;

-- Update the deployed bridge without changing its signature or surrounding
-- provisioning/deactivation behavior.
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)'::regprocedure
  ) INTO v_definition;
  IF position('v_shop_role := CASE lower(_business_role)' in v_definition) > 0 THEN
    v_definition := replace(
      v_definition,
      'v_shop_role := CASE lower(_business_role)',
      'v_shop_role := CASE WHEN v_business.owner_id = _user_id THEN ''owner'' ELSE CASE lower(_business_role)'
    );
    v_definition := replace(
      v_definition,
      E'    ELSE ''other_staff''\n  END;\n\n  INSERT INTO shop_manager.profiles',
      E'    ELSE ''other_staff''\n  END END;\n\n  INSERT INTO shop_manager.profiles'
    );
    EXECUTE v_definition;
  END IF;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260901090422_correct_business_role_and_associate_boundaries.sql
-- ============================================================================
-- A business owner is authoritative and must never be downgraded or detached
-- by a redundant business_staff row. Operational employee rows remain scoped
-- to exactly one business and do not confer Associate Network membership.

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=OLD.business_id AND b.owner_id=OLD.user_id
    ) THEN
      PERFORM shop_manager.sync_business_staff_member(
        OLD.business_id,OLD.user_id,true,'owner','Owner'
      );
    ELSE
      PERFORM shop_manager.sync_business_staff_member(
        OLD.business_id,OLD.user_id,false,OLD.role::text,OLD.title
      );
    END IF;
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=NEW.business_id AND b.owner_id=NEW.user_id
  ) THEN
    PERFORM shop_manager.sync_business_staff_member(
      NEW.business_id,NEW.user_id,true,'owner','Owner'
    );
  ELSE
    PERFORM shop_manager.sync_business_staff_member(
      NEW.business_id,NEW.user_id,NEW.active,NEW.role::text,NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_trigger()
  FROM PUBLIC,anon,authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260901134215_parts_demo_playground.sql
-- ============================================================================
-- Keep the legacy text invoice identifiers while safely linking UUID work orders
-- and UUID accounting journal sources.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $function$
DECLARE v_shop uuid; v_lines jsonb; v_source_id uuid;
BEGIN
  v_source_id := md5(NEW.id)::uuid;
  IF COALESCE(NEW.status,'') IN ('draft','void','cancelled') THEN
    IF TG_OP='UPDATE' AND COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled') THEN
      PERFORM shop_manager.sm_void_journal_by_source('invoice',v_source_id,'status='||NEW.status);
    END IF;
    RETURN NEW;
  END IF;
  IF NULLIF(NEW.work_order_id,'') IS NOT NULL THEN
    SELECT wo.shop_id INTO v_shop FROM shop_manager.work_orders wo
    WHERE wo.id=NULLIF(NEW.work_order_id,'')::uuid;
  END IF;
  IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  v_lines:=jsonb_build_array(
    jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',COALESCE(NEW.total,0),'credit',0,'description','Invoice '||NEW.id),
    jsonb_build_object('code','4000','name','Sales Revenue','type','revenue','debit',0,'credit',COALESCE(NEW.subtotal,0),'description','Sales'),
    jsonb_build_object('code','2100','name','Sales Tax Payable','type','liability','debit',0,'credit',COALESCE(NEW.tax,0),'description','Sales tax'));
  PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.date::date,CURRENT_DATE),
    'INV-'||substr(NEW.id::text,1,8),'Invoice posted','invoice',v_source_id,v_lines);
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION shop_manager.sm_trg_payment_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $function$
DECLARE v_shop uuid;
BEGIN
  IF TG_OP='UPDATE' AND COALESCE(NEW.status,'')='refunded' AND COALESCE(OLD.status,'')<>'refunded' THEN
    SELECT wo.shop_id INTO v_shop FROM shop_manager.invoices i
    JOIN shop_manager.work_orders wo ON wo.id=NULLIF(i.work_order_id,'')::uuid WHERE i.id=NEW.invoice_id;
    IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
    IF v_shop IS NOT NULL THEN
      PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.transaction_date::date,CURRENT_DATE),
        'REFUND-'||substr(NEW.id::text,1,8),'Payment refunded','payment_refund',NEW.id,
        jsonb_build_array(
          jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',COALESCE(NEW.amount,0),'credit',0,'description','Refund reversal — restore AR'),
          jsonb_build_object('code','1000','name','Cash','type','asset','debit',0,'credit',COALESCE(NEW.amount,0),'description','Cash out for refund')));
    END IF;
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.status,'completed') NOT IN ('completed','succeeded','paid') THEN RETURN NEW; END IF;
  SELECT wo.shop_id INTO v_shop FROM shop_manager.invoices i
  JOIN shop_manager.work_orders wo ON wo.id=NULLIF(i.work_order_id,'')::uuid WHERE i.id=NEW.invoice_id;
  IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.transaction_date::date,CURRENT_DATE),
    'PMT-'||substr(NEW.id::text,1,8),'Customer payment','payment',NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','1000','name','Cash','type','asset','debit',COALESCE(NEW.amount,0),'credit',0,'description','Cash received'),
      jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',0,'credit',COALESCE(NEW.amount,0),'description','Applied to AR')));
  RETURN NEW;
END $function$;
