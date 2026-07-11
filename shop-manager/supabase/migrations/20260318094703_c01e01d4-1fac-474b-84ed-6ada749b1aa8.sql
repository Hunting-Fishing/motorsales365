
-- ============================================================
-- Personal Trainer Module: Core Tables
-- ============================================================

-- Clients table (gym members / PT clients)
CREATE TABLE public.pt_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  profile_photo_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  health_conditions text,
  goals text,
  fitness_level text DEFAULT 'beginner',
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  membership_type text DEFAULT 'standard',
  membership_status text DEFAULT 'active',
  join_date date DEFAULT CURRENT_DATE,
  notes text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_clients_shop_isolation" ON public.pt_clients
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id()::text)
  WITH CHECK (shop_id = public.get_current_user_shop_id()::text);

-- Exercises library
CREATE TABLE public.pt_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'strength',
  muscle_group text,
  equipment text,
  description text,
  video_url text,
  difficulty text DEFAULT 'intermediate',
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_exercises_shop_isolation" ON public.pt_exercises
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id()::text)
  WITH CHECK (shop_id = public.get_current_user_shop_id()::text);

-- Workout programs (templates)
CREATE TABLE public.pt_workout_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  name text NOT NULL,
  description text,
  duration_weeks integer DEFAULT 4,
  difficulty text DEFAULT 'intermediate',
  goal text,
  created_by uuid REFERENCES auth.users(id),
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_workout_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_workout_programs_shop_isolation" ON public.pt_workout_programs
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id()::text)
  WITH CHECK (shop_id = public.get_current_user_shop_id()::text);

-- Workout program exercises (exercises within a program)
CREATE TABLE public.pt_program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.pt_workout_programs(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES public.pt_exercises(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer,
  sets integer DEFAULT 3,
  reps text DEFAULT '10',
  rest_seconds integer DEFAULT 60,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_program_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_program_exercises_access" ON public.pt_program_exercises
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pt_workout_programs p
    WHERE p.id = program_id AND p.shop_id = public.get_current_user_shop_id()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_workout_programs p
    WHERE p.id = program_id AND p.shop_id = public.get_current_user_shop_id()::text
  ));

-- Client program assignments
CREATE TABLE public.pt_client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES public.pt_workout_programs(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text DEFAULT 'active',
  assigned_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_client_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_client_programs_access" ON public.pt_client_programs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ));

-- Sessions / Appointments
CREATE TABLE public.pt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES auth.users(id),
  session_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  session_type text DEFAULT 'personal_training',
  status text DEFAULT 'scheduled',
  location text,
  notes text,
  attendance text DEFAULT 'pending',
  canceled_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_sessions_shop_isolation" ON public.pt_sessions
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id()::text)
  WITH CHECK (shop_id = public.get_current_user_shop_id()::text);

-- Body metrics / progress tracking
CREATE TABLE public.pt_body_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  body_fat_percent numeric,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_body_metrics_access" ON public.pt_body_metrics
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ));

-- Packages / Memberships (billing)
CREATE TABLE public.pt_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL,
  name text NOT NULL,
  description text,
  sessions_included integer,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer DEFAULT 30,
  package_type text DEFAULT 'session_pack',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_packages_shop_isolation" ON public.pt_packages
  FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id()::text)
  WITH CHECK (shop_id = public.get_current_user_shop_id()::text);

-- Client package purchases
CREATE TABLE public.pt_client_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES public.pt_packages(id) ON DELETE CASCADE NOT NULL,
  purchase_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  sessions_remaining integer,
  amount_paid numeric DEFAULT 0,
  payment_method text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_client_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_client_packages_access" ON public.pt_client_packages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_clients c
    WHERE c.id = client_id AND c.shop_id = public.get_current_user_shop_id()::text
  ));

-- Indexes for performance
CREATE INDEX idx_pt_clients_shop ON public.pt_clients(shop_id);
CREATE INDEX idx_pt_sessions_shop ON public.pt_sessions(shop_id);
CREATE INDEX idx_pt_sessions_client ON public.pt_sessions(client_id);
CREATE INDEX idx_pt_sessions_date ON public.pt_sessions(session_date);
CREATE INDEX idx_pt_exercises_shop ON public.pt_exercises(shop_id);
CREATE INDEX idx_pt_packages_shop ON public.pt_packages(shop_id);
CREATE INDEX idx_pt_clients_user ON public.pt_clients(user_id);
