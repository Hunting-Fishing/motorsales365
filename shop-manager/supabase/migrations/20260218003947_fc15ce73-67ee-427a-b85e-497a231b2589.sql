
-- =====================================================
-- Fix linter: SECURITY DEFINER views + missing search_path
-- =====================================================

-- 1) SECURITY DEFINER views (recreate with security_invoker=on)
DROP VIEW IF EXISTS public.api_usage_by_user_daily;
CREATE VIEW public.api_usage_by_user_daily
WITH (security_invoker=on) AS
SELECT api_usage_logs.shop_id,
       api_usage_logs.user_id,
       date_trunc('day'::text, api_usage_logs.created_at) AS day,
       api_usage_logs.api_service,
       count(*) AS call_count,
       COALESCE(sum(api_usage_logs.tokens_used), 0::bigint) AS total_tokens,
       COALESCE(sum(api_usage_logs.estimated_cost_cents), 0::bigint) AS total_cost_cents
  FROM public.api_usage_logs
 GROUP BY api_usage_logs.shop_id,
          api_usage_logs.user_id,
          (date_trunc('day'::text, api_usage_logs.created_at)),
          api_usage_logs.api_service;

DROP VIEW IF EXISTS public.api_usage_by_user_monthly;
CREATE VIEW public.api_usage_by_user_monthly
WITH (security_invoker=on) AS
SELECT api_usage_logs.shop_id,
       api_usage_logs.user_id,
       date_trunc('month'::text, api_usage_logs.created_at) AS month,
       api_usage_logs.api_service,
       count(*) AS call_count,
       COALESCE(sum(api_usage_logs.tokens_used), 0::bigint) AS total_tokens,
       COALESCE(sum(api_usage_logs.estimated_cost_cents), 0::bigint) AS total_cost_cents
  FROM public.api_usage_logs
 GROUP BY api_usage_logs.shop_id,
          api_usage_logs.user_id,
          (date_trunc('month'::text, api_usage_logs.created_at)),
          api_usage_logs.api_service;

-- 2) Fix functions flagged for missing search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_training_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recert_months INTEGER;
BEGIN
  SELECT tc.recertification_months
    INTO recert_months
    FROM public.training_courses tc
   WHERE tc.id = NEW.course_id;

  IF NEW.completed_date IS NOT NULL THEN
    IF NEW.expiry_date IS NULL AND recert_months IS NOT NULL THEN
      NEW.expiry_date := (NEW.completed_date + (recert_months || ' months')::interval)::date;
    END IF;
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    ELSE
      NEW.status := 'completed';
    END IF;
  ELSE
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    ELSIF NEW.status IS NULL OR NEW.status NOT IN ('assigned', 'in_progress') THEN
      NEW.status := 'assigned';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_shop_slug(shop_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(shop_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_slug_and_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.generate_shop_slug(NEW.name) || '-' || substr(NEW.id::text, 1, 4);
  END IF;
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_gunsmith_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
