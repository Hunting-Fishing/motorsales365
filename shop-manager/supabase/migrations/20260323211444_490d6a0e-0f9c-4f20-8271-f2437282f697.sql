INSERT INTO septic_certification_types (shop_id, name, description, category, requires_renewal, default_validity_months)
SELECT s.id, t.name, t.description, t.category, t.requires_renewal, t.default_validity_months
FROM shops s
CROSS JOIN (VALUES
  ('CDL Class A', 'Commercial Driver''s License - Class A', 'license', true, 48),
  ('CDL Class B', 'Commercial Driver''s License - Class B', 'license', true, 48),
  ('Tanker Endorsement', 'CDL Tanker (N) Endorsement', 'endorsement', true, 48),
  ('HazMat Endorsement', 'CDL Hazardous Materials (H) Endorsement', 'endorsement', true, 60),
  ('Septic Installer License', 'State-licensed septic system installer', 'license', true, 24),
  ('Septic Inspector Certification', 'Certified septic system inspector', 'certification', true, 24),
  ('OSHA 10-Hour', 'OSHA 10-Hour General Industry/Construction', 'training', false, null),
  ('OSHA 30-Hour', 'OSHA 30-Hour General Industry/Construction', 'training', false, null),
  ('First Aid / CPR', 'First Aid and CPR certification', 'certification', true, 24),
  ('Confined Space Entry', 'Permit-required confined space entry training', 'training', true, 12),
  ('DOT Medical Card', 'DOT physical examination medical certificate', 'certification', true, 24),
  ('Water Quality Certification', 'Water quality testing and monitoring certification', 'certification', true, 36)
) AS t(name, description, category, requires_renewal, default_validity_months)
WHERE NOT EXISTS (
  SELECT 1 FROM septic_certification_types sct WHERE sct.shop_id = s.id AND sct.name = t.name
)