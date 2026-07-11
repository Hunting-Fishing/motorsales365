ALTER TABLE pt_client_medical_conditions
ADD COLUMN IF NOT EXISTS affected_area text,
ADD COLUMN IF NOT EXISTS injury_grade text,
ADD COLUMN IF NOT EXISTS weight_limit_lbs integer,
ADD COLUMN IF NOT EXISTS physician_restrictions text,
ADD COLUMN IF NOT EXISTS physician_restriction_until date;