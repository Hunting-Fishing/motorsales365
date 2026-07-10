CREATE OR REPLACE FUNCTION public.tg_listings_match_parts_wanted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.category_slug = 'parts' AND NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.match_listing_to_parts_wanted(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.listing_drafts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug text,
  form_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_drafts TO authenticated;
GRANT ALL ON public.listing_drafts TO service_role;

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own draft select" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft upsert" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft update" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft delete" ON public.listing_drafts;

CREATE POLICY "own draft select" ON public.listing_drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own draft upsert" ON public.listing_drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own draft update" ON public.listing_drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own draft delete" ON public.listing_drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_listing_drafts_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS listing_drafts_touch ON public.listing_drafts;
CREATE TRIGGER listing_drafts_touch BEFORE UPDATE ON public.listing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_listing_drafts_touch();