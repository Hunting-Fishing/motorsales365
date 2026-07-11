-- Add Power Washing-relevant industries
INSERT INTO business_industries (value, label) VALUES
  ('strata_hoa', 'Strata / HOA'),
  ('apartments', 'Apartments / Multi-Family'),
  ('property_management', 'Property Management'),
  ('golf_course', 'Golf Course'),
  ('sports_recreation', 'Sports & Recreation'),
  ('restaurant', 'Restaurant / Food Service'),
  ('hotel_motel', 'Hotel / Motel'),
  ('shopping_center', 'Shopping Center'),
  ('gas_station', 'Gas Station / Convenience'),
  ('warehouse', 'Warehouse / Industrial'),
  ('office_building', 'Office Building'),
  ('school', 'School / Educational'),
  ('church', 'Church / Religious'),
  ('government', 'Government / Municipal'),
  ('medical', 'Medical / Healthcare'),
  ('car_wash', 'Car Wash / Auto Service'),
  ('parking', 'Parking Lot / Garage')
ON CONFLICT (value) DO NOTHING;