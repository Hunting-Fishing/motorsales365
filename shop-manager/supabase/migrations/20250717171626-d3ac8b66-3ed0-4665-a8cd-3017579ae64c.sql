-- Expand job line status options and add tracking
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'waiting-for-parts';
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'signed-onto-task';
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'awaiting-approval';
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'quality-check';
ALTER TYPE work_order_job_line_status ADD VALUE IF NOT EXISTS 'ready-for-delivery';

-- Check if the enum type exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_order_job_line_status') THEN
        CREATE TYPE work_order_job_line_status AS ENUM (
            'pending', 
            'in-progress', 
            'completed', 
            'on-hold',
            'waiting-for-parts',
            'signed-onto-task',
            'paused',
            'awaiting-approval',
            'quality-check',
            'ready-for-delivery'
        );
    END IF;
END $$;

-- Create job line status history table for audit trail
CREATE TABLE IF NOT EXISTS work_order_job_line_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_line_id UUID NOT NULL REFERENCES work_order_job_lines(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_by_name TEXT,
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on status history table
ALTER TABLE work_order_job_line_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for status history
CREATE POLICY "Users can view job line status history for their shop's work orders" 
ON work_order_job_line_status_history 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 
        FROM work_order_job_lines jl
        JOIN work_orders wo ON wo.id = jl.work_order_id
        JOIN profiles p ON p.id = auth.uid()
        WHERE jl.id = work_order_job_line_status_history.job_line_id
    )
);

CREATE POLICY "Users can insert job line status history for their shop's work orders"
ON work_order_job_line_status_history
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM work_order_job_lines jl
        JOIN work_orders wo ON wo.id = jl.work_order_id
        JOIN profiles p ON p.id = auth.uid()
        WHERE jl.id = work_order_job_line_status_history.job_line_id
    )
);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_job_line_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO work_order_job_line_status_history (
            job_line_id,
            old_status,
            new_status,
            changed_by,
            changed_by_name,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            'System User', -- You can update this based on your user system
            'Status changed via application'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status change logging
DROP TRIGGER IF EXISTS job_line_status_change_trigger ON work_order_job_lines;
CREATE TRIGGER job_line_status_change_trigger
    AFTER UPDATE ON work_order_job_lines
    FOR EACH ROW
    EXECUTE FUNCTION log_job_line_status_change();