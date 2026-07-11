-- Add is_from_service_selection column to work_order_job_lines table
ALTER TABLE work_order_job_lines 
ADD COLUMN is_from_service_selection BOOLEAN DEFAULT false;