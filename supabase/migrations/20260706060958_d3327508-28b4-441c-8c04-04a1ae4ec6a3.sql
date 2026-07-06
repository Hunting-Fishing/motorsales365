CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  now_ts timestamptz := now();
  day_start timestamptz := date_trunc('day', now_ts);
  d7 timestamptz := now_ts - interval '7 days';
  d30 timestamptz := now_ts - interval '30 days';
  h24 timestamptz := now_ts - interval '24 hours';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'signups', jsonb_build_object(
        'today', (SELECT count(*) FROM public.profiles WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.profiles WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.profiles WHERE created_at >= d30)
      ),
      'verifiedSellers', (SELECT count(*) FROM public.profiles WHERE verification_status = 'verified'),
      'activeAccounts',  (SELECT count(*) FROM public.profiles WHERE coalesce(account_status,'active') = 'active'),
      'foundingMembers', (SELECT count(*) FROM public.profiles WHERE is_founding_member = true)
    ),
    'scans', jsonb_build_object(
      'total', jsonb_build_object(
        'today', (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= day_start),
        'd7',    (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d7),
        'd30',   (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d30)
      ),
      'partnerSignups7d', (
        SELECT count(*) FROM public.user_referrals ur
        WHERE ur.signup_date >= d7
          AND (ur.credited_referral_code IS NOT NULL OR ur.first_referral_code IS NOT NULL)
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.user_referrals ur
                    WHERE (ur.credited_referral_code = s.referral_code
                       OR ur.first_referral_code = s.referral_code)
                      AND ur.signup_date >= d30) AS signups
          FROM public.staff_referrals s
          LEFT JOIN public.qr_scans q
            ON q.referral_code = s.referral_code AND q.scanned_at >= d30
          WHERE coalesce(s.active, true)
          GROUP BY s.referral_code, s.full_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      ),
      'topPartners', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT p.referral_code AS code,
                 coalesce(nullif(p.display_name,''), p.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.user_referrals ur
                    WHERE (ur.credited_referral_code = p.referral_code
                       OR ur.first_referral_code = p.referral_code)
                      AND ur.signup_date >= d30) AS signups
          FROM public.partner_program_partners p
          LEFT JOIN public.qr_scans q
            ON q.referral_code = p.referral_code AND q.scanned_at >= d30
          WHERE coalesce(p.active, true)
          GROUP BY p.referral_code, p.display_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      )
    ),
    'productivity', jsonb_build_object(
      'listingsCreated', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listings WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listings WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listings WHERE created_at >= d30)
      ),
      'activeListings',  (SELECT count(*) FROM public.listings WHERE status::text = 'active'),
      'pendingPayment',  (SELECT count(*) FROM public.listings WHERE status::text = 'pending_payment'),
      'boostsSold', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listing_boosts WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d30)
      ),
      'messagesSent', jsonb_build_object(
        'today', (SELECT count(*) FROM public.messages WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.messages WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.messages WHERE created_at >= d30)
      ),
      'revenue', jsonb_build_object(
        'today', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= day_start), 0),
        'd7',    coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d7), 0),
        'd30',   coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d30), 0)
      ),
      'revenueTotal', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid'), 0)
    ),
    'health', jsonb_build_object(
      'pendingVerifications', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
      'pendingPayments',      (SELECT count(*) FROM public.payments WHERE status = 'pending'),
      'failedPayments24h',    (SELECT count(*) FROM public.payments WHERE status = 'failed' AND created_at >= h24),
      'openReports',          (SELECT count(*) FROM public.reports WHERE status IN ('open','pending','submitted','under_review')),
      'unacknowledgedAlerts', (SELECT count(*) FROM public.ops_alerts WHERE coalesce(acknowledged, false) = false),
      'pendingClaimReviews',  (SELECT count(*) FROM public.business_claim_requests WHERE status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_user_referrals_signup_date
  ON public.user_referrals(signup_date);
CREATE INDEX IF NOT EXISTS idx_user_referrals_first_code
  ON public.user_referrals(first_referral_code);