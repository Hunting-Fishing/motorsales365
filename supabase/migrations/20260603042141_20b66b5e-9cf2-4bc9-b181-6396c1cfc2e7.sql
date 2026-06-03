CREATE TABLE public.user_garage_vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('car','motorcycle')),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  trim text,
  engine text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_garage_vehicles TO authenticated;
GRANT ALL ON public.user_garage_vehicles TO service_role;

ALTER TABLE public.user_garage_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own garage vehicle"
  ON public.user_garage_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own garage vehicle"
  ON public.user_garage_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own garage vehicle"
  ON public.user_garage_vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own garage vehicle"
  ON public.user_garage_vehicles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_garage_vehicles_updated_at
  BEFORE UPDATE ON public.user_garage_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();