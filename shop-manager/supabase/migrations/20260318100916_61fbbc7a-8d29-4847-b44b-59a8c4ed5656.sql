
-- Phase 1: Personal Trainer Module Expansion

-- 1. pt_trainers - Trainer profiles
CREATE TABLE public.pt_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bio TEXT,
  specializations TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  avatar_url TEXT,
  hourly_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_trainers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_trainers' AND policyname = 'pt_trainers_shop_isolation') THEN
  CREATE POLICY pt_trainers_shop_isolation ON public.pt_trainers
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 2. pt_workout_days - Days within a workout program
CREATE TABLE public.pt_workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.pt_workout_programs(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  focus_area TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_workout_days ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_workout_days' AND policyname = 'pt_workout_days_shop_isolation') THEN
  CREATE POLICY pt_workout_days_shop_isolation ON public.pt_workout_days
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 3. pt_workout_day_exercises - Exercises within a workout day
CREATE TABLE public.pt_workout_day_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id UUID NOT NULL REFERENCES public.pt_workout_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.pt_exercises(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  tempo TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_workout_day_exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_workout_day_exercises' AND policyname = 'pt_workout_day_exercises_shop_isolation') THEN
  CREATE POLICY pt_workout_day_exercises_shop_isolation ON public.pt_workout_day_exercises
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 4. pt_check_ins - Weekly client check-ins
CREATE TABLE public.pt_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(6,2),
  mood TEXT,
  energy_level INTEGER,
  sleep_hours NUMERIC(3,1),
  stress_level INTEGER,
  nutrition_compliance INTEGER,
  workout_compliance INTEGER,
  notes TEXT,
  trainer_feedback TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_check_ins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_check_ins' AND policyname = 'pt_check_ins_shop_isolation') THEN
  CREATE POLICY pt_check_ins_shop_isolation ON public.pt_check_ins
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 5. pt_messages - Messaging between trainer and client
CREATE TABLE public.pt_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_messages' AND policyname = 'pt_messages_shop_isolation') THEN
  CREATE POLICY pt_messages_shop_isolation ON public.pt_messages
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 6. pt_progress_photos - Client progress photos
CREATE TABLE public.pt_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT DEFAULT 'front',
  photo_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_progress_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_progress_photos' AND policyname = 'pt_progress_photos_shop_isolation') THEN
  CREATE POLICY pt_progress_photos_shop_isolation ON public.pt_progress_photos
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 7. pt_invoices - Invoices tied to client packages
CREATE TABLE public.pt_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  client_package_id UUID REFERENCES public.pt_client_packages(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_invoices' AND policyname = 'pt_invoices_shop_isolation') THEN
  CREATE POLICY pt_invoices_shop_isolation ON public.pt_invoices
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- Schema alterations to existing tables
ALTER TABLE public.pt_client_programs ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL;
ALTER TABLE public.pt_body_metrics ADD COLUMN IF NOT EXISTS progress_photos_url TEXT;
ALTER TABLE public.pt_sessions ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL;
ALTER TABLE public.pt_sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE public.pt_clients ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL;
ALTER TABLE public.pt_clients ADD COLUMN IF NOT EXISTS injuries TEXT;
ALTER TABLE public.pt_clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.pt_clients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.pt_clients ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
