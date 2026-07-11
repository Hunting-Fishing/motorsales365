-- Add completion tracking fields to work_order_job_lines table
ALTER TABLE work_order_job_lines 
ADD COLUMN is_work_completed BOOLEAN DEFAULT false,
ADD COLUMN completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_by TEXT;