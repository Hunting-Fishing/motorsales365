-- Create maintenance_request_history table to track all edits
CREATE TABLE maintenance_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of all editable fields at the time of save
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reported_by_person TEXT,
  priority TEXT NOT NULL,
  request_type TEXT NOT NULL,
  attachments JSONB,
  
  -- Metadata
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_by UUID NOT NULL REFERENCES profiles(id),
  edited_by_name TEXT NOT NULL,
  change_summary TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_maintenance_request_history_request_id 
  ON maintenance_request_history(maintenance_request_id);
  
CREATE INDEX idx_maintenance_request_history_edited_at 
  ON maintenance_request_history(edited_at DESC);

-- Enable RLS
ALTER TABLE maintenance_request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view history of requests in their shop"
  ON maintenance_request_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests mr
      INNER JOIN profiles p ON p.shop_id = mr.shop_id
      WHERE mr.id = maintenance_request_history.maintenance_request_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert history when editing their own requests"
  ON maintenance_request_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_requests mr
      WHERE mr.id = maintenance_request_history.maintenance_request_id
      AND mr.requested_by = auth.uid()
    )
  );

COMMENT ON TABLE maintenance_request_history IS 'Version history of maintenance request edits to prevent data loss and enable audit trail';