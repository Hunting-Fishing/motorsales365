-- 365 standalone migration package | chunk_004.sql | 61 source migrations
-- Byte-for-byte concatenation of supabase/migrations. No SQL modified.

-- ===== BEGIN SOURCE MIGRATION: 20260612105044_94140c07-aee7-4c48-a6d3-beba9a7e0f98.sql =====
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
-- ===== END SOURCE MIGRATION: 20260612105044_94140c07-aee7-4c48-a6d3-beba9a7e0f98.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613035610_c210e9ab-f101-44b8-9bc3-ad6dd05e0ff9.sql =====
ALTER TABLE public.listing_price_history
  ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT 'asking';

CREATE OR REPLACE FUNCTION public.tg_listing_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old numeric;
  v_new numeric;
  v_delta numeric;
  v_pct numeric;
BEGIN
  v_old := COALESCE(OLD.price_php, 0);
  v_new := COALESCE(NEW.price_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'asking');
  END IF;
  v_old := COALESCE(OLD.monthly_php, 0);
  v_new := COALESCE(NEW.monthly_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'monthly');
  END IF;
  v_old := COALESCE(OLD.down_payment_php, 0);
  v_new := COALESCE(NEW.down_payment_php, 0);
  IF v_old <> v_new AND v_old > 0 AND v_new > 0 THEN
    v_delta := v_new - v_old;
    v_pct := ROUND((v_delta / v_old) * 100.0, 2);
    INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct, field)
    VALUES (NEW.id, v_old, v_new, v_delta, v_pct, 'down_payment');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  label text NOT NULL,
  percent_off numeric(5,2),
  amount_off_php numeric(14,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing_active
  ON public.listing_promotions(listing_id, ends_at DESC);

GRANT SELECT ON public.listing_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;

ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promos for visible listings"
  ON public.listing_promotions FOR SELECT
  USING (
    ends_at > now() AND starts_at <= now() AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_promotions.listing_id
        AND l.status IN ('active','pending_sale')
    )
  );

CREATE POLICY "Owners manage own listing promos"
  ON public.listing_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

CREATE POLICY "Staff manage all listing promos"
  ON public.listing_promotions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role));

CREATE TRIGGER trg_listing_promotions_updated
  BEFORE UPDATE ON public.listing_promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_listing_price_trend(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.changed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trend(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_trends(_listing_ids uuid[])
RETURNS TABLE(
  listing_id uuid,
  field text,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (h.listing_id) h.listing_id, h.field, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = ANY(_listing_ids)
    AND l.status IN ('active','pending_sale')
    AND h.changed_at > now() - interval '30 days'
  ORDER BY h.listing_id, h.changed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_trends(uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_listing_price_history(_listing_id uuid)
RETURNS TABLE(
  field text,
  old_price_php numeric,
  new_price_php numeric,
  delta_php numeric,
  delta_pct numeric,
  direction text,
  changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.field, h.old_price_php, h.new_price_php, h.delta_php, h.delta_pct,
    CASE WHEN h.delta_php > 0 THEN 'up' ELSE 'down' END, h.changed_at
  FROM public.listing_price_history h
  JOIN public.listings l ON l.id = h.listing_id
  WHERE h.listing_id = _listing_id
    AND l.status IN ('active','pending_sale')
  ORDER BY h.changed_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_price_history(uuid) TO anon, authenticated, service_role;

-- ===== END SOURCE MIGRATION: 20260613035610_c210e9ab-f101-44b8-9bc3-ad6dd05e0ff9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613041354_d7a99bca-9ea5-4580-8838-8e5059e5816e.sql =====

-- Enums
DO $$ BEGIN
  CREATE TYPE public.parts_wanted_kind AS ENUM ('part', 'parting_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.parts_wanted_status AS ENUM ('open', 'closed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ parts_wanted ============
CREATE TABLE IF NOT EXISTS public.parts_wanted (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.parts_wanted_kind NOT NULL DEFAULT 'part',
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 4000),
  vehicle_category TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  engine_code TEXT,
  trim TEXT,
  part_category TEXT,
  part_keywords TEXT[] NOT NULL DEFAULT '{}',
  condition_pref TEXT NOT NULL DEFAULT 'any',
  budget_max_php NUMERIC(12,2),
  region TEXT,
  city TEXT,
  alert_frequency TEXT NOT NULL DEFAULT 'instant' CHECK (alert_frequency IN ('off','instant','daily')),
  last_alerted_at TIMESTAMPTZ,
  status public.parts_wanted_status NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_wanted_user_idx ON public.parts_wanted(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_status_idx ON public.parts_wanted(status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_lookup_idx ON public.parts_wanted(lower(make), lower(model), year) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS parts_wanted_engine_idx ON public.parts_wanted(lower(engine_code)) WHERE status = 'open' AND engine_code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_wanted TO authenticated;
GRANT SELECT ON public.parts_wanted TO anon;
GRANT ALL ON public.parts_wanted TO service_role;

ALTER TABLE public.parts_wanted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open parts_wanted"
  ON public.parts_wanted FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

CREATE POLICY "Users insert own parts_wanted"
  ON public.parts_wanted FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own parts_wanted"
  ON public.parts_wanted FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own parts_wanted"
  ON public.parts_wanted FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_parts_wanted_updated_at
  BEFORE UPDATE ON public.parts_wanted
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ parts_wanted_matches ============
CREATE TABLE IF NOT EXISTS public.parts_wanted_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_id UUID NOT NULL REFERENCES public.parts_wanted(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  UNIQUE (wanted_id, listing_id)
);

CREATE INDEX IF NOT EXISTS parts_wanted_matches_wanted_idx ON public.parts_wanted_matches(wanted_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS parts_wanted_matches_unsent_idx ON public.parts_wanted_matches(notified_at) WHERE notified_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS parts_wanted_matches_listing_idx ON public.parts_wanted_matches(listing_id);

GRANT SELECT, UPDATE ON public.parts_wanted_matches TO authenticated;
GRANT ALL ON public.parts_wanted_matches TO service_role;

ALTER TABLE public.parts_wanted_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their matches"
  ON public.parts_wanted_matches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()));

CREATE POLICY "Owners dismiss their matches"
  ON public.parts_wanted_matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parts_wanted w WHERE w.id = wanted_id AND w.user_id = auth.uid()));

-- ============ Match function ============
CREATE OR REPLACE FUNCTION public.match_listing_to_parts_wanted(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_fitment_makes TEXT[];
  v_fitment_models TEXT[];
  v_engine_text TEXT;
  v_text_blob TEXT;
  v_inserted INTEGER := 0;
  v_w RECORD;
  v_score NUMERIC;
  v_kw TEXT;
BEGIN
  SELECT id, title, COALESCE(description,''), category_slug, region, attributes, status, user_id
    INTO v_listing
    FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND OR v_listing.status <> 'published' OR v_listing.category_slug <> 'parts' THEN
    RETURN 0;
  END IF;

  v_text_blob := lower(coalesce(v_listing.title,'') || ' ' || coalesce(v_listing.description::text,'') || ' ' || coalesce(v_listing.attributes::text,''));
  v_engine_text := lower(coalesce(v_listing.attributes->>'engine_code',''));

  FOR v_w IN
    SELECT * FROM public.parts_wanted
    WHERE status = 'open' AND expires_at > now() AND user_id <> v_listing.user_id
  LOOP
    v_score := 0;

    -- Fitment make/model match
    IF EXISTS (
      SELECT 1 FROM public.listing_fitment f
      WHERE f.listing_id = v_listing.id
        AND lower(f.make) = lower(v_w.make)
        AND lower(f.model) = lower(v_w.model)
    ) THEN
      v_score := v_score + 3;
      -- Year in range
      IF v_w.year IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.listing_fitment f
        WHERE f.listing_id = v_listing.id
          AND lower(f.make) = lower(v_w.make)
          AND lower(f.model) = lower(v_w.model)
          AND (f.year_min IS NULL OR v_w.year >= f.year_min)
          AND (f.year_max IS NULL OR v_w.year <= f.year_max)
      ) THEN
        v_score := v_score + 2;
      END IF;
    ELSE
      -- Fallback: title/description contains make and model words
      IF position(lower(v_w.make) IN v_text_blob) > 0 AND position(lower(v_w.model) IN v_text_blob) > 0 THEN
        v_score := v_score + 2;
        IF v_w.year IS NOT NULL AND position(v_w.year::text IN v_text_blob) > 0 THEN
          v_score := v_score + 1;
        END IF;
      END IF;
    END IF;

    -- Engine code match
    IF v_w.engine_code IS NOT NULL AND length(v_w.engine_code) >= 3 THEN
      IF v_engine_text = lower(v_w.engine_code)
         OR position(lower(v_w.engine_code) IN v_text_blob) > 0
         OR position(lower(regexp_replace(v_w.engine_code,'[-_ ]','','g')) IN regexp_replace(v_text_blob,'[-_ ]','','g')) > 0 THEN
        v_score := v_score + 2;
      END IF;
    END IF;

    -- Part keywords
    IF v_w.part_keywords IS NOT NULL THEN
      FOREACH v_kw IN ARRAY v_w.part_keywords LOOP
        IF length(v_kw) >= 2 AND position(lower(v_kw) IN v_text_blob) > 0 THEN
          v_score := v_score + 1;
        END IF;
      END LOOP;
    END IF;

    -- Region bonus
    IF v_w.region IS NOT NULL AND v_listing.region IS NOT NULL
       AND lower(v_w.region) = lower(v_listing.region) THEN
      v_score := v_score + 1;
    END IF;

    IF v_score >= 4 THEN
      INSERT INTO public.parts_wanted_matches (wanted_id, listing_id, score)
      VALUES (v_w.id, v_listing.id, v_score)
      ON CONFLICT (wanted_id, listing_id)
        DO UPDATE SET score = GREATEST(public.parts_wanted_matches.score, EXCLUDED.score);
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- ============ Backfill on new wanted ============
CREATE OR REPLACE FUNCTION public.backfill_parts_wanted(p_wanted_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_listing_id IN
    SELECT id FROM public.listings
    WHERE status = 'published'
      AND category_slug = 'parts'
      AND published_at > now() - interval '60 days'
  LOOP
    -- Re-use match function but only for this wanted: simpler to call generic and let unique constraint filter.
    PERFORM public.match_listing_to_parts_wanted(v_listing_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============ Trigger on listings ============
CREATE OR REPLACE FUNCTION public.tg_listings_match_parts_wanted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_slug = 'parts' AND NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.match_listing_to_parts_wanted(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_match_parts_wanted ON public.listings;
CREATE TRIGGER trg_listings_match_parts_wanted
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listings_match_parts_wanted();

-- ============ Public RPC: count wanted matching a listing (badge) ============
CREATE OR REPLACE FUNCTION public.get_listing_wanted_count(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT m.wanted_id)::INT
  FROM public.parts_wanted_matches m
  JOIN public.parts_wanted w ON w.id = m.wanted_id
  WHERE m.listing_id = p_listing_id AND w.status = 'open';
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_wanted_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_listing_to_parts_wanted(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_parts_wanted(UUID) TO service_role;

-- ===== END SOURCE MIGRATION: 20260613041354_d7a99bca-9ea5-4580-8838-8e5059e5816e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613042135_3c1c1370-98c3-4ac6-8cd5-bfe4716ac7e8.sql =====
-- Fix: Vehicle Passport Premium payments were silently failing to record because
-- "passport_premium" was not a valid payment_kind enum value (webhook.ts
-- activatePassportPremiumFromSession inserts kind: "passport_premium").
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'passport_premium';
-- ===== END SOURCE MIGRATION: 20260613042135_3c1c1370-98c3-4ac6-8cd5-bfe4716ac7e8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613050000_00d9de2b-0532-432b-85bb-44d0b430cfe3.sql =====
-- Fix: Business directory and dispatch (towing provider) subscription renewal
-- invoices were never recorded in `payments` because recordPaymentFromInvoice()
-- in webhook.ts only checked the `subscriptions` table for the Stripe
-- subscription id, and "business_subscription" / "dispatch_subscription" were
-- not valid payment_kind enum values. Part of the unified revenue reporting fix.
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'business_subscription';
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'dispatch_subscription';

-- ===== END SOURCE MIGRATION: 20260613050000_00d9de2b-0532-432b-85bb-44d0b430cfe3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613050100_58e517f1-dbd6-4dd3-b29a-7dd40fd936c8.sql =====
-- Backfill: historical Vehicle Passport Premium purchases recorded before the
-- "passport_premium" payment_kind enum value existed have payment_id = NULL,
-- because the payments insert in activatePassportPremiumFromSession() was
-- silently failing (see migration 20260613042135). Create the missing
-- `payments` rows (priced from passport_premium_products) and link them back
-- via payment_id so revenue reporting ("Revenue by product") includes these
-- historical purchases.
WITH inserted AS (
  INSERT INTO public.payments (
    user_id, kind, status, amount_php, gross_amount_php, method, reference, paid_at, created_at
  )
  SELECT
    ppp.user_id,
    'passport_premium'::public.payment_kind,
    'paid'::public.payment_status,
    prod.price_php,
    prod.price_php,
    'stripe',
    COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text),
    ppp.created_at,
    ppp.created_at
  FROM public.passport_premium_purchases ppp
  JOIN public.passport_premium_products prod ON prod.slug = ppp.product_slug
  WHERE ppp.payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p2
      WHERE p2.reference = COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text)
    )
  RETURNING id, reference
)
UPDATE public.passport_premium_purchases ppp
SET payment_id = inserted.id
FROM inserted
WHERE ppp.payment_id IS NULL
  AND COALESCE('stripe_session:' || ppp.stripe_session_id, 'backfill:passport_premium_purchases:' || ppp.id::text) = inserted.reference;

-- ===== END SOURCE MIGRATION: 20260613050100_58e517f1-dbd6-4dd3-b29a-7dd40fd936c8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260613171425_1213eb65-8a37-49f4-8c6a-322d6c9cb5b8.sql =====

INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Solo', 799.00, 'shop_manager_solo_monthly',
  '["1 technician","Unlimited work orders","Customer + vehicle history","Invoicing","Mobile-friendly"]'::jsonb, 100, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_solo_monthly');

INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Pro', 1999.00, 'shop_manager_pro_monthly',
  '["Up to 10 technicians","Inventory + parts tracking","Repair plans + quotes","Photo VINs / inspections","Email + SMS reminders","Priority support"]'::jsonb, 101, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_pro_monthly');

CREATE TABLE IF NOT EXISTS public.shop_manager_provisioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  external_account_id text,
  external_user_email text,
  tier text,
  sso_provisioned_at timestamptz,
  last_sso_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_manager_provisioning TO authenticated;
GRANT ALL    ON public.shop_manager_provisioning TO service_role;

ALTER TABLE public.shop_manager_provisioning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_manager_provisioning own row read" ON public.shop_manager_provisioning;
CREATE POLICY "shop_manager_provisioning own row read"
  ON public.shop_manager_provisioning FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_shop_manager_provisioning_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS shop_manager_provisioning_touch ON public.shop_manager_provisioning;
CREATE TRIGGER shop_manager_provisioning_touch
  BEFORE UPDATE ON public.shop_manager_provisioning
  FOR EACH ROW EXECUTE FUNCTION public.tg_shop_manager_provisioning_touch();

-- ===== END SOURCE MIGRATION: 20260613171425_1213eb65-8a37-49f4-8c6a-322d6c9cb5b8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260614085350_85fe0599-95d4-4737-b909-bebe0a2fd766.sql =====

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('accepted','dismissed')),
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_resolution_idx ON public.reports(resolution);

ALTER TABLE public.listing_media
  ADD COLUMN IF NOT EXISTS phash text,
  ADD COLUMN IF NOT EXISTS file_sha256 text;

CREATE INDEX IF NOT EXISTS listing_media_phash_idx ON public.listing_media(phash) WHERE phash IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_sha_idx ON public.listing_media(file_sha256) WHERE file_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_storage_path_idx ON public.listing_media(storage_path) WHERE storage_path IS NOT NULL;

-- ===== END SOURCE MIGRATION: 20260614085350_85fe0599-95d4-4737-b909-bebe0a2fd766.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260614090848_beea068c-2b7b-4f59-b645-1382f7e6693c.sql =====
CREATE TABLE IF NOT EXISTS public.form_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL,
  page_path text,
  message text NOT NULL,
  suggestion_type text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text,
  user_agent text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_feedback_form_idx ON public.form_feedback(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS form_feedback_status_idx ON public.form_feedback(status, created_at DESC);
GRANT SELECT, INSERT ON public.form_feedback TO authenticated;
GRANT INSERT ON public.form_feedback TO anon;
GRANT ALL ON public.form_feedback TO service_role;
ALTER TABLE public.form_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit feedback" ON public.form_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users can read own feedback" ON public.form_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins can read all feedback" ON public.form_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update feedback" ON public.form_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- ===== END SOURCE MIGRATION: 20260614090848_beea068c-2b7b-4f59-b645-1382f7e6693c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615022440_4d6fb9e4-c294-4d42-a9f0-401223fa4169.sql =====

-- Enum for request status
DO $$ BEGIN
  CREATE TYPE public.staff_contact_request_status AS ENUM ('pending','approved','denied','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_contact_audit_action AS ENUM ('created','approved','denied','revoked','expired','accessed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requests table
CREATE TABLE IF NOT EXISTS public.staff_client_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID,
  ad_inquiry_id UUID,
  reason TEXT NOT NULL,
  status public.staff_contact_request_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> owner_id),
  CHECK (client_profile_id IS NOT NULL OR lead_id IS NOT NULL OR ad_inquiry_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_scc_requests_owner_status ON public.staff_client_contact_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_requester_status ON public.staff_client_contact_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_scc_requests_client ON public.staff_client_contact_requests(client_profile_id);

GRANT SELECT, INSERT, UPDATE ON public.staff_client_contact_requests TO authenticated;
GRANT ALL ON public.staff_client_contact_requests TO service_role;

ALTER TABLE public.staff_client_contact_requests ENABLE ROW LEVEL SECURITY;

-- Audit table (append-only)
CREATE TABLE IF NOT EXISTS public.staff_client_contact_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.staff_client_contact_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.staff_contact_audit_action NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scc_audit_request ON public.staff_client_contact_audit(request_id, created_at DESC);

GRANT SELECT, INSERT ON public.staff_client_contact_audit TO authenticated;
GRANT ALL ON public.staff_client_contact_audit TO service_role;

ALTER TABLE public.staff_client_contact_audit ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_scc_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_scc_requests_updated_at ON public.staff_client_contact_requests;
CREATE TRIGGER trg_scc_requests_updated_at
  BEFORE UPDATE ON public.staff_client_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_scc_requests_set_updated_at();

-- Helper: is_365_staff (admin/moderator OR @365motorsales.com email)
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','moderator')
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) LIKE '%@365motorsales.com'
  );
$$;

-- Helper: active client access
CREATE OR REPLACE FUNCTION public.has_active_client_access(_requester UUID, _owner UUID, _client UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_client_contact_requests
    WHERE requester_id = _requester
      AND owner_id = _owner
      AND client_profile_id = _client
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- RLS policies: requests
DROP POLICY IF EXISTS "scc_requests_select" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_select" ON public.staff_client_contact_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "scc_requests_insert" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_insert" ON public.staff_client_contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND public.is_365_staff(auth.uid())
    AND public.is_365_staff(owner_id)
  );

DROP POLICY IF EXISTS "scc_requests_update" ON public.staff_client_contact_requests;
CREATE POLICY "scc_requests_update" ON public.staff_client_contact_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = requester_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS policies: audit
DROP POLICY IF EXISTS "scc_audit_select" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_select" ON public.staff_client_contact_audit
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "scc_audit_insert" ON public.staff_client_contact_audit;
CREATE POLICY "scc_audit_insert" ON public.staff_client_contact_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_client_contact_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- ===== END SOURCE MIGRATION: 20260615022440_4d6fb9e4-c294-4d42-a9f0-401223fa4169.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615031547_8dcbb6a4-32d5-47c7-9ba9-bcfcb23177aa.sql =====

-- 1. Sequence + column
CREATE SEQUENCE IF NOT EXISTS public.profiles_member_number_seq;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_number BIGINT;

-- 2. Backfill in created_at order so older users get lower numbers
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE member_number IS NULL
)
UPDATE public.profiles p
SET member_number = o.rn
FROM ordered o
WHERE p.id = o.id;

-- 3. Advance the sequence past existing max
SELECT setval(
  'public.profiles_member_number_seq',
  GREATEST(COALESCE((SELECT MAX(member_number) FROM public.profiles), 0), 1),
  true
);

-- 4. Default + unique
ALTER TABLE public.profiles
  ALTER COLUMN member_number SET DEFAULT nextval('public.profiles_member_number_seq');

ALTER SEQUENCE public.profiles_member_number_seq OWNED BY public.profiles.member_number;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_member_number_key
  ON public.profiles(member_number);

-- 5. Trigger to assign on insert if NULL was passed
CREATE OR REPLACE FUNCTION public.assign_profile_member_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := nextval('public.profiles_member_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_profile_member_number ON public.profiles;
CREATE TRIGGER trg_assign_profile_member_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_profile_member_number();

-- ===== END SOURCE MIGRATION: 20260615031547_8dcbb6a4-32d5-47c7-9ba9-bcfcb23177aa.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql =====

-- ============================================================
-- report_actions: append-only ledger of every moderation step
-- ============================================================
CREATE TABLE public.report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'accept','dismiss','hide_listing','delete_listing','restore_listing',
    'publish_summary','unpublish_summary','reverse','dispute_overturn','dispute_uphold','note'
  )),
  prev_status text,
  new_status text,
  prev_resolution text,
  new_resolution text,
  score_delta int NOT NULL DEFAULT 0,
  listing_effect text NOT NULL DEFAULT 'none' CHECK (listing_effect IN ('none','hidden','deleted','restored')),
  notified_poster boolean NOT NULL DEFAULT false,
  note text,
  reversed_by_action_id uuid REFERENCES public.report_actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_actions_report_idx ON public.report_actions(report_id, created_at DESC);
CREATE INDEX report_actions_actor_idx ON public.report_actions(actor_id);

GRANT SELECT ON public.report_actions TO authenticated;
GRANT ALL ON public.report_actions TO service_role;

ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Posters can read actions on reports targeting their own listings
CREATE POLICY "poster reads own report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.listings l ON l.id = r.listing_id
    WHERE r.id = report_actions.report_id AND l.user_id = auth.uid()
  ));

-- ============================================================
-- report_disputes
-- ============================================================
CREATE TABLE public.report_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','overturned','withdrawn')),
  admin_response text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  score_refund int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One open dispute per report per user
CREATE UNIQUE INDEX report_disputes_one_open_idx
  ON public.report_disputes(report_id, user_id) WHERE status = 'open';
CREATE INDEX report_disputes_user_idx ON public.report_disputes(user_id);
CREATE INDEX report_disputes_status_idx ON public.report_disputes(status);

GRANT SELECT, INSERT, UPDATE ON public.report_disputes TO authenticated;
GRANT ALL ON public.report_disputes TO service_role;

ALTER TABLE public.report_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage disputes" ON public.report_disputes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "poster reads own dispute" ON public.report_disputes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow a poster to file a dispute on a report whose listing they own, within 14 days of resolution
CREATE POLICY "poster files dispute" ON public.report_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.listings l ON l.id = r.listing_id
      WHERE r.id = report_id
        AND l.user_id = auth.uid()
        AND r.status = 'resolved'
        AND r.resolved_at IS NOT NULL
        AND r.resolved_at > now() - interval '14 days'
    )
  );

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER report_disputes_updated
  BEFORE UPDATE ON public.report_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- trust_score_events
