-- Create maintenance request updates table for activity tracking
CREATE TABLE IF NOT EXISTS public.maintenance_request_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  update_type TEXT NOT NULL, -- 'status_change', 'comment', 'parts_ordered', 'assignment', 'arrival_update'
  update_text TEXT,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Parts tracking fields
  parts_ordered JSONB, -- [{part_number, name, quantity, supplier, order_date, expected_arrival, status, cost}]
  
  -- Assignment tracking
  assigned_to UUID,
  assigned_to_name TEXT,
  
  -- Status tracking
  old_status TEXT,
  new_status TEXT,
  
  -- Attention/notification
  attention_to UUID, -- User ID to notify
  attention_to_name TEXT,
  
  -- Attachments
  attachments JSONB
);

-- Create index for faster queries
CREATE INDEX idx_maintenance_request_updates_request_id ON public.maintenance_request_updates(maintenance_request_id);
CREATE INDEX idx_maintenance_request_updates_created_at ON public.maintenance_request_updates(created_at DESC);

-- Enable RLS
ALTER TABLE public.maintenance_request_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view updates for their shop"
  ON public.maintenance_request_updates
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create updates for their shop"
  ON public.maintenance_request_updates
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own updates"
  ON public.maintenance_request_updates
  FOR UPDATE
  USING (created_by = auth.uid());

-- Add trigger to update maintenance_request updated_at
CREATE OR REPLACE FUNCTION update_maintenance_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.maintenance_requests
  SET updated_at = now()
  WHERE id = NEW.maintenance_request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_maintenance_request_timestamp
  AFTER INSERT ON public.maintenance_request_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_request_timestamp();