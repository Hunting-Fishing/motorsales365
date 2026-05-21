
-- Facebook import: profile linking + listing source tracking + import jobs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fb_profile_url text,
  ADD COLUMN IF NOT EXISTS fb_profile_id text,
  ADD COLUMN IF NOT EXISTS fb_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS fb_verification_method text,
  ADD COLUMN IF NOT EXISTS fb_verification_code text,
  ADD COLUMN IF NOT EXISTS fb_verification_code_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_fb_profile_id_key
  ON public.profiles (fb_profile_id)
  WHERE fb_profile_id IS NOT NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE TABLE IF NOT EXISTS public.fb_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  extracted_payload jsonb,
  error text,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_import_jobs_user ON public.fb_import_jobs (user_id, created_at DESC);

ALTER TABLE public.fb_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own fb import jobs"
  ON public.fb_import_jobs FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own fb import jobs"
  ON public.fb_import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage fb import jobs"
  ON public.fb_import_jobs
  USING (has_role(auth.uid(), 'admin'::app_role));
