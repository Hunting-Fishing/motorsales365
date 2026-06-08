
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_updated_at timestamptz;

CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR length(body) <= 2000),
  transaction_completed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_reviews_no_self CHECK (seller_id <> reviewer_id)
);

CREATE UNIQUE INDEX seller_reviews_unique_per_listing
  ON public.seller_reviews (seller_id, reviewer_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX seller_reviews_seller_idx ON public.seller_reviews (seller_id, status, created_at DESC);
CREATE INDEX seller_reviews_reviewer_idx ON public.seller_reviews (reviewer_id);

GRANT SELECT ON public.seller_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_reviews TO authenticated;
GRANT ALL ON public.seller_reviews TO service_role;

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active reviews public read" ON public.seller_reviews
  FOR SELECT USING (
    status = 'active' OR auth.uid() = reviewer_id OR auth.uid() = seller_id OR public.can_moderate(auth.uid())
  );

CREATE POLICY "Users insert own review" ON public.seller_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() <> seller_id);

CREATE POLICY "Users update own review" ON public.seller_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users delete own review" ON public.seller_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

CREATE POLICY "Moderators manage seller reviews" ON public.seller_reviews
  FOR ALL USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_seller_reviews_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recompute_seller_rating(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::numeric(3,2),
         COUNT(*)::int
    INTO v_avg, v_count
    FROM public.seller_reviews
   WHERE seller_id = _seller AND status = 'active';

  UPDATE public.profiles
     SET seller_rating_avg = v_avg,
         seller_rating_count = v_count,
         reviews_updated_at = now()
   WHERE id = _seller;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_reviews_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.seller_id <> NEW.seller_id THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  ELSE
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_seller_reviews_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.seller_reviews_after_change();

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, seller_type, business_name, business_logo_url,
       business_address, business_region, business_province, business_city, business_barangay,
       business_lat, business_lng, business_hours, business_kind,
       verification_status, verified_at,
       fb_profile_url, fb_profile_id, fb_verified_at,
       is_founding_member, founding_member_number,
       created_at,
       seller_rating_avg, seller_rating_count, reviews_updated_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
