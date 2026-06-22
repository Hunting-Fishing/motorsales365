
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
