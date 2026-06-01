
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.course_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.course_level AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enrollment_source AS ENUM ('purchase','subscription','admin_grant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_tier AS ENUM ('featured','standard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  description text,
  hero_image_url text,
  category text,
  level public.course_level NOT NULL DEFAULT 'beginner',
  duration_minutes int DEFAULT 0,
  instructor_name text,
  instructor_bio text,
  price_id text,
  price_php numeric(10,2),
  included_in_tiers text[] NOT NULL DEFAULT '{}',
  status public.course_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_category ON public.courses(category);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are public" ON public.courses FOR SELECT TO public USING (status = 'published');
CREATE POLICY "Moderators manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MODULES ============
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id, position);
GRANT SELECT ON public.course_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules of published courses are public" ON public.course_modules FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'));
CREATE POLICY "Moderators manage modules" ON public.course_modules FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ LESSONS ============
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  video_url text,
  duration_seconds int DEFAULT 0,
  content_md text,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id, position);
GRANT SELECT ON public.course_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons of published courses are public" ON public.course_lessons FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.status = 'published'));
CREATE POLICY "Moderators manage lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ ENROLLMENTS (must be before resources policy) ============
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  source public.enrollment_source NOT NULL DEFAULT 'admin_grant',
  payment_id uuid,
  stripe_session_id text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON public.course_enrollments(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own enrollments" ON public.course_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate(auth.uid()));
CREATE POLICY "Moderators manage enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ RESOURCES ============
CREATE TABLE public.course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  label text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_resources_lesson ON public.course_resources(lesson_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resources TO authenticated;
GRANT ALL ON public.course_resources TO service_role;
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources visible to enrolled users" ON public.course_resources FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_id AND e.user_id = auth.uid()) OR public.can_moderate(auth.uid()));
CREATE POLICY "Moderators manage resources" ON public.course_resources FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ QUIZZES ============
CREATE TABLE public.course_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  pass_threshold int NOT NULL DEFAULT 80,
  is_final boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_quizzes_course ON public.course_quizzes(course_id);
GRANT SELECT ON public.course_quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quizzes TO authenticated;
GRANT ALL ON public.course_quizzes TO service_role;
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes of published courses are public" ON public.course_quizzes FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'));
CREATE POLICY "Moderators manage quizzes" ON public.course_quizzes FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ QUIZ QUESTIONS ============
CREATE TABLE public.course_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_quiz_questions_quiz ON public.course_quiz_questions(quiz_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quiz_questions TO authenticated;
GRANT ALL ON public.course_quiz_questions TO service_role;
ALTER TABLE public.course_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators manage quiz questions" ON public.course_quiz_questions FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ LESSON PROGRESS ============
CREATE TABLE public.course_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  watch_seconds int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_enrollment ON public.course_lesson_progress(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lesson_progress TO authenticated;
GRANT ALL ON public.course_lesson_progress TO service_role;
ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson progress" ON public.course_lesson_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));
CREATE POLICY "Moderators read lesson progress" ON public.course_lesson_progress FOR SELECT TO authenticated
  USING (public.can_moderate(auth.uid()));

-- ============ QUIZ ATTEMPTS ============
CREATE TABLE public.course_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  score int NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_attempts_enrollment ON public.course_quiz_attempts(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quiz_attempts TO authenticated;
GRANT ALL ON public.course_quiz_attempts TO service_role;
ALTER TABLE public.course_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quiz attempts" ON public.course_quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
    OR public.can_moderate(auth.uid()));
CREATE POLICY "Users insert own quiz attempts" ON public.course_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));
CREATE POLICY "Moderators manage quiz attempts" ON public.course_quiz_attempts FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ CERTIFICATES ============
CREATE TABLE public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_certificates_user ON public.course_certificates(user_id);
GRANT SELECT ON public.course_certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_certificates TO authenticated;
GRANT ALL ON public.course_certificates TO service_role;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificates are publicly verifiable" ON public.course_certificates FOR SELECT TO public USING (true);
CREATE POLICY "Moderators manage certificates" ON public.course_certificates FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ TRAINING PARTNERS ============
CREATE TABLE public.training_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  website_url text NOT NULL,
  description text,
  location text,
  specialties text[] NOT NULL DEFAULT '{}',
  tier public.partner_tier NOT NULL DEFAULT 'standard',
  sponsored_until date,
  click_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_partners_active ON public.training_partners(active);
GRANT SELECT ON public.training_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_partners TO authenticated;
GRANT ALL ON public.training_partners TO service_role;
ALTER TABLE public.training_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active partners are public" ON public.training_partners FOR SELECT TO public USING (active = true);
CREATE POLICY "Moderators manage partners" ON public.training_partners FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));
CREATE TRIGGER trg_training_partners_updated_at BEFORE UPDATE ON public.training_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PARTNER CLICKS ============
CREATE TABLE public.training_partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.training_partners(id) ON DELETE CASCADE,
  visitor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_partner_clicks_partner ON public.training_partner_clicks(partner_id, created_at DESC);
GRANT ALL ON public.training_partner_clicks TO service_role;
ALTER TABLE public.training_partner_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators read partner clicks" ON public.training_partner_clicks FOR SELECT TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_training_partner_click_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.training_partners SET click_count = click_count + 1 WHERE id = NEW.partner_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_training_partner_click_increment AFTER INSERT ON public.training_partner_clicks
  FOR EACH ROW EXECUTE FUNCTION public.tg_training_partner_click_increment();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-media', 'course-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Course media is publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-media');
CREATE POLICY "Moderators upload course media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));
CREATE POLICY "Moderators update course media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));
CREATE POLICY "Moderators delete course media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));
