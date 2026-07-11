
-- Phase 2: Workout completion tracking

CREATE TABLE public.pt_workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.pt_workout_programs(id) ON DELETE CASCADE,
  workout_day_id UUID NOT NULL REFERENCES public.pt_workout_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.pt_exercises(id) ON DELETE SET NULL,
  sets_completed INTEGER DEFAULT 0,
  reps_completed TEXT,
  weight_used NUMERIC(8,2),
  duration_seconds INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_workout_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_workout_logs' AND policyname = 'pt_workout_logs_shop_isolation') THEN
  CREATE POLICY pt_workout_logs_shop_isolation ON public.pt_workout_logs
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;
