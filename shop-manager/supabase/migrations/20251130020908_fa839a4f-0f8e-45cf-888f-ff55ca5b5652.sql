-- Insert Red Seal Certification type into staff_certificate_types
INSERT INTO staff_certificate_types (name, description, requires_renewal, default_validity_months)
VALUES 
  ('Red Seal Certification', 'Interprovincial Red Seal trade certification - Journeyperson status', false, NULL)
ON CONFLICT (name) DO NOTHING;