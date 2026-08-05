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