CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users create their own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users delete their own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);
CREATE INDEX user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks (blocked_user_id);