-- ============================================================
CREATE TABLE public.trust_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason_code text NOT NULL,
  reason_label text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('report','dispute','review','verification','listing','bonus','tier','manual')),
  source_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trust_score_events_user_idx ON public.trust_score_events(user_id, created_at DESC);
CREATE INDEX trust_score_events_source_idx ON public.trust_score_events(source_type, source_id);

GRANT SELECT ON public.trust_score_events TO authenticated;
GRANT ALL ON public.trust_score_events TO service_role;

ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read trust events" ON public.trust_score_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "user reads own trust events" ON public.trust_score_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Aggregated score view (500 baseline, clamped 0..1000)
CREATE OR REPLACE FUNCTION public.get_trust_score(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, LEAST(1000, 500 + COALESCE((
    SELECT SUM(delta)::int FROM public.trust_score_events WHERE user_id = _user_id
  ), 0)));
$$;

-- ============================================================
-- member_tiers (config, seeded)
-- ============================================================
CREATE TABLE public.member_tiers (
  id text PRIMARY KEY, -- 'common'|'uncommon'|'rare'|'epic'|'legendary'
  name text NOT NULL,
  min_score int NOT NULL,
  min_tenure_days int NOT NULL,
  color text NOT NULL,
  rank int NOT NULL UNIQUE,
  quarterly_boost_credits int NOT NULL DEFAULT 0,
  annual_boost_credits int NOT NULL DEFAULT 0,
  annual_badge_months int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_tiers TO authenticated, anon;
GRANT ALL ON public.member_tiers TO service_role;
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers readable" ON public.member_tiers FOR SELECT USING (true);

INSERT INTO public.member_tiers (id,name,min_score,min_tenure_days,color,rank,quarterly_boost_credits,annual_boost_credits,annual_badge_months) VALUES
  ('common','Common',0,0,'slate',1,1,0,0),
  ('uncommon','Uncommon',550,30,'green',2,2,4,0),
  ('rare','Rare',650,90,'blue',3,4,8,3),
  ('epic','Epic',750,180,'purple',4,7,15,6),
  ('legendary','Legendary',875,365,'amber',5,12,30,12);

-- ============================================================
-- member_rewards (issued)
-- ============================================================
CREATE TABLE public.member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('boost_credit','featured_badge','spotlight','custom')),
  amount int NOT NULL DEFAULT 1,
  period text, -- 'q1-2026', '2026' etc
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','claimed','expired','revoked')),
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
CREATE INDEX member_rewards_user_idx ON public.member_rewards(user_id, status);

GRANT SELECT, UPDATE ON public.member_rewards TO authenticated;
GRANT ALL ON public.member_rewards TO service_role;
ALTER TABLE public.member_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own rewards" ON public.member_rewards
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user claims own reward" ON public.member_rewards
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff manage rewards" ON public.member_rewards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- apply_report_action RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_report_action(
  _report_id uuid,
  _action text,
  _note text DEFAULT NULL,
  _hide_listing boolean DEFAULT false,
  _delete_listing boolean DEFAULT false,
  _notify_poster boolean DEFAULT false,
  _reverses_action_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _report public.reports%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _delta int := 0;
  _listing_effect text := 'none';
  _new_status text;
  _new_resolution text;
  _action_id uuid;
  _reason_code text;
  _reason_label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _report FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF _report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _report.listing_id IS NOT NULL THEN
    SELECT * INTO _listing FROM public.listings WHERE id = _report.listing_id;
  END IF;

  -- Reverse only permitted to admins
  IF _action = 'reverse' AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse decisions';
  END IF;

  -- Compute effects
  IF _action = 'accept' THEN
    _new_status := 'resolved'; _new_resolution := 'accepted';
    _delta := -25; _reason_code := 'report_accepted'; _reason_label := 'Report accepted against you';
  ELSIF _action = 'dismiss' THEN
    _new_status := 'resolved'; _new_resolution := 'dismissed';
    _delta := 0; _reason_code := 'report_dismissed'; _reason_label := 'Report dismissed';
  ELSIF _action = 'reverse' THEN
    _new_status := 'open'; _new_resolution := NULL;
    -- Invert original delta
    IF _reverses_action_id IS NOT NULL THEN
      SELECT -score_delta INTO _delta FROM public.report_actions WHERE id = _reverses_action_id;
      _delta := COALESCE(_delta,0);
    END IF;
    _reason_code := 'decision_reversed'; _reason_label := 'Prior moderation decision reversed';
  ELSE
    -- Non-status-changing actions inherit current status
    _new_status := _report.status; _new_resolution := _report.resolution;
  END IF;

  -- Listing side effects
  IF _hide_listing AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'hidden' WHERE id = _listing.id;
    _listing_effect := 'hidden';
    _delta := _delta - 10;
  END IF;
  IF _delete_listing AND _listing.id IS NOT NULL THEN
    DELETE FROM public.listings WHERE id = _listing.id;
    _listing_effect := 'deleted';
    _delta := _delta - 30;
  END IF;
  IF _action = 'restore_listing' AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'active' WHERE id = _listing.id;
    _listing_effect := 'restored';
    _delta := _delta + 10;
  END IF;

  -- Update report when status changes
  IF _action IN ('accept','dismiss','reverse') THEN
    UPDATE public.reports SET
      status = _new_status,
      resolution = _new_resolution,
      resolved_by = CASE WHEN _new_status='resolved' THEN _actor ELSE NULL END,
      resolved_at = CASE WHEN _new_status='resolved' THEN now() ELSE NULL END
    WHERE id = _report_id;
  END IF;

  -- Write ledger row
  INSERT INTO public.report_actions(
    report_id, actor_id, action, prev_status, new_status, prev_resolution, new_resolution,
    score_delta, listing_effect, notified_poster, note, reversed_by_action_id
  ) VALUES (
    _report_id, _actor, _action, _report.status, _new_status, _report.resolution, _new_resolution,
    _delta, _listing_effect, _notify_poster, _note, _reverses_action_id
  ) RETURNING id INTO _action_id;

  -- Mark the reversed row
  IF _action = 'reverse' AND _reverses_action_id IS NOT NULL THEN
    UPDATE public.report_actions SET reversed_by_action_id = _action_id WHERE id = _reverses_action_id;
  END IF;

  -- Write trust score event for the poster (when there is one)
  IF _listing.user_id IS NOT NULL AND _delta <> 0 THEN
    INSERT INTO public.trust_score_events(
      user_id, delta, reason_code, reason_label, source_type, source_id, actor_id
    ) VALUES (
      _listing.user_id, _delta, _reason_code, _reason_label, 'report', _report_id, _actor
    );
  END IF;

  RETURN _action_id;
END $$;

REVOKE ALL ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) TO authenticated;

-- ===== END SOURCE MIGRATION: 20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615041003_2a252442-7543-45ae-b1b5-dc6302e72f01.sql =====

-- ============================================================
-- boost_credits wallet (positive = grant, negative = consumption)
-- ============================================================
CREATE TABLE public.boost_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL CHECK (amount <> 0),
  source text NOT NULL CHECK (source IN ('reward','purchase','manual','consumption')),
  reward_id uuid REFERENCES public.member_rewards(id) ON DELETE SET NULL,
  listing_boost_id uuid REFERENCES public.listing_boosts(id) ON DELETE SET NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boost_credits_user_idx ON public.boost_credits(user_id, created_at DESC);

GRANT SELECT ON public.boost_credits TO authenticated;
GRANT ALL ON public.boost_credits TO service_role;

ALTER TABLE public.boost_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE OR REPLACE FUNCTION public.get_boost_credit_balance(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0)::int FROM public.boost_credits WHERE user_id = _user_id;
$$;

-- ============================================================
-- profiles.tier_id cache
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS tier_recomputed_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_tier_idx ON public.profiles(tier_id);

