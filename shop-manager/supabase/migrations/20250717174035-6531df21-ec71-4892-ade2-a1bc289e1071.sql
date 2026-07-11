-- Add new job line statuses to the existing enum
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'needs-road-test';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'tech-support';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'warranty';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'sublet';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'customer-auth-required';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'parts-ordered';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'parts-arrived';
ALTER TYPE job_line_status ADD VALUE IF NOT EXISTS 'rework-required';