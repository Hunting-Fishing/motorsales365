-- Add equipment_id column to work_orders table for equipment maintenance tracking
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.equipment_assets(id) ON DELETE SET NULL;

-- Add priority column to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);

-- Add comment for documentation
COMMENT ON COLUMN public.work_orders.equipment_id IS 'Links work order to specific equipment asset for maintenance tracking';
COMMENT ON COLUMN public.work_orders.priority IS 'Priority level: low, medium, high, urgent';