-- Step 2: Insert marine roles and create certificate tracking tables
-- Add marine-specific roles
INSERT INTO roles (name, description) VALUES
  ('deckhand', 'Deckhand - Entry level marine crew member'),
  ('boson', 'Boson - Supervises deck crew and maintenance'),
  ('mate', 'Mate - Licensed officer assisting captain'),
  ('captain', 'Captain - Licensed vessel commander'),
  ('chief_engineer', 'Chief Engineer - Responsible for vessel machinery'),
  ('marine_engineer', 'Marine Engineer - Maintains vessel systems'),
  ('fishing_master', 'Fishing Master - Commercial fishing operations')
ON CONFLICT (name) DO NOTHING;

-- Create certificate types table for marine certifications
CREATE TABLE IF NOT EXISTS staff_certificate_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  requires_renewal BOOLEAN DEFAULT true,
  default_validity_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert marine certificate types
INSERT INTO staff_certificate_types (name, description, requires_renewal, default_validity_months) VALUES
  ('SVOP', 'Small Vessel Operator Proficiency', true, 60),
  ('60 GT Master', '60 Gross Tonnage Master Certificate', true, 60),
  ('150 GT Master', '150 Gross Tonnage Master Certificate', true, 60),
  ('150 GT Mate', '150 Gross Tonnage Mate Certificate', true, 60),
  ('500 GT Master', '500 Gross Tonnage Master Certificate', true, 60),
  ('3000 GT Master', '3000 Gross Tonnage Master Certificate', true, 60),
  ('Fishing Master 3', 'Fishing Master Level 3 Certificate', true, 60),
  ('Fishing Master 4', 'Fishing Master Level 4 Certificate', true, 60),
  ('Marine Emergency Duties (MED)', 'Marine Emergency Duties Training', true, 60),
  ('STCW Basic Safety', 'Standards of Training, Certification and Watchkeeping', true, 60),
  ('First Aid', 'Marine First Aid Certificate', true, 36),
  ('Radio Operators Certificate', 'Maritime Radio Operators Certificate', true, null),
  ('Watchkeeping Certificate', 'Bridge or Engine Room Watchkeeping', true, 60)
ON CONFLICT (name) DO NOTHING;

-- Create staff certificates table
CREATE TABLE IF NOT EXISTS staff_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_type_id UUID NOT NULL REFERENCES staff_certificate_types(id) ON DELETE RESTRICT,
  certificate_number TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  training_date DATE,
  issuing_authority TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(staff_id, certificate_type_id, issue_date)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_staff_certificates_staff_id ON staff_certificates(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_certificates_expiry ON staff_certificates(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_staff_certificates_type ON staff_certificates(certificate_type_id);

-- Create certificate renewal reminders table
CREATE TABLE IF NOT EXISTS certificate_renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES staff_certificates(id) ON DELETE CASCADE,
  reminder_days_before INTEGER NOT NULL,
  reminder_date DATE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_reminders_date ON certificate_renewal_reminders(reminder_date) WHERE sent = false;

-- Function to automatically update certificate status based on expiry
CREATE OR REPLACE FUNCTION update_certificate_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update status
DROP TRIGGER IF EXISTS trigger_update_certificate_status ON staff_certificates;
CREATE TRIGGER trigger_update_certificate_status
  BEFORE INSERT OR UPDATE ON staff_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_certificate_status();

-- Function to create renewal reminders
CREATE OR REPLACE FUNCTION create_certificate_reminders()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    -- Delete old reminders if expiry date changed
    DELETE FROM certificate_renewal_reminders WHERE certificate_id = NEW.id;
    
    -- Create reminders at 90, 60, and 30 days before expiry
    INSERT INTO certificate_renewal_reminders (certificate_id, reminder_days_before, reminder_date)
    VALUES 
      (NEW.id, 90, NEW.expiry_date - INTERVAL '90 days'),
      (NEW.id, 60, NEW.expiry_date - INTERVAL '60 days'),
      (NEW.id, 30, NEW.expiry_date - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to create reminders
DROP TRIGGER IF EXISTS trigger_create_certificate_reminders ON staff_certificates;
CREATE TRIGGER trigger_create_certificate_reminders
  AFTER INSERT OR UPDATE OF expiry_date ON staff_certificates
  FOR EACH ROW
  EXECUTE FUNCTION create_certificate_reminders();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_staff_certificates_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_staff_certificates_timestamp ON staff_certificates;
CREATE TRIGGER trigger_update_staff_certificates_timestamp
  BEFORE UPDATE ON staff_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_certificates_timestamp();

-- View for expiring certificates (next 90 days)
CREATE OR REPLACE VIEW expiring_certificates AS
SELECT 
  sc.id,
  sc.staff_id,
  p.first_name,
  p.last_name,
  p.email,
  sct.name as certificate_name,
  sc.certificate_number,
  sc.expiry_date,
  sc.status,
  (sc.expiry_date - CURRENT_DATE) as days_until_expiry
FROM staff_certificates sc
JOIN profiles p ON p.id = sc.staff_id
JOIN staff_certificate_types sct ON sct.id = sc.certificate_type_id
WHERE sc.expiry_date IS NOT NULL
  AND sc.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND sc.status = 'active'
ORDER BY sc.expiry_date ASC;

-- Enable RLS
ALTER TABLE staff_certificate_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_renewal_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificate types (readable by all authenticated users)
DROP POLICY IF EXISTS "Certificate types are viewable by authenticated users" ON staff_certificate_types;
CREATE POLICY "Certificate types are viewable by authenticated users"
  ON staff_certificate_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Certificate types manageable by admin/owner" ON staff_certificate_types;
CREATE POLICY "Certificate types manageable by admin/owner"
  ON staff_certificate_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

-- RLS Policies for staff certificates
DROP POLICY IF EXISTS "Staff can view their own certificates" ON staff_certificates;
CREATE POLICY "Staff can view their own certificates"
  ON staff_certificates FOR SELECT
  TO authenticated
  USING (
    staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can insert certificates" ON staff_certificates;
CREATE POLICY "Managers can insert certificates"
  ON staff_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can update certificates" ON staff_certificates;
CREATE POLICY "Managers can update certificates"
  ON staff_certificates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can delete certificates" ON staff_certificates;
CREATE POLICY "Managers can delete certificates"
  ON staff_certificates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );

-- RLS for reminders (same as certificates)
DROP POLICY IF EXISTS "Certificate reminders viewable by staff and managers" ON certificate_renewal_reminders;
CREATE POLICY "Certificate reminders viewable by staff and managers"
  ON certificate_renewal_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_certificates sc
      WHERE sc.id = certificate_id
      AND (
        sc.staff_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
          AND r.name::text IN ('admin', 'owner', 'manager')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Managers can manage reminders" ON certificate_renewal_reminders;
CREATE POLICY "Managers can manage reminders"
  ON certificate_renewal_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name::text IN ('admin', 'owner', 'manager')
    )
  );