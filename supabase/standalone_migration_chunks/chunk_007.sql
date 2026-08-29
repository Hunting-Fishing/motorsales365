
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
