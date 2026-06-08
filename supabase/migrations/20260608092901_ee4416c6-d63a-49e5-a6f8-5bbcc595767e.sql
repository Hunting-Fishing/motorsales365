
CREATE TYPE public.wanted_post_status AS ENUM ('open','closed','expired');
CREATE TYPE public.wanted_post_category AS ENUM ('car','motorcycle','truck','equipment','part','service','tow','other');
CREATE TYPE public.wanted_contact_method AS ENUM ('platform','phone','messenger','any');

CREATE TABLE public.wanted_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  category public.wanted_post_category NOT NULL DEFAULT 'other',
  budget_min_php numeric(12,2),
  budget_max_php numeric(12,2),
  region text,
  city text,
  contact_method public.wanted_contact_method NOT NULL DEFAULT 'platform',
  contact_value text,
  status public.wanted_post_status NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  response_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_posts_status_idx ON public.wanted_posts(status, created_at DESC);
CREATE INDEX wanted_posts_category_idx ON public.wanted_posts(category, status);
CREATE INDEX wanted_posts_user_idx ON public.wanted_posts(user_id, created_at DESC);

GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

ALTER TABLE public.wanted_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open wanted posts"
  ON public.wanted_posts FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own wanted posts"
  ON public.wanted_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wanted posts"
  ON public.wanted_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wanted posts"
  ON public.wanted_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE public.wanted_post_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_post_id uuid NOT NULL REFERENCES public.wanted_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  contact_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_post_responses_post_idx ON public.wanted_post_responses(wanted_post_id, created_at DESC);
CREATE INDEX wanted_post_responses_user_idx ON public.wanted_post_responses(user_id, created_at DESC);

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;

ALTER TABLE public.wanted_post_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view responses to open posts"
  ON public.wanted_post_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id
        AND (wp.status = 'open' OR wp.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can respond to open wanted posts"
  ON public.wanted_post_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id AND wp.status = 'open'
    )
  );

CREATE POLICY "Users can update their own responses"
  ON public.wanted_post_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
  ON public.wanted_post_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- updated_at triggers (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_wanted_posts_updated_at
  BEFORE UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_wanted_post_responses_updated_at
  BEFORE UPDATE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- maintain response_count
CREATE OR REPLACE FUNCTION public.wanted_post_responses_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wanted_posts SET response_count = response_count + 1 WHERE id = NEW.wanted_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wanted_posts SET response_count = GREATEST(response_count - 1, 0) WHERE id = OLD.wanted_post_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_wanted_post_responses_count
  AFTER INSERT OR DELETE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.wanted_post_responses_count();

-- auto-expire trigger (validation via trigger, not CHECK, since now() is non-immutable)
CREATE OR REPLACE FUNCTION public.wanted_posts_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at <= now() AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  IF NEW.budget_min_php IS NOT NULL AND NEW.budget_max_php IS NOT NULL
     AND NEW.budget_min_php > NEW.budget_max_php THEN
    RAISE EXCEPTION 'budget_min_php cannot exceed budget_max_php';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_wanted_posts_validate
  BEFORE INSERT OR UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.wanted_posts_validate();
