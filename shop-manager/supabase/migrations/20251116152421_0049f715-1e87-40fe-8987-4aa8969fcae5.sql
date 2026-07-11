-- Insert additional operational roles
INSERT INTO roles (name, description) VALUES
  ('crane_operator', 'Crane Operator - Operates cranes and lifting equipment'),
  ('rigger', 'Rigger - Prepares and secures loads for lifting'),
  ('diver', 'Diver - Performs underwater operations and inspections'),
  ('dispatch', 'Dispatch - Coordinates scheduling and logistics'),
  ('truck_driver', 'Truck Driver - Operates commercial vehicles'),
  ('office_admin', 'Office Administrator - Manages office operations'),
  ('operations_manager', 'Operations Manager - Oversees daily operations'),
  ('yard', 'Yard Worker - General yard and storage operations'),
  ('yard_manager', 'Yard Manager - Manages yard operations and inventory'),
  ('welder', 'Welder - Performs welding and fabrication work')
ON CONFLICT (name) DO NOTHING;