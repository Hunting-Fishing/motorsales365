
CREATE TABLE public.staff_dms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_dms_pair ON public.staff_dms (
  LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC
);
CREATE INDEX idx_staff_dms_recipient ON public.staff_dms (recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.staff_dms TO authenticated;
GRANT ALL ON public.staff_dms TO service_role;

ALTER TABLE public.staff_dms ENABLE ROW LEVEL SECURITY;

-- Read: only participants
CREATE POLICY "Participants read staff dms"
  ON public.staff_dms FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Insert: sender is caller AND both parties are internal staff
CREATE POLICY "Staff send staff dms"
  ON public.staff_dms FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = sender_id AND p.is_staff_account = true)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recipient_id AND p.is_staff_account = true)
    AND sender_id <> recipient_id
  );

-- Update: recipient can mark read
CREATE POLICY "Recipient marks staff dm read"
  ON public.staff_dms FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_dms;
