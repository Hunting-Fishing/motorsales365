
-- Add 'added_by' column to track who added the condition (client vs trainer)
ALTER TABLE pt_client_medical_conditions ADD COLUMN IF NOT EXISTS added_by text DEFAULT 'trainer';

-- RLS policies for client self-service access (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can view own medical conditions' AND tablename = 'pt_client_medical_conditions') THEN
    CREATE POLICY "Clients can view own medical conditions"
    ON public.pt_client_medical_conditions FOR SELECT
    TO authenticated
    USING (client_id IN (
      SELECT id FROM pt_clients WHERE user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can insert own medical conditions' AND tablename = 'pt_client_medical_conditions') THEN
    CREATE POLICY "Clients can insert own medical conditions"
    ON public.pt_client_medical_conditions FOR INSERT
    TO authenticated
    WITH CHECK (client_id IN (
      SELECT id FROM pt_clients WHERE user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can update own medical conditions' AND tablename = 'pt_client_medical_conditions') THEN
    CREATE POLICY "Clients can update own medical conditions"
    ON public.pt_client_medical_conditions FOR UPDATE
    TO authenticated
    USING (client_id IN (
      SELECT id FROM pt_clients WHERE user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can delete own medical conditions' AND tablename = 'pt_client_medical_conditions') THEN
    CREATE POLICY "Clients can delete own medical conditions"
    ON public.pt_client_medical_conditions FOR DELETE
    TO authenticated
    USING (client_id IN (
      SELECT id FROM pt_clients WHERE user_id = auth.uid()
    ));
  END IF;

  -- Ensure catalog is readable by all authenticated users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated can read medical catalog' AND tablename = 'pt_medical_condition_catalog') THEN
    CREATE POLICY "All authenticated can read medical catalog"
    ON public.pt_medical_condition_catalog FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
