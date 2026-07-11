-- Create pt_gym_staff table
CREATE TABLE public.pt_gym_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'staff',
  department text,
  hourly_rate numeric DEFAULT 0,
  hire_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_gym_staff ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_staff_select' AND tablename = 'pt_gym_staff') THEN
  CREATE POLICY pt_gym_staff_select ON public.pt_gym_staff FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_staff_insert' AND tablename = 'pt_gym_staff') THEN
  CREATE POLICY pt_gym_staff_insert ON public.pt_gym_staff FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_staff_update' AND tablename = 'pt_gym_staff') THEN
  CREATE POLICY pt_gym_staff_update ON public.pt_gym_staff FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_staff_delete' AND tablename = 'pt_gym_staff') THEN
  CREATE POLICY pt_gym_staff_delete ON public.pt_gym_staff FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- Create pt_time_entries table
CREATE TABLE public.pt_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.pt_gym_staff(id) ON DELETE SET NULL,
  trainer_id uuid REFERENCES public.pt_trainers(id) ON DELETE SET NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  break_minutes int NOT NULL DEFAULT 0,
  total_hours numeric,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_time_entries_select' AND tablename = 'pt_time_entries') THEN
  CREATE POLICY pt_time_entries_select ON public.pt_time_entries FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_time_entries_insert' AND tablename = 'pt_time_entries') THEN
  CREATE POLICY pt_time_entries_insert ON public.pt_time_entries FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_time_entries_update' AND tablename = 'pt_time_entries') THEN
  CREATE POLICY pt_time_entries_update ON public.pt_time_entries FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_time_entries_delete' AND tablename = 'pt_time_entries') THEN
  CREATE POLICY pt_time_entries_delete ON public.pt_time_entries FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
END $$;