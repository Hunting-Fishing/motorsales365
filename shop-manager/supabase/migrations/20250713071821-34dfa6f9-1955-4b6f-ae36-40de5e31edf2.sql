-- Create order status history table
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_status_history
CREATE POLICY "Users can view their order history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_status_history.order_id 
      AND (o.user_id = auth.uid() OR o.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "System can create order history" ON public.order_status_history
  FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- Add missing columns to existing orders table if they don't exist
DO $$
BEGIN
    -- Add stripe_payment_intent_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE public.orders ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
    
    -- Add order_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
        ALTER TABLE public.orders ADD COLUMN order_number TEXT UNIQUE;
    END IF;
    
    -- Add guest_email if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_email') THEN
        ALTER TABLE public.orders ADD COLUMN guest_email TEXT;
    END IF;
    
    -- Add guest_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_name') THEN
        ALTER TABLE public.orders ADD COLUMN guest_name TEXT;
    END IF;
    
    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE public.orders ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    -- Add shipped_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipped_at') THEN
        ALTER TABLE public.orders ADD COLUMN shipped_at TIMESTAMPTZ;
    END IF;
    
    -- Add delivered_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
END $$;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    SELECT TO_CHAR(NOW(), 'YYYYMMDD') INTO new_number;
    
    -- Get count of orders created today
    SELECT COUNT(*) + 1 INTO counter
    FROM public.orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: ORD-YYYYMMDD-XXXX
    new_number := 'ORD-' || new_number || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;

CREATE TRIGGER set_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Function to handle inventory deduction
CREATE OR REPLACE FUNCTION handle_order_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- When order status changes to 'processing', deduct inventory
    IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
        UPDATE inventory_items
        SET quantity = quantity - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
        AND inventory_items.id = oi.product_id
        AND inventory_items.quantity >= oi.quantity;
        
        -- Check if any items couldn't be fulfilled
        IF EXISTS (
            SELECT 1 FROM order_items oi
            JOIN inventory_items ii ON ii.id = oi.product_id
            WHERE oi.order_id = NEW.id
            AND ii.quantity < oi.quantity
        ) THEN
            RAISE EXCEPTION 'Insufficient inventory for order %', NEW.order_number;
        END IF;
    END IF;
    
    -- When order is cancelled, restore inventory
    IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'processing') THEN
        UPDATE inventory_items
        SET quantity = quantity + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
        AND inventory_items.id = oi.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_order_inventory_trigger ON public.orders;

CREATE TRIGGER handle_order_inventory_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_inventory();