-- Create certificates table for team members
CREATE TABLE IF NOT EXISTS public.team_member_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL,
  certificate_type TEXT NOT NULL, -- e.g., 'ASE', 'Technical', 'Safety', 'License'
  issuing_organization TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number TEXT,
  verification_url TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create training records table for team members
CREATE TABLE IF NOT EXISTS public.team_member_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT NOT NULL, -- e.g., 'On-Site', 'Online', 'Workshop', 'Seminar'
  provider TEXT NOT NULL,
  start_date DATE NOT NULL,
  completion_date DATE,
  duration_hours NUMERIC,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  score NUMERIC, -- For assessments
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_member_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_training ENABLE ROW LEVEL SECURITY;

-- Policies for certificates
CREATE POLICY "Users can view certificates from their shop"
  ON public.team_member_certificates
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE shop_id = (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own certificates"
  ON public.team_member_certificates
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can manage certificates"
  ON public.team_member_certificates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "Users can manage their own certificates"
  ON public.team_member_certificates
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own certificates"
  ON public.team_member_certificates
  FOR UPDATE
  USING (profile_id = auth.uid());

-- Policies for training
CREATE POLICY "Users can view training from their shop"
  ON public.team_member_training
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE shop_id = (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own training"
  ON public.team_member_training
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can manage training"
  ON public.team_member_training
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "Users can manage their own training"
  ON public.team_member_training
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own training"
  ON public.team_member_training
  FOR UPDATE
  USING (profile_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_certificates_profile_id ON public.team_member_certificates(profile_id);
CREATE INDEX idx_certificates_status ON public.team_member_certificates(status);
CREATE INDEX idx_certificates_expiry ON public.team_member_certificates(expiry_date);
CREATE INDEX idx_training_profile_id ON public.team_member_training(profile_id);
CREATE INDEX idx_training_status ON public.team_member_training(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_certificate_training_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_certificates_timestamp
  BEFORE UPDATE ON public.team_member_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_certificate_training_timestamp();

CREATE TRIGGER update_training_timestamp
  BEFORE UPDATE ON public.team_member_training
  FOR EACH ROW
  EXECUTE FUNCTION public.update_certificate_training_timestamp();