-- Add mechanic-specific certificate types with correct column names
INSERT INTO public.staff_certificate_types (name, description, requires_renewal, default_validity_months)
VALUES 
  ('WHMIS', 'Workplace Hazardous Materials Information System certification', true, 36),
  ('Forklift Operator', 'Forklift/Powered Industrial Truck operator certification', true, 36),
  ('Red Seal Certification', 'Interprovincial Red Seal trade certification', false, NULL),
  ('EV High-Voltage Safety', 'Electric Vehicle high-voltage systems safety certification', true, 24),
  ('Diesel Technician', 'Diesel engine technician certification', false, NULL),
  ('Propane Handling', 'Propane fuel systems handling certification', true, 36),
  ('Confined Space Entry', 'Confined space entry and rescue certification', true, 36),
  ('Fall Protection', 'Fall protection and working at heights certification', true, 36),
  ('Hoisting & Rigging', 'Hoisting, rigging and crane operation certification', true, 36),
  ('First Aid/CPR', 'First Aid and CPR certification', true, 24),
  ('Fire Extinguisher Training', 'Portable fire extinguisher operation training', true, 12),
  ('Lockout/Tagout (LOTO)', 'Lockout/Tagout safety procedures certification', true, 24)
ON CONFLICT DO NOTHING;