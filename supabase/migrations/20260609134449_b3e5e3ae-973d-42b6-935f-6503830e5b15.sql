ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sponsor_partner_id uuid REFERENCES public.training_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_courses_sponsor_partner ON public.courses(sponsor_partner_id);