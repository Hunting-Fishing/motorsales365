-- Add new industries to align with all available modules
INSERT INTO business_industries (value, label) VALUES
  ('gunsmith', 'Gunsmith / Firearms'),
  ('electrical', 'Electrical Services'),
  ('hvac', 'HVAC / Climate Control'),
  ('plumbing', 'Plumbing Services'),
  ('powersports', 'Powersports / Recreational Vehicles'),
  ('appliance_repair', 'Appliance Repair'),
  ('lawn_garden', 'Lawn & Garden Equipment'),
  ('fleet_services', 'Fleet Services'),
  ('general_repair', 'General Repair Services')
ON CONFLICT (value) DO NOTHING;