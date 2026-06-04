CREATE TABLE public.share_kit_layouts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  cx numeric NOT NULL CHECK (cx >= 0 AND cx <= 1),
  cy numeric NOT NULL CHECK (cy >= 0 AND cy <= 1),
  size numeric NOT NULL CHECK (size >= 0.05 AND size <= 0.8),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_kit_layouts TO authenticated;
GRANT ALL ON public.share_kit_layouts TO service_role;

ALTER TABLE public.share_kit_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own share kit layouts"
ON public.share_kit_layouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