-- Pure function: compute tier for a user given current score + tenure
CREATE OR REPLACE FUNCTION public.compute_user_tier(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _score int;
  _tenure_days int;
  _tier text;
BEGIN
  SELECT public.get_trust_score(_user_id) INTO _score;
  SELECT EXTRACT(DAY FROM now() - created_at)::int INTO _tenure_days
    FROM auth.users WHERE id = _user_id;
  IF _tenure_days IS NULL THEN _tenure_days := 0; END IF;

  SELECT id INTO _tier FROM public.member_tiers
   WHERE _score >= min_score AND _tenure_days >= min_tenure_days
   ORDER BY rank DESC LIMIT 1;

  RETURN COALESCE(_tier, 'common');
END $$;

-- ============================================================
-- resolve_report_dispute RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_report_dispute(
  _dispute_id uuid,
  _decision text,           -- 'uphold' | 'overturn'
  _response text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _dispute public.report_disputes%ROWTYPE;
  _orig_action public.report_actions%ROWTYPE;
  _refund int := 0;
  _new_status text;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _decision NOT IN ('uphold','overturn') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  IF _response IS NULL OR length(trim(_response)) < 10 THEN
    RAISE EXCEPTION 'Response note required (min 10 chars)';
  END IF;

  SELECT * INTO _dispute FROM public.report_disputes WHERE id = _dispute_id FOR UPDATE;
  IF _dispute.id IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF _dispute.status <> 'open' THEN RAISE EXCEPTION 'Dispute already resolved'; END IF;

  _new_status := CASE WHEN _decision = 'uphold' THEN 'upheld' ELSE 'overturned' END;

  IF _decision = 'overturn' THEN
    -- Find latest accept action on this report to reverse
    SELECT * INTO _orig_action FROM public.report_actions
      WHERE report_id = _dispute.report_id AND action = 'accept'
        AND reversed_by_action_id IS NULL
      ORDER BY created_at DESC LIMIT 1;

    IF _orig_action.id IS NOT NULL THEN
      -- Use apply_report_action to perform the reversal cleanly
      PERFORM public.apply_report_action(
        _dispute.report_id, 'reverse',
        'Dispute overturned: ' || _response,
        false, false, true, _orig_action.id
      );
      _refund := COALESCE(-_orig_action.score_delta, 0) + 5; -- bonus +5 for wrongful report

      -- Add the +5 bonus event (the reverse already refunded the original delta)
      INSERT INTO public.trust_score_events(user_id, delta, reason_code, reason_label, source_type, source_id, actor_id)
      VALUES (_dispute.user_id, 5, 'dispute_overturned_bonus', 'Wrongly-reported bonus', 'dispute', _dispute.id, _actor);

      -- If the listing is currently hidden because of the original action, restore it
      IF _orig_action.listing_effect = 'hidden' THEN
        UPDATE public.listings SET status='active'
          WHERE id = (SELECT listing_id FROM public.reports WHERE id = _dispute.report_id);
      END IF;
    END IF;
  END IF;

  UPDATE public.report_disputes SET
    status = _new_status,
    admin_response = _response,
    resolved_by = _actor,
    resolved_at = now(),
    score_refund = _refund
  WHERE id = _dispute_id;

  RETURN _dispute_id;
END $$;

REVOKE ALL ON FUNCTION public.resolve_report_dispute(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_report_dispute(uuid,text,text) TO authenticated;

-- ============================================================
-- grant_member_reward RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_member_reward(
  _user_id uuid,
  _kind text,
  _amount int,
  _tier_id text,
  _period text,
  _note text,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _reward_id uuid;
BEGIN
  IF _actor IS NOT NULL AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _kind NOT IN ('boost_credit','featured_badge','spotlight','custom') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  -- Idempotency: if a granted reward already exists for this user+period+kind, return it
  SELECT id INTO _reward_id FROM public.member_rewards
   WHERE user_id = _user_id AND COALESCE(period,'') = COALESCE(_period,'')
     AND kind = _kind AND status IN ('granted','claimed')
   LIMIT 1;
  IF _reward_id IS NOT NULL THEN RETURN _reward_id; END IF;

  INSERT INTO public.member_rewards(user_id, tier_id, kind, amount, period, note, granted_by, expires_at, status)
  VALUES (_user_id, _tier_id, _kind, _amount, _period, _note, _actor, _expires_at, 'granted')
  RETURNING id INTO _reward_id;

  -- Auto-deposit boost credits into wallet
  IF _kind = 'boost_credit' AND _amount > 0 THEN
    INSERT INTO public.boost_credits(user_id, amount, source, reward_id, note, actor_id)
    VALUES (_user_id, _amount, 'reward', _reward_id, COALESCE(_note, 'Tier bonus'), _actor);
    UPDATE public.member_rewards SET status='claimed', claimed_at=now() WHERE id=_reward_id;
  END IF;

  RETURN _reward_id;
END $$;

REVOKE ALL ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) TO authenticated, service_role;

-- ===== END SOURCE MIGRATION: 20260615041003_2a252442-7543-45ae-b1b5-dc6302e72f01.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615043357_0189690f-14ba-493e-a401-98a94c6c3be8.sql =====

CREATE OR REPLACE FUNCTION public.tg_notify_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user uuid;
  v_rep uuid;
  v_listing_title text;
BEGIN
  -- Resolve target user
  IF NEW.listing_id IS NOT NULL THEN
    SELECT user_id, title INTO v_target_user, v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;
  END IF;

  -- Insert admin ops alert (visible in Admin → Alerts)
  INSERT INTO public.ops_alerts (event, severity, source, details)
  VALUES (
    'report_filed',
    'warning',
    'reports',
    jsonb_build_object(
      'report_id', NEW.id,
      'target_type', NEW.target_type,
      'target_user_id', v_target_user,
      'reporter_id', NEW.reporter_id,
      'category', NEW.category,
      'reason', NEW.reason,
      'listing_id', NEW.listing_id,
      'listing_title', v_listing_title
    )
  );

  -- Notify assigned 365 sales rep (if any) via a follow-up task
  IF v_target_user IS NOT NULL AND (NEW.reporter_id IS NULL OR NEW.reporter_id <> v_target_user) THEN
    SELECT rep_user_id INTO v_rep
    FROM public.sales_rep_assignments
    WHERE active = true
      AND subject_type = 'user'
      AND subject_id = v_target_user
    LIMIT 1;

    IF v_rep IS NOT NULL THEN
      INSERT INTO public.sales_rep_followups
        (rep_user_id, subject_type, subject_id, kind, status, title, body)
      VALUES (
        v_rep,
        'user',
        v_target_user,
        'request',
        'open',
        'Client reported — please reach out',
        format(
          'A report was filed against your client%s. Category: %s. Reason: %s. Report ID: %s',
          CASE WHEN v_listing_title IS NOT NULL THEN ' (listing: '||v_listing_title||')' ELSE '' END,
          coalesce(NEW.category,'n/a'),
          coalesce(NEW.reason,'n/a'),
          NEW.id::text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block report insert on notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_created ON public.reports;
CREATE TRIGGER trg_notify_report_created
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_report_created();

-- ===== END SOURCE MIGRATION: 20260615043357_0189690f-14ba-493e-a401-98a94c6c3be8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260615051550_216e1718-9be9-4635-81c1-16f7d40a4c68.sql =====

-- Update dispatch plan capacity to new tiers (Solo / Team / Unlimited)
-- and keep legacy slugs as aliases so old subscription rows still match.
CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    -- new
    ('dispatch_solo',       3,      1,  1),
    ('dispatch_team',       10,     3,  2),
    ('dispatch_unlimited',  999999, 99, 3),
    -- legacy aliases (any old rows still resolve)
    ('dispatch_starter',    3,      1,  1),
    ('dispatch_pro',        10,     3,  2),
    ('dispatch_fleet',      999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

-- Match function: treat unlimited (and legacy fleet) as nationwide
CREATE OR REPLACE FUNCTION public.dispatch_match_providers(_request_id uuid, _take integer DEFAULT 5)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; matches uuid[];
BEGIN
  SELECT pickup_region, pickup_province, pickup_city, matched_provider_ids
    INTO req FROM public.tow_requests WHERE id = _request_id;
  IF req IS NULL THEN RETURN '{}'::uuid[]; END IF;

  WITH eligible AS (
    SELECT
      ptr.user_id,
      ap.plan AS plan_slug,
      cap.priority AS tier_priority,
      cap.max_jobs,
      COALESCE(ptr.avg_rating, 0) AS rating,
      COALESCE(ptr.avg_response_sec, 999999) AS resp,
      b.city, b.province, b.region,
      (SELECT count(*) FROM public.tow_requests tr
         WHERE tr.provider_id = ptr.user_id
           AND tr.status IN ('assigned','in_progress','picked_up')) AS active_jobs
    FROM public.provider_tow_rates ptr
    JOIN LATERAL (SELECT public.get_active_dispatch_plan(ptr.user_id) AS plan) ap ON ap.plan IS NOT NULL
    LEFT JOIN LATERAL public.dispatch_plan_capacity(ap.plan) cap ON true
    LEFT JOIN public.businesses b ON b.owner_id = ptr.user_id AND b.type_slug='towing' AND b.status='active'
    WHERE ptr.dispatch_enabled = true
      AND (ap.plan IN ('dispatch_unlimited','dispatch_fleet')
        OR req.pickup_region = ANY(ptr.dispatch_regions)
        OR (b.region IS NOT NULL AND b.region = req.pickup_region))
  )
  SELECT COALESCE(array_agg(user_id ORDER BY
    tier_priority DESC NULLS LAST,
    CASE WHEN city = req.pickup_city THEN 0
         WHEN province = req.pickup_province THEN 1
         WHEN region = req.pickup_region THEN 2 ELSE 3 END,
    rating DESC, resp ASC
  ), '{}'::uuid[]) INTO matches
  FROM eligible
  WHERE active_jobs < COALESCE(max_jobs, 999999)
    AND NOT (user_id = ANY(req.matched_provider_ids));

  RETURN matches[1:_take];
END $$;

-- Update subscription_plans entries for new dispatch tiers
UPDATE public.subscription_plans
   SET name='Dispatch Solo', price_php=250.00, stripe_lookup_key='dispatch_solo_monthly',
       features='["1 driver seat","1 service region","Up to 3 active jobs","Dispatch inbox (web + PWA)","Email + in-app alerts"]'::jsonb
 WHERE stripe_lookup_key='dispatch_starter_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Team', price_php=500.00, stripe_lookup_key='dispatch_team_monthly',
       features='["Up to 5 drivers","Up to 3 service regions","Up to 10 active jobs","Priority placement in dispatch queue","SMS + push job alerts","Auto-route to nearest driver"]'::jsonb
 WHERE stripe_lookup_key='dispatch_pro_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Unlimited', price_php=1000.00, stripe_lookup_key='dispatch_unlimited_monthly',
       features='["Unlimited drivers","Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Live GPS tracking","White-label tracking link","API + webhooks"]'::jsonb
 WHERE stripe_lookup_key='dispatch_fleet_monthly';

-- ===== END SOURCE MIGRATION: 20260615051550_216e1718-9be9-4635-81c1-16f7d40a4c68.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql =====

-- ============ enums ============
DO $$ BEGIN
  CREATE TYPE public.business_staff_role AS ENUM
    ('owner','manager','dispatcher','driver','mechanic','clerk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_kind AS ENUM
    ('tow_truck','flatbed','wrecker','service_van','trailer','equipment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_asset_status AS ENUM
    ('active','maintenance','out_of_service','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ business_staff ============
CREATE TABLE IF NOT EXISTS public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_staff_role NOT NULL DEFAULT 'driver',
  title text,
  duties text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  on_shift boolean NOT NULL DEFAULT false,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS business_staff_user_idx ON public.business_staff(user_id);
CREATE INDEX IF NOT EXISTS business_staff_business_idx ON public.business_staff(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_staff TO authenticated;
GRANT ALL ON public.business_staff TO service_role;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

-- security-definer helpers (defined before policies that use them)
CREATE OR REPLACE FUNCTION public.is_business_owner(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business AND owner_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(_user uuid, _business uuid, _role public.business_staff_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
        AND (role = _role OR role = 'owner' OR role = 'manager')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user uuid, _business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id = _business AND user_id = _user AND active = true
    )
$$;

CREATE POLICY "staff: members read" ON public.business_staff
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR user_id = auth.uid());

CREATE POLICY "staff: owner/manager insert" ON public.business_staff
  FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "staff: owner/manager update" ON public.business_staff
  FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid())
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager') OR user_id = auth.uid());

CREATE POLICY "staff: owner delete" ON public.business_staff
  FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- ============ business_assets ============
CREATE TABLE IF NOT EXISTS public.business_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.business_asset_kind NOT NULL DEFAULT 'tow_truck',
  name text NOT NULL,
  plate text,
  vin text,
  capacity_kg integer,
  status public.business_asset_status NOT NULL DEFAULT 'active',
  assigned_driver_id uuid,
  photos jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_assets_business_idx ON public.business_assets(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_assets TO authenticated;
GRANT ALL ON public.business_assets TO service_role;
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets: members read" ON public.business_assets
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "assets: manager write" ON public.business_assets
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_asset_maintenance ============
CREATE TABLE IF NOT EXISTS public.business_asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.business_assets(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  odometer_km integer,
  work_done text NOT NULL,
  cost numeric(12,2),
  next_due_date date,
  next_due_km integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_asset_maint_asset_idx ON public.business_asset_maintenance(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_asset_maintenance TO authenticated;
GRANT ALL ON public.business_asset_maintenance TO service_role;
ALTER TABLE public.business_asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_maint: members read" ON public.business_asset_maintenance
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "asset_maint: manager write" ON public.business_asset_maintenance
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_items ============
CREATE TABLE IF NOT EXISTS public.business_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'pc',
  qty_on_hand numeric(12,2) NOT NULL DEFAULT 0,
  reorder_at numeric(12,2),
  cost numeric(12,2),
  location text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_business_idx ON public.business_inventory_items(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_inventory_items TO authenticated;
GRANT ALL ON public.business_inventory_items TO service_role;
ALTER TABLE public.business_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv: members read" ON public.business_inventory_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv: manager write" ON public.business_inventory_items
  FOR ALL TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

-- ============ business_inventory_movements ============
CREATE TABLE IF NOT EXISTS public.business_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delta numeric(12,2) NOT NULL,
  reason text,
  tow_request_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_inv_mov_item_idx ON public.business_inventory_movements(item_id);

GRANT SELECT, INSERT ON public.business_inventory_movements TO authenticated;
GRANT ALL ON public.business_inventory_movements TO service_role;
ALTER TABLE public.business_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_mov: members read" ON public.business_inventory_movements
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "inv_mov: member insert" ON public.business_inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

-- ============ tow_requests lifecycle extensions ============
ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_asset_id uuid REFERENCES public.business_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_scene_at timestamptz,
  ADD COLUMN IF NOT EXISTS towing_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_notes text;

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_business_staff_updated ON public.business_staff;
CREATE TRIGGER trg_business_staff_updated BEFORE UPDATE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_assets_updated ON public.business_assets;
CREATE TRIGGER trg_business_assets_updated BEFORE UPDATE ON public.business_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_inv_updated ON public.business_inventory_items;
CREATE TRIGGER trg_business_inv_updated BEFORE UPDATE ON public.business_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== END SOURCE MIGRATION: 20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616035936_bd7cf61d-c7b3-4584-a54e-03f8bed4a751.sql =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_bookings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='business_inquiries') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_inquiries';
  END IF;
END $$;
ALTER TABLE public.business_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.business_inquiries REPLICA IDENTITY FULL;
-- ===== END SOURCE MIGRATION: 20260616035936_bd7cf61d-c7b3-4584-a54e-03f8bed4a751.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616041102_c21d2dd8-e20c-401e-a314-86a096e7b2c9.sql =====

ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS auto_upgrade boolean NOT NULL DEFAULT false;

-- Seed sensible defaults per tier. Existing rows only.
UPDATE public.business_plans
SET limits = CASE tier
  WHEN 'listed'   THEN '{"staff":3,  "assets":3,  "listings":10, "inventory_skus":50,  "tow_jobs_month":50,  "storage_mb":250}'::jsonb
  WHEN 'featured' THEN '{"staff":10, "assets":10, "listings":50, "inventory_skus":250, "tow_jobs_month":250, "storage_mb":1000}'::jsonb
  WHEN 'premium'  THEN '{"staff":50, "assets":50, "listings":500,"inventory_skus":2000,"tow_jobs_month":2000,"storage_mb":10000}'::jsonb
  ELSE limits
END
WHERE limits = '{}'::jsonb OR limits IS NULL;

UPDATE public.business_plans
SET features = CASE tier
  WHEN 'listed'   THEN '{"dispatch":true, "analytics":false, "auto_upgrade":false}'::jsonb
  WHEN 'featured' THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true}'::jsonb
  WHEN 'premium'  THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true, "priority_support":true}'::jsonb
  ELSE features
END
WHERE features = '{}'::jsonb OR features IS NULL;

-- ===== END SOURCE MIGRATION: 20260616041102_c21d2dd8-e20c-401e-a314-86a096e7b2c9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616042054_404ed953-9c9e-47e3-9eaf-b25e7d5ebdf9.sql =====

CREATE TABLE public.business_plan_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  to_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  from_tier text,
  to_tier text,
  reason text NOT NULL CHECK (reason IN ('auto_upgrade','manual','downgrade','cancel','reactivate')),
  triggered_by text NOT NULL CHECK (triggered_by IN ('user','system')),
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bpcl_business ON public.business_plan_change_log(business_id, created_at DESC);

GRANT SELECT ON public.business_plan_change_log TO authenticated;
GRANT ALL ON public.business_plan_change_log TO service_role;

ALTER TABLE public.business_plan_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view plan change log"
ON public.business_plan_change_log
FOR SELECT
TO authenticated
USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'::app_role));

-- ===== END SOURCE MIGRATION: 20260616042054_404ed953-9c9e-47e3-9eaf-b25e7d5ebdf9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616051838_15d109db-c2ae-477f-a7d4-6f1b8ad10740.sql =====

-- 1) service_catalog
CREATE TABLE public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_slug TEXT NOT NULL REFERENCES public.business_types(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  default_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_type_slug, key)
);
CREATE INDEX idx_service_catalog_type ON public.service_catalog(business_type_slug, sort_order) WHERE active;

GRANT SELECT ON public.service_catalog TO anon, authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog readable by anyone"
  ON public.service_catalog FOR SELECT
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage catalog"
  ON public.service_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_catalog_updated
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) service_catalog_suggestions
CREATE TABLE public.service_catalog_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_slug TEXT NOT NULL REFERENCES public.business_types(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  proposed_title TEXT NOT NULL,
  proposed_unit TEXT,
  proposed_description TEXT,
  sample_price_php NUMERIC(12,2),
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','merged')),
  admin_note TEXT,
  merged_into_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svc_suggestions_status ON public.service_catalog_suggestions(status, created_at DESC);
CREATE INDEX idx_svc_suggestions_submitter ON public.service_catalog_suggestions(submitter_id);

GRANT SELECT, INSERT ON public.service_catalog_suggestions TO authenticated;
GRANT ALL ON public.service_catalog_suggestions TO service_role;
ALTER TABLE public.service_catalog_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters see their own suggestions"
  ON public.service_catalog_suggestions FOR SELECT
  TO authenticated
  USING (submitter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can submit suggestions"
  ON public.service_catalog_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "Admins manage suggestions"
  ON public.service_catalog_suggestions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_svc_suggestions_updated
  BEFORE UPDATE ON public.service_catalog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify admins on new suggestion
CREATE OR REPLACE FUNCTION public.notify_admin_service_suggestion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ops_alerts (event, severity, source, details)
  VALUES (
    'service_catalog.suggestion_submitted',
    'warning',
    'service-suggestion',
    jsonb_build_object(
      'suggestion_id', NEW.id,
      'business_type_slug', NEW.business_type_slug,
      'proposed_title', NEW.proposed_title,
      'submitter_id', NEW.submitter_id,
      'submitter_business_id', NEW.submitter_business_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_svc_suggestion_notify
  AFTER INSERT ON public.service_catalog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_service_suggestion();

-- 3) extend business_services
ALTER TABLE public.business_services
  ADD COLUMN catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  ADD COLUMN pending_suggestion_id UUID REFERENCES public.service_catalog_suggestions(id) ON DELETE SET NULL;
CREATE INDEX idx_business_services_catalog_id ON public.business_services(catalog_id) WHERE catalog_id IS NOT NULL;

-- 4) Seed catalog
INSERT INTO public.service_catalog (business_type_slug, key, title, description, default_unit, sort_order) VALUES
-- towing & roadside
('towing','tow_flatbed','Flatbed Tow','Standard flatbed tow within service area.','km',10),
('towing','tow_wheel_lift','Wheel-lift Tow','Quick wheel-lift tow for short distances.','km',20),
('towing','battery_jump_start','Battery Jump Start','On-site jump start service.','service',30),
('towing','fuel_delivery','Fuel Delivery','Roadside fuel delivery (price = service fee, fuel billed separately at pump price).','service',40),
('towing','flat_tire_change','Flat Tire Change','On-site spare tire installation.','service',50),
('towing','lockout_service','Lockout / Key Service','Vehicle lockout assistance.','service',60),
('towing','winching','Winching / Recovery','Stuck-vehicle winching and recovery.','service',70),
('towing','motorcycle_tow','Motorcycle Tow','Specialized motorcycle towing.','service',80),
-- repair_shop
('repair_shop','oil_change','Oil Change (gas)','Standard engine oil + filter change (gas).','service',10),
('repair_shop','oil_change_diesel','Oil Change (diesel)','Diesel engine oil + filter change.','service',20),
('repair_shop','brake_pad_replace','Brake Pad Replacement (per axle)','Front or rear brake pad replacement.','service',30),
('repair_shop','engine_tune_up','Engine Tune-up','Spark plugs, air filter, throttle clean.','service',40),
('repair_shop','aircon_service','Aircon Service','AC clean, freon top-up, leak check.','service',50),
('repair_shop','wheel_alignment','Wheel Alignment','4-wheel alignment service.','service',60),
('repair_shop','diagnostic_scan','Computer Diagnostic Scan','OBD-II scan and report.','service',70),
('repair_shop','timing_belt','Timing Belt Replacement','Timing belt + tensioner replacement.','service',80),
-- carwash
('carwash','basic_wash','Basic Wash','Exterior soap, rinse, dry.','service',10),
('carwash','wash_and_vacuum','Wash & Vacuum','Exterior wash + interior vacuum.','service',20),
('carwash','full_detail','Full Detail','Exterior + interior detailing.','service',30),
('carwash','engine_wash','Engine Wash','Engine bay degrease + rinse.','service',40),
('carwash','waxing','Hand Wax','Hand-applied carnauba wax.','service',50),
('carwash','ceramic_coating','Ceramic Coating','Pro ceramic coating application.','service',60),
-- tire_shop
('tire_shop','tire_mount_balance','Tire Mount & Balance (per tire)','Mount tire on rim + spin balance.','service',10),
('tire_shop','tire_rotation','Tire Rotation (4)','Rotate all 4 tires.','service',20),
('tire_shop','flat_repair','Flat Tire Repair','Plug or patch a single tire.','service',30),
('tire_shop','nitrogen_fill','Nitrogen Fill (per tire)','Nitrogen inflation.','service',40),
('tire_shop','wheel_alignment','Wheel Alignment','4-wheel alignment.','service',50),
-- battery_shop
('battery_shop','battery_test','Battery Test','Load test + charging system check.','service',10),
('battery_shop','battery_install','Battery Installation','Remove old + install new battery.','service',20),
('battery_shop','battery_jump_start','Battery Jump Start','On-site jump start.','service',30),
('battery_shop','battery_delivery','Battery Delivery','Deliver and install at location.','service',40),
-- fuel_station (subset - already covered by FUEL_STATION_CATALOG, keep keys aligned)
('fuel_station','gas_91','Regular 91 RON','Standard unleaded.','L',10),
('fuel_station','gas_95','Premium 95 RON','Mid-grade unleaded.','L',20),
('fuel_station','gas_97','Premium Plus 97 RON','High-octane.','L',30),
('fuel_station','diesel','Diesel','Standard diesel.','L',40),
('fuel_station','diesel_premium','Premium Diesel','Premium / additive diesel.','L',50),
('fuel_station','lpg_auto','Auto LPG','Auto-LPG refuel.','L',60),
('fuel_station','tire_inflate','Tire Inflation','Free or paid tire inflation.','service',70),
('fuel_station','carwash','Car Wash','On-site car wash.','service',80);

-- ===== END SOURCE MIGRATION: 20260616051838_15d109db-c2ae-477f-a7d4-6f1b8ad10740.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616052943_f30fe80d-b361-4bd7-9f15-ba34f9d58b35.sql =====

CREATE TABLE public.service_suggestion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.service_catalog_suggestions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','merged')),
  catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_suggestion_audit_log TO authenticated;
GRANT ALL ON public.service_suggestion_audit_log TO service_role;

ALTER TABLE public.service_suggestion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read service suggestion audit"
  ON public.service_suggestion_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ssal_suggestion ON public.service_suggestion_audit_log(suggestion_id, created_at DESC);
CREATE INDEX idx_ssal_actor ON public.service_suggestion_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_ssal_created ON public.service_suggestion_audit_log(created_at DESC);

-- ===== END SOURCE MIGRATION: 20260616052943_f30fe80d-b361-4bd7-9f15-ba34f9d58b35.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616053812_7785b594-fe6e-4d48-a742-c85ad046bb3e.sql =====
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_source_external_id_key;
-- ===== END SOURCE MIGRATION: 20260616053812_7785b594-fe6e-4d48-a742-c85ad046bb3e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616054838_f911f5dd-0431-4f0c-9a94-59bc9852eb4c.sql =====
DROP INDEX IF EXISTS public.businesses_source_external_id_key;
-- ===== END SOURCE MIGRATION: 20260616054838_f911f5dd-0431-4f0c-9a94-59bc9852eb4c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260616065656_7793cf87-1c3b-4fec-8151-38cd3ab67b18.sql =====

-- Lock down contact_value columns from broad role-level SELECT.
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon, authenticated, PUBLIC;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon, authenticated, PUBLIC;

-- Re-grant all other columns explicitly to authenticated/anon so existing queries continue to work.
-- (Default table-level SELECT grants remain for all other columns; we only revoked the single column.)

-- Provide a controlled accessor for owners / responders who legitimately need the contact value.
CREATE OR REPLACE FUNCTION public.get_wanted_post_contact(_post_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wp.contact_value
  FROM public.wanted_posts wp
  WHERE wp.id = _post_id
    AND wp.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_wanted_post_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_post_contact(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_wanted_response_contact(_response_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.contact_value
  FROM public.wanted_post_responses r
  LEFT JOIN public.wanted_posts wp ON wp.id = r.wanted_post_id
  WHERE r.id = _response_id
    AND (r.user_id = auth.uid() OR wp.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_wanted_response_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wanted_response_contact(uuid) TO authenticated;

-- ===== END SOURCE MIGRATION: 20260616065656_7793cf87-1c3b-4fec-8151-38cd3ab67b18.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260617031640_9b47f042-edcc-447e-836a-8c19fd712ae9.sql =====

-- Seed service catalog entries for business types that previously had none,
-- and round out a few existing types.
INSERT INTO public.service_catalog (business_type_slug, key, title, description, default_unit, sort_order, active) VALUES
-- Accessories / customization
('accessories','acc_dashcam_install','Dashcam Installation','Front or front+rear dashcam install with hardwire.','service',10,true),
('accessories','acc_alarm_install','Car Alarm / Immobilizer Install',NULL,'service',20,true),
('accessories','acc_led_upgrade','LED Headlight / Foglight Upgrade',NULL,'service',30,true),
('accessories','acc_remote_start','Remote Start Install',NULL,'service',40,true),
('accessories','acc_roof_rack','Roof Rack / Cargo Carrier Install',NULL,'service',50,true),
('accessories','acc_seat_cover','Custom Seat Cover Fitting',NULL,'set',60,true),
('accessories','acc_floor_mats','Custom Floor Mats',NULL,'set',70,true),
-- Audio & tint
('audio_tint','at_window_tint','Window Tinting (full vehicle)',NULL,'vehicle',10,true),
('audio_tint','at_windshield_tint','Windshield Tinting',NULL,'service',20,true),
('audio_tint','at_speaker_install','Speaker Replacement',NULL,'set',30,true),
('audio_tint','at_head_unit_install','Head Unit / Stereo Install',NULL,'service',40,true),
('audio_tint','at_amp_sub_install','Amp & Subwoofer Install',NULL,'service',50,true),
('audio_tint','at_sound_deadening','Sound Deadening',NULL,'vehicle',60,true),
-- Body & paint
('body_paint','bp_full_repaint','Full Vehicle Repaint',NULL,'vehicle',10,true),
('body_paint','bp_panel_repaint','Single Panel Repaint',NULL,'service',20,true),
('body_paint','bp_dent_repair','Dent Repair (PDR)',NULL,'service',30,true),
('body_paint','bp_bumper_repair','Bumper Repair',NULL,'service',40,true),
('body_paint','bp_scratch_buff','Scratch Removal / Buffing',NULL,'service',50,true),
('body_paint','bp_collision_estimate','Collision Repair Estimate',NULL,'service',60,true),
('body_paint','bp_insurance_claim','Insurance Claim Assistance',NULL,'service',70,true),
-- Corporate / fleet
('corporate','cf_fleet_lease','Fleet Lease (long-term)',NULL,'vehicle',10,true),
('corporate','cf_fleet_maintenance','Fleet Maintenance Contract',NULL,'vehicle',20,true),
('corporate','cf_driver_supply','Driver Supply',NULL,'day',30,true),
('corporate','cf_chauffeur','Chauffeur Service',NULL,'hr',40,true),
-- Dealerships (new cars)
('dealership','dl_new_car_sale','New Vehicle Sale',NULL,'vehicle',10,true),
('dealership','dl_test_drive','Test Drive Booking',NULL,'service',20,true),
('dealership','dl_trade_in','Trade-in Appraisal',NULL,'service',30,true),
('dealership','dl_financing','In-house Financing',NULL,'service',40,true),
('dealership','dl_warranty','Warranty Registration',NULL,'service',50,true),
('dealership','dl_pms','Preventive Maintenance Service (PMS)',NULL,'service',60,true),
-- Used car dealer
('used_dealership','ud_used_sale','Used Vehicle Sale',NULL,'vehicle',10,true),
('used_dealership','ud_buy_your_car','We Buy Your Car',NULL,'vehicle',20,true),
('used_dealership','ud_trade_in','Trade-in Appraisal',NULL,'service',30,true),
('used_dealership','ud_consign','Consignment',NULL,'service',40,true),
('used_dealership','ud_financing_assist','Financing Assistance',NULL,'service',50,true),
('used_dealership','ud_recon','Reconditioning / Detailing',NULL,'vehicle',60,true),
-- Driving school
('driving_school','ds_basic_course','Basic Driving Course (manual)',NULL,'session',10,true),
('driving_school','ds_basic_at','Basic Driving Course (automatic)',NULL,'session',20,true),
('driving_school','ds_refresher','Refresher Course',NULL,'session',30,true),
('driving_school','ds_tdc','Theoretical Driving Course (TDC)',NULL,'session',40,true),
('driving_school','ds_pdc','Practical Driving Course (PDC)',NULL,'session',50,true),
('driving_school','ds_motor_course','Motorcycle Riding Course',NULL,'session',60,true),
-- Financing / loans
('financing','fn_auto_loan','Auto Loan Application',NULL,'service',10,true),
('financing','fn_motor_loan','Motorcycle Loan',NULL,'service',20,true),
('financing','fn_refinance','Auto Refinancing',NULL,'service',30,true),
('financing','fn_truck_loan','Commercial / Truck Loan',NULL,'service',40,true),
('financing','fn_loan_calc','Loan Pre-qualification',NULL,'service',50,true),
-- Inspection / emissions
('inspection','ip_pms_inspection','PMS / Multi-point Inspection',NULL,'vehicle',10,true),
('inspection','ip_pre_purchase','Pre-purchase Inspection',NULL,'vehicle',20,true),
('inspection','ip_emission_test','Emission Testing',NULL,'vehicle',30,true),
('inspection','ip_pmvic','PMVIC Roadworthiness Inspection',NULL,'vehicle',40,true),
('inspection','ip_obd_scan','OBD-II Diagnostic Scan',NULL,'service',50,true),
-- Insurance
('insurance','ins_ctpl','CTPL (mandatory liability)',NULL,'service',10,true),
('insurance','ins_comprehensive','Comprehensive Insurance',NULL,'service',20,true),
('insurance','ins_acts_of_nature','Acts of Nature Coverage',NULL,'service',30,true),
('insurance','ins_renewal','Policy Renewal',NULL,'service',40,true),
('insurance','ins_claim_assist','Claims Assistance',NULL,'service',50,true),
('insurance','ins_quote','Insurance Quotation',NULL,'service',60,true),
-- LTO services
('lto_services','lto_registration','LTO Vehicle Registration',NULL,'vehicle',10,true),
('lto_services','lto_renewal','LTO Registration Renewal',NULL,'vehicle',20,true),
('lto_services','lto_transfer','Transfer of Ownership',NULL,'service',30,true),
('lto_services','lto_change_color','Change of Color / Body',NULL,'service',40,true),
('lto_services','lto_plates','Plates / Sticker Release',NULL,'service',50,true),
('lto_services','lto_drivers_license','Driver''s License Application / Renewal',NULL,'service',60,true),
-- Motorcycle shop
('motorcycle_shop','mc_oil_change','Motorcycle Oil Change',NULL,'service',10,true),
('motorcycle_shop','mc_tire_change','Motorcycle Tire Change',NULL,'service',20,true),
('motorcycle_shop','mc_brake_service','Brake Service',NULL,'service',30,true),
('motorcycle_shop','mc_chain_sprocket','Chain & Sprocket Replacement','set','set',40,true),
('motorcycle_shop','mc_tune_up','Tune-up',NULL,'service',50,true),
('motorcycle_shop','mc_battery','Battery Replacement',NULL,'service',60,true),
('motorcycle_shop','mc_carb_clean','Carburetor Cleaning',NULL,'service',70,true),
('motorcycle_shop','mc_clutch','Clutch Service',NULL,'service',80,true),
-- Parts supplier / shop
('parts_accessories','pa_oem_parts','OEM Parts',NULL,'item',10,true),
('parts_accessories','pa_aftermarket','Aftermarket Parts',NULL,'item',20,true),
('parts_accessories','pa_brake_pads','Brake Pads',NULL,'set',30,true),
('parts_accessories','pa_filters','Filters (oil / air / fuel)',NULL,'item',40,true),
('parts_accessories','pa_battery','Battery',NULL,'item',50,true),
('parts_accessories','pa_belts_hoses','Belts & Hoses',NULL,'item',60,true),
('parts_accessories','pa_lubricants','Engine Oil / Lubricants',NULL,'L',70,true),
('parts_accessories','pa_tires','Tires',NULL,'item',80,true),
('parts_accessories','pa_special_order','Special Order / Sourcing',NULL,'service',90,true),
-- Vehicle rental
('rental','rt_self_drive','Self-drive Rental',NULL,'day',10,true),
('rental','rt_with_driver','Rental With Driver',NULL,'day',20,true),
('rental','rt_airport_transfer','Airport Transfer',NULL,'trip',30,true),
('rental','rt_hourly','Hourly Rental',NULL,'hr',40,true),
('rental','rt_long_term','Long-term Rental (monthly)',NULL,'month',50,true),
('rental','rt_van_rental','Van Rental',NULL,'day',60,true),
('rental','rt_truck_rental','Truck / Pickup Rental',NULL,'day',70,true),
-- Salvage / pick-a-part
('salvage','sv_used_part','Used Part (per item)',NULL,'item',10,true),
('salvage','sv_engine_assembly','Used Engine Assembly',NULL,'item',20,true),
('salvage','sv_transmission','Used Transmission',NULL,'item',30,true),
('salvage','sv_body_panel','Used Body Panel',NULL,'item',40,true),
('salvage','sv_buy_junk','We Buy Junk / Wrecked Cars',NULL,'vehicle',50,true),
('salvage','sv_dismantling','Vehicle Dismantling',NULL,'vehicle',60,true),
-- Transport / logistics
('transport','tl_lipat_bahay','Lipat-bahay (house move)',NULL,'trip',10,true),
('transport','tl_furniture_delivery','Furniture / Appliance Delivery',NULL,'trip',20,true),
('transport','tl_cargo_van','Cargo Van Hire',NULL,'trip',30,true),
('transport','tl_truck_hire','Truck Hire (6-wheeler+)',NULL,'trip',40,true),
('transport','tl_courier','Courier / Parcel Delivery',NULL,'delivery',50,true),
('transport','tl_intercity','Inter-city Freight',NULL,'trip',60,true),
('transport','tl_warehouse','Warehousing',NULL,'month',70,true),
-- "Other" — generic fallback
('other','oth_consultation','Consultation',NULL,'hr',10,true),
('other','oth_service_call','Service Call',NULL,'visit',20,true),
('other','oth_estimate','Estimate / Quotation',NULL,'service',30,true),
-- Round out existing types
('repair_shop','rs_battery_replace','Battery Replacement',NULL,'service',90,true),
('repair_shop','rs_clutch_service','Clutch Service',NULL,'service',100,true),
('repair_shop','rs_suspension','Suspension Repair',NULL,'service',110,true),
('repair_shop','rs_radiator_flush','Radiator Flush',NULL,'service',120,true),
('repair_shop','rs_transmission_service','Transmission Service',NULL,'service',130,true),
('repair_shop','rs_electrical','Electrical Diagnosis & Repair',NULL,'hr',140,true),
('tire_shop','ts_new_tire','New Tire (per tire)',NULL,'item',60,true),
('tire_shop','ts_used_tire','Used Tire (per tire)',NULL,'item',70,true),
('tire_shop','ts_tire_repair_patch','Tire Repair (patch / plug)',NULL,'service',80,true),
('tire_shop','ts_road_hazard','Road Hazard Warranty',NULL,'item',90,true),
('battery_shop','bs_new_battery','New Battery (with old trade-in)',NULL,'item',50,true),
('battery_shop','bs_alternator_test','Alternator / Charging System Test',NULL,'service',60,true),
('battery_shop','bs_battery_recharge','Battery Recharging',NULL,'service',70,true),
('carwash','cw_interior_detail','Interior Detail / Shampoo',NULL,'service',70,true),
('carwash','cw_paint_correction','Paint Correction',NULL,'service',80,true),
('carwash','cw_headlight_restore','Headlight Restoration',NULL,'service',90,true),
('fuel_station','fs_kerosene','Kerosene',NULL,'L',90,true),
('fuel_station','fs_lubricants','Engine Oil / Lubricants',NULL,'L',100,true),
('fuel_station','fs_air_water','Air & Water','Free or paid','service',110,true),
('fuel_station','fs_atm','ATM',NULL,'service',120,true),
('fuel_station','fs_convenience','Convenience Store',NULL,'service',130,true)
ON CONFLICT (business_type_slug, key) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260617031640_9b47f042-edcc-447e-836a-8c19fd712ae9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260617043532_9769227e-2fd2-4920-83f6-88222ae485cf.sql =====

ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS max_price_php numeric,
  ADD COLUMN IF NOT EXISTS region_scope text,
  ADD COLUMN IF NOT EXISTS service_radius_km int,
  ADD COLUMN IF NOT EXISTS eta_minutes int,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_24_7 boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_business_service_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.region_scope IS NOT NULL AND NEW.region_scope NOT IN
    ('on_site','barangay','city','province','region','nationwide') THEN
    RAISE EXCEPTION 'invalid region_scope: %', NEW.region_scope;
  END IF;
  IF NEW.max_price_php IS NOT NULL AND NEW.price_php IS NOT NULL
     AND NEW.max_price_php < NEW.price_php THEN
    RAISE EXCEPTION 'max_price_php must be >= price_php';
  END IF;
  IF NEW.service_radius_km IS NOT NULL AND NEW.service_radius_km < 0 THEN
    RAISE EXCEPTION 'service_radius_km must be >= 0';
  END IF;
  IF NEW.eta_minutes IS NOT NULL AND NEW.eta_minutes < 0 THEN
    RAISE EXCEPTION 'eta_minutes must be >= 0';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_business_service_row ON public.business_services;
CREATE TRIGGER trg_validate_business_service_row
  BEFORE INSERT OR UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_service_row();

CREATE INDEX IF NOT EXISTS idx_bs_active_price ON public.business_services (active, price_php);
CREATE INDEX IF NOT EXISTS idx_bs_catalog_active ON public.business_services (catalog_id, active);
CREATE INDEX IF NOT EXISTS idx_bs_tags_gin ON public.business_services USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_bs_region_scope ON public.business_services (region_scope) WHERE region_scope IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bs_eta ON public.business_services (eta_minutes) WHERE eta_minutes IS NOT NULL;

-- ===== END SOURCE MIGRATION: 20260617043532_9769227e-2fd2-4920-83f6-88222ae485cf.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260617064310_c8bfaceb-3ed9-4fd0-b668-0ecd1f17a548.sql =====

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

CREATE TABLE IF NOT EXISTS public.business_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

GRANT SELECT ON public.business_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_brands TO authenticated;
GRANT ALL ON public.business_brands TO service_role;

ALTER TABLE public.business_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business brands"
  ON public.business_brands FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert brands"
  ON public.business_brands FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update brands"
  ON public.business_brands FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete brands"
  ON public.business_brands FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_business_brands_business_sort
  ON public.business_brands (business_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_business_brands_slug
  ON public.business_brands (slug);

-- ===== END SOURCE MIGRATION: 20260617064310_c8bfaceb-3ed9-4fd0-b668-0ecd1f17a548.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260617092418_a50d4b21-3863-4d9a-b7ce-20866f5b7ca1.sql =====
-- Add assigned staff member to bookings
ALTER TABLE public.business_bookings
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_business_assigned
  ON public.business_bookings(business_id, assigned_user_id);

-- Allow the assigned staff member to view bookings assigned to them
DROP POLICY IF EXISTS "Assigned staff view bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff view bookings" ON public.business_bookings
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());

-- Allow the assigned staff member to update status on their bookings
DROP POLICY IF EXISTS "Assigned staff update bookings" ON public.business_bookings;
CREATE POLICY "Assigned staff update bookings" ON public.business_bookings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND assigned_user_id = auth.uid());
-- ===== END SOURCE MIGRATION: 20260617092418_a50d4b21-3863-4d9a-b7ce-20866f5b7ca1.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260618143033_d72ee2aa-d994-47fd-941d-2407c084e60e.sql =====

CREATE TABLE public.advertisement_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('advertisement','ad_inquiry','promotion')),
  source_id uuid,
  action text NOT NULL CHECK (action IN ('created','updated','deleted')),
  snapshot jsonb NOT NULL,
  previous jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX advertisement_history_source_idx ON public.advertisement_history (source, changed_at DESC);
CREATE INDEX advertisement_history_source_id_idx ON public.advertisement_history (source_id);
CREATE INDEX advertisement_history_changed_at_idx ON public.advertisement_history (changed_at DESC);

GRANT SELECT ON public.advertisement_history TO authenticated;
GRANT ALL ON public.advertisement_history TO service_role;

ALTER TABLE public.advertisement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read advertisement history"
  ON public.advertisement_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policies: writes happen via SECURITY DEFINER trigger; table is effectively append-only from app code.

CREATE OR REPLACE FUNCTION public.log_advertisement_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source text;
  v_action text;
  v_id uuid;
  v_actor uuid;
BEGIN
  IF TG_TABLE_NAME = 'advertisements' THEN v_source := 'advertisement';
  ELSIF TG_TABLE_NAME = 'ad_inquiries' THEN v_source := 'ad_inquiry';
  ELSIF TG_TABLE_NAME = 'promotions' THEN v_source := 'promotion';
  ELSE v_source := TG_TABLE_NAME;
  END IF;

  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), NULL, v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), to_jsonb(OLD), v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_id := (to_jsonb(OLD) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(OLD), NULL, v_actor);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER advertisements_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER ad_inquiries_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER promotions_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

-- ===== END SOURCE MIGRATION: 20260618143033_d72ee2aa-d994-47fd-941d-2407c084e60e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260618143923_eb7a3021-7236-4dc9-8cbb-cf030cc4c9af.sql =====

CREATE TABLE public.share_kit_custom_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  image_url text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  qr_cx numeric NOT NULL DEFAULT 0.85,
  qr_cy numeric NOT NULL DEFAULT 0.85,
  qr_size numeric NOT NULL DEFAULT 0.18,
  share_text text NOT NULL DEFAULT 'Scan or tap to shop with my 365 Motor Sales link: {link}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_custom_templates TO authenticated;
GRANT ALL ON public.share_kit_custom_templates TO service_role;

ALTER TABLE public.share_kit_custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read active templates"
  ON public.share_kit_custom_templates FOR SELECT
  TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates"
  ON public.share_kit_custom_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_share_kit_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER share_kit_custom_templates_touch
BEFORE UPDATE ON public.share_kit_custom_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_share_kit_templates();

CREATE TABLE public.share_kit_hidden_builtins (
  template_id text NOT NULL PRIMARY KEY,
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_hidden_builtins TO authenticated;
GRANT ALL ON public.share_kit_hidden_builtins TO service_role;

ALTER TABLE public.share_kit_hidden_builtins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read hidden builtins"
  ON public.share_kit_hidden_builtins FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage hidden builtins"
  ON public.share_kit_hidden_builtins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== END SOURCE MIGRATION: 20260618143923_eb7a3021-7236-4dc9-8cbb-cf030cc4c9af.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260618144012_6a199a95-2beb-4279-950d-af8fb30472a7.sql =====

CREATE POLICY "Auth read share-kit-templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'share-kit-templates');

CREATE POLICY "Admins insert share-kit-templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update share-kit-templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete share-kit-templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

-- ===== END SOURCE MIGRATION: 20260618144012_6a199a95-2beb-4279-950d-af8fb30472a7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260618193735_da239fa8-bd86-4306-bbcf-ce8f3ca641e8.sql =====

CREATE OR REPLACE FUNCTION public.get_referrer_contact(_code text)
RETURNS TABLE(full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.full_name, sr.email
  FROM public.staff_referrals sr
  WHERE sr.referral_code = _code
    AND sr.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_contact(text) TO anon, authenticated;

-- ===== END SOURCE MIGRATION: 20260618193735_da239fa8-bd86-4306-bbcf-ce8f3ca641e8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619131835_99305083-0d8e-4bb8-b95a-3918e1a14f19.sql =====

ALTER TABLE public.share_kit_custom_templates
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE TABLE IF NOT EXISTS public.share_kit_builtin_categories (
  template_id text PRIMARY KEY,
  category text,
  subcategory text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_builtin_categories TO authenticated;
GRANT ALL ON public.share_kit_builtin_categories TO service_role;

ALTER TABLE public.share_kit_builtin_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Authenticated can read builtin categories"
  ON public.share_kit_builtin_categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Admins manage builtin categories"
  ON public.share_kit_builtin_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== END SOURCE MIGRATION: 20260619131835_99305083-0d8e-4bb8-b95a-3918e1a14f19.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619134200_f7db1956-9a8e-4e69-871c-e6d9caaadcf3.sql =====

ALTER TABLE IF EXISTS public.share_kit_custom_templates RENAME TO qr_ad_templates;
ALTER TABLE IF EXISTS public.share_kit_builtin_categories RENAME TO qr_ad_builtin_categories;
ALTER TABLE IF EXISTS public.share_kit_hidden_builtins RENAME TO qr_ad_hidden_builtins;
ALTER TABLE IF EXISTS public.share_kit_layouts RENAME TO qr_ad_layouts;

-- Remap top-level categories on both tables
UPDATE public.qr_ad_templates SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET category = CASE category
  WHEN 'service-repair' THEN 'repair-service'
  WHEN 'sales-service' THEN 'sales-marketplace'
  WHEN 'insurance-finance' THEN 'insurance-finance'
  WHEN 'advertising-365' THEN 'brand-format'
  WHEN 'other' THEN 'other'
  ELSE category
END WHERE category IS NOT NULL;

-- Remap subcategories
UPDATE public.qr_ad_templates SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;

UPDATE public.qr_ad_builtin_categories SET subcategory = CASE subcategory
  WHEN 'tow-roadside' THEN 'tow-247'
  WHEN 'vehicles-for-sale' THEN 'cars-for-sale'
  WHEN 'detailing-carwash' THEN 'detailing-carwash'
  WHEN 'upholstery-interior' THEN 'upholstery-interior'
  WHEN 'inspection-testing' THEN 'inspection-testing'
  WHEN 'tire-wheel' THEN 'tire-wheel'
  WHEN 'mechanic' THEN 'mechanic'
  WHEN 'parts-accessories' THEN 'parts-accessories'
  WHEN 'fuel-lubricants' THEN 'fuel-lubricants'
  WHEN 'insurance' THEN 'insurance'
  WHEN 'financing' THEN 'financing'
  WHEN 'social-posts' THEN 'social-posts'
  WHEN 'stories-reels' THEN 'stories-reels'
  WHEN 'print-wearables' THEN 'print-wearables'
  WHEN 'other' THEN 'other'
  ELSE subcategory
END WHERE subcategory IS NOT NULL;

-- ===== END SOURCE MIGRATION: 20260619134200_f7db1956-9a8e-4e69-871c-e6d9caaadcf3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619140054_e2a2e838-4507-4c8e-b21c-b2b690bb385b.sql =====

-- Bulk-categorize the 57 QR ad templates based on their label keywords.
-- Anything that doesn't match falls back to (other, other).

UPDATE public.qr_ad_templates SET category = sub.category, subcategory = sub.subcategory
FROM (
  SELECT id,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'repair-service'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'repair-service'
      WHEN label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'repair-service'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'repair-service'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'repair-service'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'repair-service'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'repair-service'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'repair-service'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'repair-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'repair-service'
      WHEN label ILIKE '%tow%' THEN 'towing-roadside'
      WHEN label ILIKE '%rental%' OR label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'sales-marketplace'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'sales-marketplace'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'sales-marketplace'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'sales-marketplace'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'sales-marketplace'
      WHEN label ILIKE '%insurance%' THEN 'insurance-finance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'insurance-finance'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'insurance-finance'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' OR label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'training-certification'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'brand-format'
      ELSE 'other'
    END AS category,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'inspection-testing'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'ac-electrical'
      WHEN label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'body-paint'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'detailing-carwash'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'upholstery-interior'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'tire-wheel'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'glass-windshield'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'diesel-heavy-duty'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'motorcycle-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'mechanic'
      WHEN label ILIKE '%tow%' THEN 'tow-247'
      WHEN label ILIKE '%rental%' THEN 'cars-for-sale'
      WHEN label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'cars-for-sale'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'heavy-equipment'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'boats-marine'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'motorcycles-for-sale'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'parts-accessories'
      WHEN label ILIKE '%insurance%' THEN 'insurance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'financing'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'warranty-protection'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' THEN 'courses'
      WHEN label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'workshops-events'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'social-posts'
      ELSE 'other'
    END AS subcategory
  FROM public.qr_ad_templates
  WHERE category IS NULL OR subcategory IS NULL
) AS sub
WHERE public.qr_ad_templates.id = sub.id;

-- ===== END SOURCE MIGRATION: 20260619140054_e2a2e838-4507-4c8e-b21c-b2b690bb385b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619170000_24d6c3e0-b8bc-4039-b714-7c9b7de1380f.sql =====
ALTER TYPE public.business_status ADD VALUE IF NOT EXISTS 'archived';
-- ===== END SOURCE MIGRATION: 20260619170000_24d6c3e0-b8bc-4039-b714-7c9b7de1380f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50.sql =====
-- 1. role_permissions table
CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role, permission_key)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role permissions"
  ON public.role_permissions FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- 2. has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp
        ON rp.role = ur.role AND rp.permission_key = _key
      WHERE ur.user_id = _user_id AND rp.enabled = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon, service_role;

-- 3. Seed nav permissions from current ADMIN_NAV roles (per non-admin role)
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- sales
  ('sales','nav.overview',true),
  ('sales','nav.sales',true),
  ('sales','nav.accounts',true),
  ('sales','nav.analytics',true),
  ('sales','nav.advertisements',true),
  ('sales','nav.shop',true),
  ('sales','nav.referrals',true),
  ('sales','nav.qr-ads',true),
  ('sales','nav.reports',true),
  -- moderator
  ('moderator','nav.overview',true),
  ('moderator','nav.businesses',true),
  ('moderator','nav.discover-businesses',true),
  ('moderator','nav.claims',true),
  ('moderator','nav.verifications',true),
  ('moderator','nav.listings',true),
  ('moderator','nav.reports',true),
  ('moderator','nav.location-corrections',true),
  ('moderator','nav.education',true),
  ('moderator','nav.qr-ads',true),
  -- support
  ('support','nav.overview',true),
  ('support','nav.sales',true),
  ('support','nav.accounts',true),
  ('support','nav.analytics',true),
  ('support','nav.listings',true),
  ('support','nav.reports',true),
  ('support','nav.dispatch',true),
  ('support','nav.qr-ads',true),
  -- advertising
  ('advertising','nav.overview',true),
  ('advertising','nav.sales',true),
  ('advertising','nav.advertisements',true),
  ('advertising','nav.shop',true),
  ('advertising','nav.qr-ads',true)
ON CONFLICT DO NOTHING;

-- 4. Widen admin_audit_log
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.admin_audit_log ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log ALTER COLUMN field DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_log (entity_type, entity_id, created_at DESC);

-- ===== END SOURCE MIGRATION: 20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619180927_a58c4f00-1cfa-4714-b52d-272bade66b23.sql =====

-- 1) business_type_suggestions: exclude sales from reading submitter PII
DROP POLICY IF EXISTS "Support read type suggestions" ON public.business_type_suggestions;
CREATE POLICY "Support read type suggestions"
ON public.business_type_suggestions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

-- 2) staff_referrals: remove broad sales read of PII; admins + own-row read remain
DROP POLICY IF EXISTS "Sales read staff_referrals" ON public.staff_referrals;

-- ===== END SOURCE MIGRATION: 20260619180927_a58c4f00-1cfa-4714-b52d-272bade66b23.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619183617_2046c7a7-22a3-4202-8ed4-7b17a9e24871.sql =====

ALTER TABLE public.business_claim_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'claim';

DO $$ BEGIN
  ALTER TABLE public.business_claim_requests
    ADD CONSTRAINT business_claim_requests_kind_check CHECK (kind IN ('claim','transfer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bcr_kind_status
  ON public.business_claim_requests (kind, status);

DROP POLICY IF EXISTS "Users submit own claim" ON public.business_claim_requests;

CREATE POLICY "Users submit own claim" ON public.business_claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_claim_requests.business_id
        AND (
          (business_claim_requests.kind = 'claim'
            AND b.claim_state IN ('unclaimed','claim_pending')
            AND b.owner_id IS NULL)
          OR
          (business_claim_requests.kind = 'transfer'
            AND b.owner_id IS NOT NULL
            AND b.owner_id <> auth.uid())
        )
    )
  );

-- ===== END SOURCE MIGRATION: 20260619183617_2046c7a7-22a3-4202-8ed4-7b17a9e24871.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619183732_375472c8-9c6b-4392-85c3-021a02d51140.sql =====

CREATE OR REPLACE FUNCTION public.approve_business_claim(_claim_id uuid, _auto boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_bid uuid; v_uid uuid; v_kind text; v_prev uuid;
BEGIN
  SELECT business_id, claimant_user_id, kind INTO v_bid, v_uid, v_kind
    FROM public.business_claim_requests WHERE id = _claim_id;
  IF v_bid IS NULL THEN RAISE EXCEPTION 'Claim not found'; END IF;

  SELECT owner_id INTO v_prev FROM public.businesses WHERE id = v_bid;

  IF v_kind = 'transfer' THEN
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid;
  ELSE
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid AND owner_id IS NULL;
  END IF;

  UPDATE public.business_claim_requests
     SET status = CASE WHEN _auto THEN 'auto_approved' ELSE 'approved' END,
         decided_at = now()
   WHERE id = _claim_id;

  -- Record transfer in audit log
  IF v_kind = 'transfer' THEN
    INSERT INTO public.business_claim_audit (claim_id, actor_user_id, action, notes, details)
    VALUES (_claim_id, NULL, 'approved', 'Ownership transfer approved',
            jsonb_build_object('previous_owner_id', v_prev, 'new_owner_id', v_uid));
  END IF;

  -- Reject sibling pending claims for the same business
  UPDATE public.business_claim_requests
     SET status = 'rejected',
         reviewer_notes = COALESCE(reviewer_notes,'') || E'\nAuto-rejected: another claim approved.',
         decided_at = now()
   WHERE business_id = v_bid AND id <> _claim_id AND status = 'pending';
END $function$;

-- ===== END SOURCE MIGRATION: 20260619183732_375472c8-9c6b-4392-85c3-021a02d51140.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260619191109_b6c5a81a-a8ea-4168-b767-e1e21a1b67c9.sql =====

-- 1. Helper: assignment check for sales reps (scoped to users)
CREATE OR REPLACE FUNCTION public.is_sales_assigned_user(_rep uuid, _target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'user'
      AND subject_id = _target_user
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sales_assigned_user(uuid, uuid) TO authenticated;

-- 2. profiles: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view all profiles" ON public.profiles;
CREATE POLICY "Sales view assigned profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), id)
  );

-- 3. payments: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view payments" ON public.payments;
CREATE POLICY "Sales view assigned payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 4. subscriptions: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view subscriptions" ON public.subscriptions;
CREATE POLICY "Sales view assigned subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 5. ad_inquiries: remove email-based identity, keep submitter_user_id only
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.ad_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.ad_inquiries FOR SELECT
  TO authenticated
  USING (submitter_user_id IS NOT NULL AND submitter_user_id = auth.uid());

-- 6. ad_inquiry_messages
DROP POLICY IF EXISTS "Submitter reads own thread" ON public.ad_inquiry_messages;
CREATE POLICY "Submitter reads own thread"
  ON public.ad_inquiry_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_messages.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 7. ad_inquiry_audit
DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
  ON public.ad_inquiry_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_audit.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 8. service_inquiries
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.service_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.service_inquiries FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 9. organization_invites: helper that checks current user's email from auth.users
-- and guards against recycled emails by requiring the invite to be newer than the
-- current user's account creation.
CREATE OR REPLACE FUNCTION public.can_read_org_invite(_invite_email text, _invite_created_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = lower(_invite_email)
      AND u.email_confirmed_at IS NOT NULL
      AND _invite_created_at >= u.created_at
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_org_invite(text, timestamptz) TO authenticated;

DROP POLICY IF EXISTS "Invitee reads own invite" ON public.organization_invites;
CREATE POLICY "Invitee reads own invite"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (public.can_read_org_invite(email, created_at));

-- 10. is_365_staff: remove email-domain shortcut, rely on user_roles only
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','moderator')
  );
$$;

-- ===== END SOURCE MIGRATION: 20260619191109_b6c5a81a-a8ea-4168-b767-e1e21a1b67c9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260620053106_0be4b0c6-faf9-47f0-ba36-efa6ca189515.sql =====

CREATE TABLE public.qr_lead_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  contact text NOT NULL CHECK (char_length(contact) BETWEEN 3 AND 200),
  interest_type text NOT NULL CHECK (interest_type IN ('buying_vehicle','selling_vehicle','business_listing','parts','services','other')),
  interest_detail text CHECK (interest_detail IS NULL OR char_length(interest_detail) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed','archived')),
  notes text,
  visitor_id text,
  user_agent text,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_lead_captures_created_at ON public.qr_lead_captures (created_at DESC);
CREATE INDEX idx_qr_lead_captures_status ON public.qr_lead_captures (status);
CREATE INDEX idx_qr_lead_captures_referral_code ON public.qr_lead_captures (referral_code);

GRANT INSERT ON public.qr_lead_captures TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.qr_lead_captures TO authenticated;
GRANT ALL ON public.qr_lead_captures TO service_role;

ALTER TABLE public.qr_lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a QR lead"
  ON public.qr_lead_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view QR leads"
  ON public.qr_lead_captures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update QR leads"
  ON public.qr_lead_captures
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete QR leads"
  ON public.qr_lead_captures
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qr_lead_captures_updated_at
  BEFORE UPDATE ON public.qr_lead_captures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== END SOURCE MIGRATION: 20260620053106_0be4b0c6-faf9-47f0-ba36-efa6ca189515.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260620173020_b2bd6551-8f88-4050-bf57-10a0e7be4da2.sql =====

-- =========================================================================
-- ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.ad_order_status AS ENUM (
    'pending_payment','paid','submitted','in_review',
    'approved','rejected','live','expired','refunded','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_kind AS ENUM ('advertiser','placeholder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_creative_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_order_event_type AS ENUM (
    'submitted','payment_verified','package_verified','image_verified',
    'approved','rejected','paused','resumed','expired','refunded','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- Shared updated_at trigger fn (idempotent)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- 1. AD PACKAGES
-- =========================================================================
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  placement public.ad_placement NOT NULL,
  duration_days int NOT NULL CHECK (duration_days > 0),
  price_cents int NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'PHP',
  max_impressions int,
  priority_weight int NOT NULL DEFAULT 0,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 400,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active packages"
  ON public.ad_packages FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage packages"
  ON public.ad_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_packages_updated BEFORE UPDATE ON public.ad_packages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. AD ORDERS
-- =========================================================================
CREATE TABLE public.ad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE RESTRICT,
  placement public.ad_placement NOT NULL,
  category_slug text,
  status public.ad_order_status NOT NULL DEFAULT 'pending_payment',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  requested_start timestamptz,
  requested_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_orders_advertiser ON public.ad_orders(advertiser_id);
CREATE INDEX idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX idx_ad_orders_placement ON public.ad_orders(placement);

GRANT SELECT, INSERT, UPDATE ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own orders"
  ON public.ad_orders FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Advertisers create own orders"
  ON public.ad_orders FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Advertisers update own draft orders"
  ON public.ad_orders FOR UPDATE TO authenticated
  USING (advertiser_id = auth.uid() AND status IN ('pending_payment','paid','submitted'))
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Admins manage orders"
  ON public.ad_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_orders_updated BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. AD CREATIVES (advertiser uploads + admin placeholders)
-- =========================================================================
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.ad_creative_kind NOT NULL DEFAULT 'advertiser',
  storage_path text NOT NULL,
  image_url text NOT NULL,
  image_width int,
  image_height int,
  file_size_bytes int,
  mime_type text,
  headline text,
  caption text,
  alt_text text,
  target_url text,
  spec_ok boolean NOT NULL DEFAULT false,
  spec_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.ad_creative_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'placeholder' OR order_id IS NOT NULL)
);
CREATE INDEX idx_ad_creatives_order ON public.ad_creatives(order_id);
CREATE INDEX idx_ad_creatives_kind ON public.ad_creatives(kind);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO authenticated;
GRANT ALL ON public.ad_creatives TO service_role;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own creatives; staff read all"
  ON public.ad_creatives FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners insert own creatives"
  ON public.ad_creatives FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners update own pending creatives"
  ON public.ad_creatives FOR UPDATE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (uploaded_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Owners delete own pending creatives"
  ON public.ad_creatives FOR DELETE TO authenticated
  USING ((uploaded_by = auth.uid() AND status = 'pending')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_creatives_updated BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 4. AD SLOTS (visible positions on the site)
-- =========================================================================
CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  placement public.ad_placement NOT NULL,
  category_slug text,
  label text NOT NULL,
  description text,
  min_width int NOT NULL DEFAULT 800,
  min_height int NOT NULL DEFAULT 200,
  aspect_ratio text,
  max_bytes int NOT NULL DEFAULT 5242880,
  allowed_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slots_placement ON public.ad_slots(placement);

GRANT SELECT ON public.ad_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slots TO authenticated;
GRANT ALL ON public.ad_slots TO service_role;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active slots"
  ON public.ad_slots FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage slots"
  ON public.ad_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slots_updated BEFORE UPDATE ON public.ad_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 5. AD SLOT ASSIGNMENTS
-- =========================================================================
CREATE TABLE public.ad_slot_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.ad_slots(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_slot_assign_slot ON public.ad_slot_assignments(slot_id);
CREATE INDEX idx_ad_slot_assign_creative ON public.ad_slot_assignments(creative_id);
CREATE INDEX idx_ad_slot_assign_active ON public.ad_slot_assignments(slot_id, position) WHERE active;

GRANT SELECT ON public.ad_slot_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slot_assignments TO authenticated;
GRANT ALL ON public.ad_slot_assignments TO service_role;
ALTER TABLE public.ad_slot_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active assignments"
  ON public.ad_slot_assignments FOR SELECT TO anon, authenticated
  USING (active = true
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'advertising'));

CREATE POLICY "Admins manage assignments"
  ON public.ad_slot_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advertising'));

CREATE TRIGGER trg_ad_slot_assignments_updated BEFORE UPDATE ON public.ad_slot_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 6. AD ORDER EVENTS (audit)
-- =========================================================================
CREATE TABLE public.ad_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ad_orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.ad_order_event_type NOT NULL,
  notes text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_order_events_order ON public.ad_order_events(order_id);

GRANT SELECT, INSERT ON public.ad_order_events TO authenticated;
GRANT ALL ON public.ad_order_events TO service_role;
ALTER TABLE public.ad_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner+staff read order events"
  ON public.ad_order_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
  );

CREATE POLICY "Staff write order events"
  ON public.ad_order_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'advertising')
    OR EXISTS (SELECT 1 FROM public.ad_orders o WHERE o.id = order_id AND o.advertiser_id = auth.uid())
  );

-- =========================================================================
-- 7. STORAGE policies for `advertisements` bucket
-- Path convention: {advertiser_id}/{order_id}/{filename}
-- =========================================================================
CREATE POLICY "Advertisers upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers read own folder; staff read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers update/delete own folder; staff all"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

CREATE POLICY "Advertisers delete own folder; staff all"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'advertisements'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'advertising'))
  );

-- =========================================================================
-- 8. SEED SLOTS that match today's placement-preview.tsx layout
-- =========================================================================
INSERT INTO public.ad_slots (slot_key, placement, category_slug, label, description, min_width, min_height, aspect_ratio, position) VALUES
  ('marketplace_home_hero_1','home_carousel',NULL,'Marketplace Home — Hero 1','Top of marketplace homepage, slot 1 of 3.',1600,600,'8:3',0),
  ('marketplace_home_hero_2','home_carousel',NULL,'Marketplace Home — Hero 2','Top of marketplace homepage, slot 2 of 3.',1600,600,'8:3',1),
  ('marketplace_home_hero_3','home_carousel',NULL,'Marketplace Home — Hero 3','Top of marketplace homepage, slot 3 of 3.',1600,600,'8:3',2),
  ('marketplace_category_banner','category_banner',NULL,'Category Page — Wide Banner','Top of any category page (Cars, Motorcycles, Parts, etc).',1920,384,'5:1',0),
  ('browse_top_banner','browse_top',NULL,'Browse Results — Top Banner','Top of browse/search results page.',1600,300,'16:3',0),
  ('rides_top_banner','rides_top',NULL,'Rides Feed — Top Banner','Top of rides feed.',1200,300,'4:1',0),
  ('export_top_banner','export_top',NULL,'Export — Top Banner','Top of export brokerage section.',1600,400,'4:1',0),
  ('listing_sidebar_1','listing_sidebar',NULL,'Listing — Sidebar 1','Sidebar of listing detail page.',400,500,'4:5',0),
  ('shop_top_banner','shop_top',NULL,'Shop — Top Banner','Top of shop section.',1200,300,'4:1',0),
  ('shop_sidebar_1','shop_sidebar',NULL,'Shop — Sidebar 1','Shop sidebar slot 1.',400,400,'1:1',0),
  ('shop_sidebar_2','shop_sidebar',NULL,'Shop — Sidebar 2','Shop sidebar slot 2.',400,400,'1:1',1),
  ('newsletter_main','newsletter',NULL,'Newsletter — Main Slot','Featured slot in the weekly newsletter.',1200,400,'3:1',0)
ON CONFLICT (slot_key) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260620173020_b2bd6551-8f88-4050-bf57-10a0e7be4da2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260620174155_8a20bc24-209e-4a9f-bdb5-c15947568c88.sql =====

-- Allow advertising staff and admins to upload, update, and delete files anywhere in the advertisements bucket
-- (existing policy only lets advertisers manage files under their own {user_id}/ folder)
CREATE POLICY "Ad staff manage all advertisements files INSERT"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files UPDATE"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files DELETE"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff read all advertisements files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

-- ===== END SOURCE MIGRATION: 20260620174155_8a20bc24-209e-4a9f-bdb5-c15947568c88.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260620175446_5053a902-248b-4600-bef6-8a9c84c28cd8.sql =====

-- 1. Audit log for every approve/reject (and future revoke/resubmit) action on ad creatives
CREATE TABLE public.ad_creative_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ad_orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved','rejected','revoked','resubmitted')),
  previous_status public.ad_creative_status,
  new_status public.ad_creative_status,
  reason text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_creative_audit_creative ON public.ad_creative_audit_log(creative_id, created_at DESC);
CREATE INDEX idx_ad_creative_audit_actor ON public.ad_creative_audit_log(actor_id, created_at DESC);

GRANT SELECT, INSERT ON public.ad_creative_audit_log TO authenticated;
GRANT ALL ON public.ad_creative_audit_log TO service_role;

ALTER TABLE public.ad_creative_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and ads role can read audit log"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );

CREATE POLICY "Uploaders can read audit for their own creatives"
  ON public.ad_creative_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_creatives c
      WHERE c.id = ad_creative_audit_log.creative_id
        AND c.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Admins and ads role can insert audit"
  ON public.ad_creative_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advertising'::app_role)
  );


-- 2. Generic per-user in-app notifications inbox
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_notifications_user ON public.user_notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_user_notifications_entity ON public.user_notifications(entity_type, entity_id);

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner may only flip read_at; block mutating other columns from the client.
CREATE OR REPLACE FUNCTION public.user_notifications_lock_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.link_url IS DISTINCT FROM OLD.link_url
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at may be updated by users';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_notifications_lock_columns
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  WHEN (current_setting('role', true) <> 'service_role')
  EXECUTE FUNCTION public.user_notifications_lock_columns();

CREATE POLICY "Users can update their own notifications read state"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===== END SOURCE MIGRATION: 20260620175446_5053a902-248b-4600-bef6-8a9c84c28cd8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260621050736_a2046304-e3c7-4094-8d9c-f4974e0c65b9.sql =====
CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','moderator','support')
  )
$function$;

DROP POLICY IF EXISTS "Sales view audit log" ON public.account_audit_log;
CREATE POLICY "Sales view assigned audit log"
ON public.account_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND target_user_id IS NOT NULL
  AND public.is_sales_assigned_user(auth.uid(), target_user_id)
);

DROP POLICY IF EXISTS "Sales view line items" ON public.payment_line_items;
CREATE POLICY "Sales view assigned line items"
ON public.payment_line_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND p.user_id IS NOT NULL
      AND public.is_sales_assigned_user(auth.uid(), p.user_id)
  )
);
-- ===== END SOURCE MIGRATION: 20260621050736_a2046304-e3c7-4094-8d9c-f4974e0c65b9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260621083913_8e4914ee-cb1a-4741-b9f1-4973de81061e.sql =====
GRANT SELECT ON public.payment_method_config TO anon, authenticated;
GRANT ALL ON public.payment_method_config TO service_role;
-- ===== END SOURCE MIGRATION: 20260621083913_8e4914ee-cb1a-4741-b9f1-4973de81061e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260622025943_8776ca6a-ff43-4a58-b1cd-d40e0cfe9b25.sql =====

-- =============== flashcard_content ===============
CREATE TABLE public.flashcard_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 0,
  source_repo TEXT NOT NULL DEFAULT 'Hunting-Fishing/365_flashcards',
  source_ref TEXT NOT NULL DEFAULT 'main',
  source_commit TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  synced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flashcard_content TO anon;
GRANT SELECT ON public.flashcard_content TO authenticated;
GRANT ALL ON public.flashcard_content TO service_role;

ALTER TABLE public.flashcard_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flashcard content"
  ON public.flashcard_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy by design — only the admin sync server fn
-- (which uses the service-role client after a can_moderate check) may write.

-- Seed the singleton row.
INSERT INTO public.flashcard_content (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- =============== flashcard_progress ===============
CREATE TABLE public.flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  confidence TEXT,                 -- 'again' | 'good' | 'easy' | NULL
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX flashcard_progress_user_id_idx ON public.flashcard_progress (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_progress TO authenticated;
GRANT ALL ON public.flashcard_progress TO service_role;

ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcard progress"
  ON public.flashcard_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============== updated_at triggers ===============
-- Reuse existing public.update_updated_at_column() if present; fall back to creating it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

CREATE TRIGGER flashcard_content_updated_at
  BEFORE UPDATE ON public.flashcard_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER flashcard_progress_updated_at
  BEFORE UPDATE ON public.flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== END SOURCE MIGRATION: 20260622025943_8776ca6a-ff43-4a58-b1cd-d40e0cfe9b25.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260622112108_d27d3a70-473b-4684-9848-65d229bd14f2.sql =====

ALTER TABLE public.flashcard_content
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sync_interval text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS auto_sync_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sync_last_status text,
  ADD COLUMN IF NOT EXISTS auto_sync_last_error text;

ALTER TABLE public.flashcard_content
  DROP CONSTRAINT IF EXISTS flashcard_content_auto_sync_interval_check;

ALTER TABLE public.flashcard_content
  ADD CONSTRAINT flashcard_content_auto_sync_interval_check
  CHECK (auto_sync_interval IN ('daily','weekly','biweekly','monthly'));

-- ===== END SOURCE MIGRATION: 20260622112108_d27d3a70-473b-4684-9848-65d229bd14f2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260622114921_4dadf808-eeb3-4ec3-93e2-5177e1444cce.sql =====
ALTER TABLE public.flashcard_content ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
-- ===== END SOURCE MIGRATION: 20260622114921_4dadf808-eeb3-4ec3-93e2-5177e1444cce.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260624041237_7afcf9e7-6760-4dbb-88d0-196db8ff8a3c.sql =====

CREATE TABLE public.oem_parts_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  vin text NULL,
  make text NULL,
  model text NULL,
  year int NULL,
  trim text NULL,
  engine text NULL,
  parts_description text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed_won','closed_lost')),
  admin_notes text NULL,
  source text NOT NULL DEFAULT 'parts_page',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.oem_parts_interest TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.oem_parts_interest TO authenticated;
GRANT ALL ON public.oem_parts_interest TO service_role;

ALTER TABLE public.oem_parts_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit OEM parts interest"
  ON public.oem_parts_interest FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view OEM parts interest"
  ON public.oem_parts_interest FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can update OEM parts interest"
  ON public.oem_parts_interest FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete OEM parts interest"
  ON public.oem_parts_interest FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_oem_parts_interest_updated_at
  BEFORE UPDATE ON public.oem_parts_interest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX oem_parts_interest_status_created_at_idx
  ON public.oem_parts_interest (status, created_at DESC);

-- ===== END SOURCE MIGRATION: 20260624041237_7afcf9e7-6760-4dbb-88d0-196db8ff8a3c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260624042039_d0201104-a2e4-4674-b4ba-f6fffe8e8ab5.sql =====

-- Phase 1: Parts catalog groundwork — country scope + outlet directory
CREATE TABLE public.parts_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parts_countries TO anon, authenticated;
GRANT ALL ON public.parts_countries TO service_role;

ALTER TABLE public.parts_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active countries"
ON public.parts_countries FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage countries"
ON public.parts_countries FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.parts_countries (code, name, currency_code, is_active, sort_order) VALUES
  ('PH', 'Philippines', 'PHP', true, 1),
  ('VN', 'Vietnam', 'VND', false, 2),
  ('TH', 'Thailand', 'THB', false, 3),
  ('ID', 'Indonesia', 'IDR', false, 4),
  ('MY', 'Malaysia', 'MYR', false, 5),
  ('SG', 'Singapore', 'SGD', false, 6);

-- Parts outlets directory (OEM dealers, parts shops, junkyards, online sellers)
CREATE TABLE public.parts_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.parts_countries(code),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  outlet_type TEXT NOT NULL,
  brands TEXT[] NOT NULL DEFAULT '{}',
  region TEXT,
  city TEXT,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  phone TEXT,
  email TEXT,
  website TEXT,
  contact_name TEXT,
  contact_role TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_d2c_enabled BOOLEAN NOT NULL DEFAULT false,
  commission_pct NUMERIC(5,2),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug),
  CHECK (outlet_type IN ('oem_dealer','parts_shop','junkyard','online','distributor'))
);

CREATE INDEX idx_parts_outlets_country_active ON public.parts_outlets (country_code, is_active);
CREATE INDEX idx_parts_outlets_brands ON public.parts_outlets USING GIN (brands);

GRANT SELECT ON public.parts_outlets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.parts_outlets TO authenticated;
GRANT ALL ON public.parts_outlets TO service_role;

ALTER TABLE public.parts_outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active outlets"
ON public.parts_outlets FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage outlets"
ON public.parts_outlets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_parts_countries_updated_at
  BEFORE UPDATE ON public.parts_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_parts_outlets_updated_at
  BEFORE UPDATE ON public.parts_outlets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link OEM interest leads to a country so we know where demand is concentrated
ALTER TABLE public.oem_parts_interest
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.parts_countries(code) DEFAULT 'PH';

-- ===== END SOURCE MIGRATION: 20260624042039_d0201104-a2e4-4674-b4ba-f6fffe8e8ab5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260626024308_decef16d-1374-49bf-8c2a-7257ad419b47.sql =====
CREATE TABLE public.jdm_chassis_codes (
  code TEXT PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  engine TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jdm_chassis_codes TO anon, authenticated;
GRANT ALL ON public.jdm_chassis_codes TO service_role;

ALTER TABLE public.jdm_chassis_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jdm_chassis_codes public read"
  ON public.jdm_chassis_codes
  FOR SELECT
  USING (true);

CREATE TRIGGER jdm_chassis_codes_set_updated_at
  BEFORE UPDATE ON public.jdm_chassis_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== END SOURCE MIGRATION: 20260626024308_decef16d-1374-49bf-8c2a-7257ad419b47.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260626025547_fd987b1e-420b-4682-a7f0-21cc28a6eb9b.sql =====
CREATE POLICY "Staff read own QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_referrals s WHERE s.referral_code = qr_lead_captures.referral_code AND s.staff_user_id = auth.uid()));

CREATE POLICY "Advertising read all QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read qr_scans" ON public.qr_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read user_referrals" ON public.user_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read referral_redemptions" ON public.referral_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read staff_referrals" ON public.staff_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));
-- ===== END SOURCE MIGRATION: 20260626025547_fd987b1e-420b-4682-a7f0-21cc28a6eb9b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260626051831_65f37d9e-5d7f-4ee7-a9fe-3e5ea97f2aae.sql =====

-- 1) lead_offers: drop broad buyer SELECT policy (reads go through server functions)
DROP POLICY IF EXISTS "Buyers read their unlocked offers" ON public.lead_offers;

-- 2) payment_method_config: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Public can read enabled methods" ON public.payment_method_config;
CREATE POLICY "Authenticated can read enabled methods"
  ON public.payment_method_config
  FOR SELECT
  TO authenticated
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

-- 3) staff_referrals: remove advertising full-row read; provide safe directory view
DROP POLICY IF EXISTS "Advertising read staff_referrals" ON public.staff_referrals;

