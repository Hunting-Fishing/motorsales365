-- Saved searches table
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category_slug text,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own saved searches"
ON public.saved_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own saved searches"
ON public.saved_searches FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add 'sold' to listing_status enum if not present
DO $$ BEGIN
  ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'sold';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add 'pending_payment' to listing_status enum if not present
DO $$ BEGIN
  ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'pending_payment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;