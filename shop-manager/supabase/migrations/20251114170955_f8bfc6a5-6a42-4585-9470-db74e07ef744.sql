-- Add reported_by_name field to maintenance_requests table
-- This tracks who initially reported the problem (e.g., forklift operator reporting to mechanic)
ALTER TABLE maintenance_requests 
ADD COLUMN reported_by_person TEXT;

COMMENT ON COLUMN maintenance_requests.reported_by_person IS 'Name/role of the person who initially reported the problem (e.g., "John - Forklift Operator")';