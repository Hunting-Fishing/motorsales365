CREATE TABLE IF NOT EXISTS public.form_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL,
  page_path text,
  message text NOT NULL,
  suggestion_type text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text,
  user_agent text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_feedback_form_idx ON public.form_feedback(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS form_feedback_status_idx ON public.form_feedback(status, created_at DESC);
GRANT SELECT, INSERT ON public.form_feedback TO authenticated;
GRANT INSERT ON public.form_feedback TO anon;
GRANT ALL ON public.form_feedback TO service_role;
ALTER TABLE public.form_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit feedback" ON public.form_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users can read own feedback" ON public.form_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins can read all feedback" ON public.form_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update feedback" ON public.form_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));