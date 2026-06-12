-- Add public-summary fields to reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS public_summary text,
  ADD COLUMN IF NOT EXISTS made_public_at timestamptz,
  ADD COLUMN IF NOT EXISTS made_public_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reports_listing_status_idx ON public.reports(listing_id, status);

-- Public per-listing report summary (counts + admin-curated public notes only)
CREATE OR REPLACE FUNCTION public.get_listing_report_summary(_listing_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'listing_id', _listing_id,
    'open_count', COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0),
    'resolved_count', COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0),
    'total', COUNT(*),
    'categories', COALESCE((
      SELECT jsonb_object_agg(cat, c)
      FROM (
        SELECT COALESCE(NULLIF(btrim(category), ''), reason, 'other') AS cat, COUNT(*) AS c
        FROM public.reports
        WHERE listing_id = _listing_id AND target_type = 'listing'
        GROUP BY 1
      ) s
    ), '{}'::jsonb),
    'public_notes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category', COALESCE(NULLIF(btrim(category), ''), reason),
        'summary', public_summary,
        'made_public_at', made_public_at,
        'status', status
      ) ORDER BY made_public_at DESC)
      FROM public.reports
      WHERE listing_id = _listing_id
        AND target_type = 'listing'
        AND public_summary IS NOT NULL
    ), '[]'::jsonb)
  )
  FROM public.reports
  WHERE listing_id = _listing_id AND target_type = 'listing';
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_report_summary(uuid) TO anon, authenticated;

-- Batch summary for card feeds
CREATE OR REPLACE FUNCTION public.get_listing_report_summaries(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, open_count bigint, resolved_count bigint, total bigint, has_public_notes boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.listing_id,
    SUM(CASE WHEN r.status = 'open' THEN 1 ELSE 0 END)::bigint AS open_count,
    SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END)::bigint AS resolved_count,
    COUNT(*)::bigint AS total,
    BOOL_OR(r.public_summary IS NOT NULL) AS has_public_notes
  FROM public.reports r
  WHERE r.target_type = 'listing'
    AND r.listing_id = ANY(_listing_ids)
  GROUP BY r.listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_report_summaries(uuid[]) TO anon, authenticated;

-- Staff-only pending counts across all moderation queues
CREATE OR REPLACE FUNCTION public.admin_pending_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.can_support(uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'reports_open',
      (SELECT COUNT(*) FROM public.reports WHERE status = 'open'),
    'verifications_pending',
      (SELECT COUNT(*) FROM public.verification_requests WHERE status::text = 'pending'),
    'claims_pending',
      (SELECT COUNT(*) FROM public.business_claim_requests WHERE status::text = 'pending'),
    'payments_pending',
      (SELECT COUNT(*) FROM public.payments
        WHERE status::text = 'pending'
           OR review_state::text IN ('pending_review','needs_info','awaiting_review')),
    'ad_inquiries_open',
      (SELECT COUNT(*) FROM public.ad_inquiries WHERE status::text IN ('new','in_review')),
    'service_inquiries_open',
      (SELECT COUNT(*) FROM public.service_inquiries WHERE status::text IN ('new','open')),
    'business_inquiries_open',
      (SELECT COUNT(*) FROM public.business_inquiries WHERE status::text IN ('new','open')),
    'location_corrections_pending',
      (SELECT COUNT(*) FROM public.business_location_corrections WHERE status::text = 'pending'),
    'type_suggestions_pending',
      (SELECT COUNT(*) FROM public.business_type_suggestions WHERE status::text = 'pending'),
    'ad_campaigns_pending',
      (SELECT COUNT(*) FROM public.advertisements WHERE status::text IN ('pending','pending_review','draft')),
    'ops_alerts_unack',
      (SELECT COUNT(*) FROM public.ops_alerts WHERE acknowledged_at IS NULL),
    'support_tickets_open',
      (SELECT COUNT(*) FROM public.support_tickets WHERE status::text IN ('open','new','pending')),
    'discover_queue_pending',
      (SELECT COUNT(*) FROM public.business_discovery_queue WHERE status::text = 'pending'),
    'lead_offers_open',
      (SELECT COUNT(*) FROM public.lead_offers WHERE status::text = 'open')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pending_counts() TO authenticated;