CREATE OR REPLACE VIEW public.staff_referrals_directory
WITH (security_invoker = false) AS
SELECT
  id,
  staff_user_id,
  referral_code,
  full_name,
  active,
  created_at
FROM public.staff_referrals
WHERE
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advertising'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR auth.uid() = staff_user_id;

GRANT SELECT ON public.staff_referrals_directory TO authenticated;

-- ===== END SOURCE MIGRATION: 20260626051831_65f37d9e-5d7f-4ee7-a9fe-3e5ea97f2aae.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260626070030_62255aec-1325-404a-a557-670626029309.sql =====

CREATE TABLE public.parts_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,
  signup_url TEXT,
  api_docs_url TEXT,
  region TEXT NOT NULL DEFAULT 'global',
  category TEXT NOT NULL DEFAULT 'aftermarket',
  brands TEXT[] NOT NULL DEFAULT '{}',
  supports_api BOOLEAN NOT NULL DEFAULT false,
  supports_dropship BOOLEAN NOT NULL DEFAULT false,
  supports_wholesale BOOLEAN NOT NULL DEFAULT false,
  vin_lookup BOOLEAN NOT NULL DEFAULT false,
  signup_status TEXT NOT NULL DEFAULT 'not_started',
  api_status TEXT NOT NULL DEFAULT 'none',
  priority INTEGER NOT NULL DEFAULT 100,
  account_email TEXT,
  account_ref TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  commission_notes TEXT,
  notes TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_suppliers TO authenticated;
