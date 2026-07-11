-- First create the enum type with all statuses
CREATE TYPE job_line_status AS ENUM (
  'pending', 
  'signed-onto-task', 
  'in-progress', 
  'waiting-for-parts', 
  'paused', 
  'awaiting-approval', 
  'quality-check', 
  'completed', 
  'on-hold',
  'ready-for-delivery',
  'needs-road-test',
  'tech-support',
  'warranty',
  'sublet',
  'customer-auth-required',
  'parts-ordered',
  'parts-arrived',
  'rework-required'
);

-- Update the status column to use the enum type
ALTER TABLE work_order_job_lines 
ALTER COLUMN status TYPE job_line_status 
USING status::job_line_status;