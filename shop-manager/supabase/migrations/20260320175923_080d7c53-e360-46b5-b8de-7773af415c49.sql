
-- Add new columns to pt_body_metrics
ALTER TABLE public.pt_body_metrics 
  ADD COLUMN IF NOT EXISTS bmi numeric,
  ADD COLUMN IF NOT EXISTS resting_heart_rate int,
  ADD COLUMN IF NOT EXISTS blood_pressure_systolic int,
  ADD COLUMN IF NOT EXISTS blood_pressure_diastolic int,
  ADD COLUMN IF NOT EXISTS muscle_mass_kg numeric,
  ADD COLUMN IF NOT EXISTS bone_mass_kg numeric,
  ADD COLUMN IF NOT EXISTS water_percent numeric,
  ADD COLUMN IF NOT EXISTS visceral_fat numeric,
  ADD COLUMN IF NOT EXISTS bmr_calories int,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create pt_health_integrations table
CREATE TABLE IF NOT EXISTS public.pt_health_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  is_connected boolean DEFAULT false,
  last_synced_at timestamptz,
  access_token_encrypted text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pt_health_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage health integrations for their shop"
  ON public.pt_health_integrations
  FOR ALL
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());