GRANT ALL ON public.parts_suppliers TO service_role;

ALTER TABLE public.parts_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parts suppliers"
  ON public.parts_suppliers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_parts_suppliers_updated
BEFORE UPDATE ON public.parts_suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with curated supplier directory (PH, SEA, JDM, EU, US, global aftermarket + OEM)
INSERT INTO public.parts_suppliers
  (name, slug, website, signup_url, api_docs_url, region, category, brands, supports_api, supports_dropship, supports_wholesale, vin_lookup, priority, is_recommended, notes)
VALUES
  -- Philippines
  ('Autohub Group', 'autohub-ph', 'https://autohubgroup.com', 'https://autohubgroup.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda','Mini','BMW','Volvo','Lotus'], false, false, true, false, 10, true, 'Major PH dealer network — wholesale OEM relationship.'),
  ('Toyota Motor Philippines', 'toyota-ph', 'https://toyota.com.ph', 'https://toyota.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Toyota','Lexus'], false, false, true, true, 10, true, 'OEM parts dept per dealer; pursue national parts manager contact.'),
  ('Honda Cars Philippines', 'honda-ph', 'https://hondaphil.com', 'https://hondaphil.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda'], false, false, true, true, 15, true, 'OEM parts via authorized dealers.'),
  ('Mitsubishi Motors Philippines', 'mmpc-ph', 'https://mitsubishi-motors.com.ph', 'https://mitsubishi-motors.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Mitsubishi'], false, false, true, true, 15, false, NULL),
  ('Nissan Philippines', 'nissan-ph', 'https://nissan.ph', 'https://nissan.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Nissan'], false, false, true, true, 20, false, NULL),
  ('Ford Philippines', 'ford-ph', 'https://ford.com.ph', 'https://ford.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Ford'], false, false, true, true, 20, false, NULL),
  ('Isuzu Philippines', 'isuzu-ph', 'https://isuzuphil.com', 'https://isuzuphil.com/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Isuzu'], false, false, true, true, 25, false, NULL),
  ('Hyundai Asia Resources', 'hyundai-ph', 'https://hyundai.ph', 'https://hyundai.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Hyundai'], false, false, true, true, 25, false, NULL),
  ('Suzuki Philippines', 'suzuki-ph', 'https://suzuki.com.ph', 'https://suzuki.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Suzuki'], false, false, true, true, 25, false, NULL),
  ('Banawe Parts District', 'banawe-ph', NULL, NULL, NULL, 'PH', 'parts_shop', ARRAY['Toyota','Honda','Mitsubishi','Nissan','Isuzu','Mazda','Ford'], false, false, true, false, 5, true, 'Aggregator: dozens of independent PH shops. Build relationships in person.'),
  ('Tabangao / Bangkal surplus row', 'bangkal-ph', NULL, NULL, NULL, 'PH', 'junkyard', ARRAY['Toyota','Honda','Nissan','Mitsubishi'], false, false, true, false, 5, true, 'Used JDM/PH surplus body parts and engines.'),
  ('Carmudi Philippines Parts', 'carmudi-ph', 'https://www.carmudi.com.ph', 'https://www.carmudi.com.ph', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 60, false, NULL),
  ('Lazada PH (auto sellers)', 'lazada-ph', 'https://www.lazada.com.ph', 'https://open.lazada.com', 'https://open.lazada.com/doc/doc.htm', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API for affiliate/dropship.'),
  ('Shopee PH (auto sellers)', 'shopee-ph', 'https://shopee.ph', 'https://open.shopee.com', 'https://open.shopee.com/documents', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API; large PH parts seller base.'),

  -- JDM / Japan
  ('Amayama Trading', 'amayama', 'https://www.amayama.com', 'https://www.amayama.com/en/contacts', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda','Lexus','Suzuki','Daihatsu','Hino'], false, true, true, true, 10, true, 'Genuine JDM OEM with worldwide shipping. No public API; ask for partner feed.'),
  ('Nengun Performance', 'nengun', 'https://www.nengun.com', 'https://www.nengun.com/contact', NULL, 'JP', 'aftermarket', ARRAY['HKS','TRD','Nismo','Mugen','Tomei','Cusco','Spoon'], false, true, true, false, 20, true, 'JDM performance / tuning parts.'),
  ('Megazip', 'megazip', 'https://www.megazip.net', 'https://www.megazip.net', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Subaru','Mitsubishi','Mazda','Daihatsu','Suzuki','Isuzu','Hino'], false, true, false, true, 25, true, 'OEM catalog by VIN — Japan and US/EU brands.'),
  ('PartSouq', 'partsouq', 'https://partsouq.com', 'https://partsouq.com/en/auth/signin', NULL, 'AE', 'oem_distributor', ARRAY['Toyota','Lexus','Honda','Nissan','Mitsubishi','Mazda','Subaru','Hyundai','Kia','BMW','Mercedes','Audi','VW','Ford','GM'], false, true, true, true, 5, true, 'Reference catalog UX we want to match. No public API; partner inquiry.'),
  ('Impex Japan', 'impex-jp', 'https://www.impex-japan.com', 'https://www.impex-japan.com/contact', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda'], false, true, true, true, 30, false, 'JDM OEM with export.'),

  -- US
  ('RockAuto', 'rockauto', 'https://www.rockauto.com', 'https://www.rockauto.com', NULL, 'US', 'aftermarket', ARRAY[]::text[], false, true, true, false, 25, true, 'Massive aftermarket catalog. No public API; affiliate/wholesale via inquiry.'),
  ('Parts Authority', 'parts-authority', 'https://www.partsauthority.com', 'https://www.partsauthority.com/wholesale', 'https://www.partsauthority.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, true, 20, true, 'Wholesale + API for resellers.'),
  ('WORLDPAC', 'worldpac', 'https://www.worldpac.com', 'https://www.worldpac.com/contact', NULL, 'US', 'oem_distributor', ARRAY['BMW','Mercedes','Audi','VW','Volvo','Lexus','Toyota','Honda'], true, true, true, true, 15, true, 'OEM/import parts — speedDIAL API for wholesale partners.'),
  ('Turn 14 Distribution', 'turn14', 'https://www.turn14.com', 'https://www.turn14.com/dealer/apply', 'https://www.turn14.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 20, true, 'Performance/aftermarket; dealer API.'),
  ('Keystone Automotive', 'keystone', 'https://www.ekeystone.com', 'https://www.ekeystone.com/become-customer', NULL, 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 25, false, 'eKeystone API for jobbers.'),
  ('PartsTech', 'partstech', 'https://www.partstech.com', 'https://www.partstech.com/sign-up', 'https://developer.partstech.com', 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 15, true, 'Aggregator API across many US suppliers — single integration covers many.'),
  ('Nexpart (WHI)', 'nexpart', 'https://www.nexpart.com', 'https://www.nexpart.com', NULL, 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 25, false, 'WHI/Snap-on B2B catalog.'),
  ('eBay Motors', 'ebay-motors', 'https://www.ebay.com/motors', 'https://developer.ebay.com', 'https://developer.ebay.com/api-docs/static/finding-overview.html', 'US', 'online', ARRAY[]::text[], true, true, false, true, 30, true, 'Finding/Browse API — global supply with VIN/fitment filters.'),
  ('Amazon PA-API', 'amazon-paapi', 'https://www.amazon.com', 'https://affiliate-program.amazon.com', 'https://webservices.amazon.com/paapi5/documentation/', 'US', 'online', ARRAY[]::text[], true, false, false, false, 35, true, 'Affiliate API for parts listings.'),

  -- EU
  ('Tecdoc / TecAlliance', 'tecdoc', 'https://www.tecalliance.net', 'https://www.tecalliance.net/en/contact/', 'https://webservice.tecalliance.services', 'EU', 'aggregator', ARRAY[]::text[], true, true, true, true, 10, true, 'Industry-standard parts catalog data — license required.'),
  ('Autodoc PRO', 'autodoc', 'https://www.autodoc.co.uk', 'https://www.autodoc-pro.com', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 25, false, 'EU aftermarket; PRO program for wholesale.'),
  ('GSF Car Parts', 'gsf', 'https://www.gsfcarparts.com', 'https://www.gsfcarparts.com/trade', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 40, false, NULL),

  -- SEA / regional
  ('Boodmo (IN, expanding SEA)', 'boodmo', 'https://boodmo.com', 'https://boodmo.com', NULL, 'IN', 'aftermarket', ARRAY[]::text[], false, true, false, true, 35, false, 'India OEM/aftermarket marketplace.'),
  ('Carousell PH', 'carousell-ph', 'https://www.carousell.ph', 'https://api.carousell.com', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 45, false, 'Used parts listings.'),

  -- Global / China
  ('AliExpress / Cainiao', 'aliexpress', 'https://www.aliexpress.com', 'https://portals.aliexpress.com', 'https://developers.aliexpress.com', 'CN', 'aftermarket', ARRAY[]::text[], true, true, true, false, 30, true, 'Affiliate API + dropship; large aftermarket pool.'),
  ('1688 (Alibaba domestic)', '1688', 'https://www.1688.com', 'https://open.1688.com', 'https://open.1688.com/doc', 'CN', 'wholesale', ARRAY[]::text[], true, false, true, false, 40, false, 'Wholesale sourcing — Mandarin-only.'),
  ('Replicate / Pakistani aftermarket aggregators', 'pk-aftermarket', NULL, NULL, NULL, 'PK', 'aftermarket', ARRAY['Toyota','Honda','Suzuki'], false, true, true, false, 70, false, 'Body panel / trim suppliers worth scouting.');

-- ===== END SOURCE MIGRATION: 20260626070030_62255aec-1325-404a-a557-670626029309.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627025907_55545abc-08e6-4995-b0d1-6f98737bb935.sql =====

-- AFFILIATE LINKS (admin-managed deep-link templates per supplier)
CREATE TABLE public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'PH',
  logo_url TEXT,
  url_template TEXT NOT NULL,
  affiliate_id_env TEXT,
  network TEXT,
  commission_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active links"
  ON public.affiliate_links FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage links"
  ON public.affiliate_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFILIATE CLICKS (per-click log)
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL,
  query TEXT,
  listing_id UUID,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_supplier ON public.affiliate_clicks(supplier_slug, created_at DESC);
CREATE INDEX idx_affiliate_clicks_listing ON public.affiliate_clicks(listing_id) WHERE listing_id IS NOT NULL;

GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log a click"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins read all clicks"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed starter templates (all inactive until you add affiliate IDs)
INSERT INTO public.affiliate_links (supplier_slug, label, region, url_template, affiliate_id_env, network, commission_note, priority) VALUES
  ('shopee-ph', 'Shopee PH', 'PH', 'https://shopee.ph/search?keyword={QUERY}', 'SHOPEE_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia. ~3-8% varies by category.', 10),
  ('lazada-ph', 'Lazada PH', 'PH', 'https://www.lazada.com.ph/catalog/?q={QUERY}', 'LAZADA_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia or direct.', 20),
  ('ebay-motors', 'eBay Motors', 'GLOBAL', 'https://www.ebay.com/sch/i.html?_nkw={QUERY}&_sacat=6000', 'EBAY_PARTNER_ID', 'eBay Partner Network', 'Generous commissions on car parts category.', 30),
  ('amazon', 'Amazon', 'GLOBAL', 'https://www.amazon.com/s?k={QUERY}&i=automotive', 'AMAZON_ASSOCIATE_TAG', 'Amazon Associates', 'Requires 3 sales in 180 days to keep account.', 40),
  ('rockauto', 'RockAuto', 'GLOBAL', 'https://www.rockauto.com/en/catalog/{QUERY}', NULL, 'Direct', 'Apply via RockAuto Customer Service for affiliate.', 50),
  ('amayama', 'Amayama (JDM OEM)', 'GLOBAL', 'https://www.amayama.com/en/search?q={QUERY}', NULL, 'Direct', 'Email partnerships@amayama.com for affiliate terms.', 60),
  ('partsouq', 'PartSouq (OEM by VIN)', 'GLOBAL', 'https://partsouq.com/en/search/all?q={QUERY}', NULL, 'Direct', 'Currently no public affiliate program; lead-gen only.', 70),
  ('megazip', 'Megazip (JDM OEM)', 'GLOBAL', 'https://www.megazip.net/search?q={QUERY}', NULL, 'Direct', 'Direct partnership required.', 80);

-- ===== END SOURCE MIGRATION: 20260627025907_55545abc-08e6-4995-b0d1-6f98737bb935.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627034903_28b06ca4-999d-446e-96f6-385b12704814.sql =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email text;
CREATE INDEX IF NOT EXISTS profiles_personal_email_idx ON public.profiles ((lower(personal_email)));
-- ===== END SOURCE MIGRATION: 20260627034903_28b06ca4-999d-446e-96f6-385b12704814.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627064717_e3493d02-195d-4e15-bbca-e55115084ae2.sql =====

-- Activate Amazon & eBay now that affiliate IDs are configured
UPDATE public.affiliate_links SET is_active = true WHERE supplier_slug IN ('amazon','ebay-motors');

-- AliExpress PH via Involve Asia
INSERT INTO public.affiliate_links
  (supplier_slug, label, region, url_template, affiliate_id_env, network, commission_note, is_active, priority)
VALUES
  ('aliexpress-ph','AliExpress','PH','https://www.aliexpress.com/wholesale?SearchText={QUERY}','INVOLVE_ASIA','involve_asia','Via Involve Asia',true,25)
ON CONFLICT (supplier_slug) DO NOTHING;

-- B2B supplier onboarding applications
CREATE TABLE IF NOT EXISTS public.parts_supplier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  country text NOT NULL DEFAULT 'PH',
  business_kind text NOT NULL,
  partnership_type text NOT NULL,
  monthly_volume text,
  brands_carried text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  source_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psa_status_chk CHECK (status IN ('pending','reviewing','approved','rejected')),
  CONSTRAINT psa_partnership_chk CHECK (partnership_type IN ('affiliate','api','wholesale','dropship','sponsored','other'))
);

GRANT INSERT ON public.parts_supplier_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.parts_supplier_applications TO authenticated;
GRANT ALL ON public.parts_supplier_applications TO service_role;

ALTER TABLE public.parts_supplier_applications ENABLE ROW LEVEL SECURITY;

-- Public submit: anyone can insert an application
CREATE POLICY "Anyone can submit a supplier application"
  ON public.parts_supplier_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins manage the queue
CREATE POLICY "Admins can view applications"
  ON public.parts_supplier_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.parts_supplier_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete applications"
  ON public.parts_supplier_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS psa_status_idx ON public.parts_supplier_applications(status, created_at DESC);

CREATE TRIGGER psa_updated_at
  BEFORE UPDATE ON public.parts_supplier_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== END SOURCE MIGRATION: 20260627064717_e3493d02-195d-4e15-bbca-e55115084ae2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627073311_09ed7204-70a9-4715-b90e-306cbd292ba3.sql =====

ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS storefront_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS storefront_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storefront_blurb TEXT,
  ADD COLUMN IF NOT EXISTS storefront_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS storefront_categories TEXT[];

-- Public read of published partner storefronts only
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;
CREATE POLICY "public read published storefronts"
  ON public.parts_supplier_applications
  FOR SELECT
  TO anon, authenticated
  USING (storefront_published = true AND storefront_slug IS NOT NULL);

GRANT SELECT ON public.parts_supplier_applications TO anon;

-- ===== END SOURCE MIGRATION: 20260627073311_09ed7204-70a9-4715-b90e-306cbd292ba3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627102129_aa019b19-2de8-42ec-b3eb-0dfacac9c83d.sql =====

-- Commission rules per merchant
CREATE TABLE public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL UNIQUE,
  rate_bps integer NOT NULL DEFAULT 0,            -- basis points of order_amount (500 = 5.00%)
  flat_fee_cents integer NOT NULL DEFAULT 0,      -- per-conversion flat fee we earn
  per_listing_fee_cents integer NOT NULL DEFAULT 0, -- bonus when conversion attributed to a listing
  boost_multiplier_bps integer NOT NULL DEFAULT 10000, -- 10000 = 1.00x; e.g. 12000 = 1.2x for boosted
  currency text NOT NULL DEFAULT 'PHP',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_rules TO authenticated;
GRANT ALL ON public.affiliate_commission_rules TO service_role;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage commission rules" ON public.affiliate_commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conversions posted from merchant networks
CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_slug text NOT NULL,
  network text,                       -- 'involve_asia' | 'amazon' | 'ebay' | 'partner' | custom
  external_id text,                   -- merchant order id (unique per network)
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  listing_id uuid,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  order_amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  reported_commission_cents bigint,   -- what the network said they'll pay us (optional)
  computed_commission_cents bigint NOT NULL DEFAULT 0, -- derived from rules
  was_boosted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending|confirmed|reversed|paid
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, external_id)
);
CREATE INDEX affiliate_conversions_supplier_idx ON public.affiliate_conversions (supplier_slug, occurred_at DESC);
CREATE INDEX affiliate_conversions_listing_idx ON public.affiliate_conversions (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write conversions" ON public.affiliate_conversions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-network postback secrets (HMAC shared key)
CREATE TABLE public.affiliate_postback_secrets (
  network text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_postback_secrets TO authenticated;
GRANT ALL ON public.affiliate_postback_secrets TO service_role;
ALTER TABLE public.affiliate_postback_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage postback secrets" ON public.affiliate_postback_secrets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_affiliate_commission_rules_updated
  BEFORE UPDATE ON public.affiliate_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_conversions_updated
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_postback_secrets_updated
  BEFORE UPDATE ON public.affiliate_postback_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules for existing active suppliers (5% rate, idempotent)
INSERT INTO public.affiliate_commission_rules (supplier_slug, rate_bps, currency, notes)
SELECT supplier_slug, 500, 'PHP', 'Auto-seeded default 5%'
FROM public.affiliate_links
WHERE is_active = true
ON CONFLICT (supplier_slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260627102129_aa019b19-2de8-42ec-b3eb-0dfacac9c83d.sql =====

