
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
