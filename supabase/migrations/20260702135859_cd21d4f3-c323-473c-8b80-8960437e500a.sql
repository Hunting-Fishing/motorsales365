CREATE OR REPLACE FUNCTION public.admin_overview_trends(days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  n int := greatest(1, least(coalesce(days, 30), 90));
  day_start timestamptz := date_trunc('day', now());
  start_day timestamptz := day_start - make_interval(days => n - 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH days AS (
    SELECT generate_series(start_day, day_start, interval '1 day')::date AS d
  ),
  signups AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.profiles WHERE created_at >= start_day GROUP BY 1
  ),
  scans AS (
    SELECT date_trunc('day', scanned_at)::date AS d, count(*)::int AS c
    FROM public.qr_scans WHERE scanned_at >= start_day GROUP BY 1
  ),
  listings AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listings WHERE created_at >= start_day GROUP BY 1
  ),
  boosts AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listing_boosts WHERE created_at >= start_day GROUP BY 1
  ),
  msgs AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.messages WHERE created_at >= start_day GROUP BY 1
  ),
  pays AS (
    SELECT date_trunc('day', coalesce(paid_at, created_at))::date AS d,
           count(*)::int AS c,
           coalesce(sum(amount_php), 0)::numeric AS amt
    FROM public.payments
    WHERE status = 'paid' AND coalesce(paid_at, created_at) >= start_day
    GROUP BY 1
  ),
  series AS (
    SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
           coalesce(signups.c, 0)  AS signups,
           coalesce(scans.c, 0)    AS scans,
           coalesce(listings.c, 0) AS listings,
           coalesce(boosts.c, 0)   AS boosts,
           coalesce(msgs.c, 0)     AS messages,
           coalesce(pays.c, 0)     AS payments,
           coalesce(pays.amt, 0)   AS revenue
    FROM days
    LEFT JOIN signups  ON signups.d  = days.d
    LEFT JOIN scans    ON scans.d    = days.d
    LEFT JOIN listings ON listings.d = days.d
    LEFT JOIN boosts   ON boosts.d   = days.d
    LEFT JOIN msgs     ON msgs.d     = days.d
    LEFT JOIN pays     ON pays.d     = days.d
    ORDER BY days.d
  )
  SELECT jsonb_build_object(
    'days', n,
    'series', coalesce(jsonb_agg(row_to_json(series)), '[]'::jsonb)
  ) INTO result FROM series;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO service_role;