-- Add enhanced skip tracking columns to fuel_delivery_route_stops
ALTER TABLE fuel_delivery_route_stops
ADD COLUMN IF NOT EXISTS skip_action TEXT,
ADD COLUMN IF NOT EXISTS reschedule_date DATE,
ADD COLUMN IF NOT EXISTS skip_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN fuel_delivery_route_stops.skip_action IS 'Action taken when skipping: retry_later, reschedule, cancel, skip_only';
COMMENT ON COLUMN fuel_delivery_route_stops.reschedule_date IS 'Date to reschedule delivery if skip_action is reschedule';
COMMENT ON COLUMN fuel_delivery_route_stops.skip_notes IS 'Additional notes from driver about why stop was skipped';